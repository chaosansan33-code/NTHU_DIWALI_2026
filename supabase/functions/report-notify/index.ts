// Supabase Edge Function：有人檢舉留言時，寄 Gmail 通知管理員。
// （留言在檢舉當下已由資料庫自動隱藏，這封信讓管理員決定刪除或恢復。）
//
// 觸發方式：Database Webhook（public.reports 新增一列）→ POST 到這個函式。
// 需要在 Supabase → Edge Functions → Secrets 設定：
//   GMAIL_USER          寄件的 Gmail 地址，例如 diwali.nthu@gmail.com
//   GMAIL_APP_PASSWORD  該 Gmail 的「應用程式密碼」（16 碼，不是登入密碼）
//   ADMIN_EMAIL         收通知的信箱，可用逗號分隔多個；留空則寄給 GMAIL_USER
//   WEBHOOK_SECRET      自己產生的一串亂碼，Database Webhook 的 x-webhook-secret 標頭要填一樣的值
// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 由 Supabase 自動提供，不用設定。
//
// 部署時請關閉「Verify JWT」：這個函式改用 WEBHOOK_SECRET 驗證來源，外人無法用它寄信。

import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const env = (key: string) => Deno.env.get(key) ?? '';

const GMAIL_USER = env('GMAIL_USER');
const ADMIN_EMAIL = env('ADMIN_EMAIL') || GMAIL_USER;
const SUPABASE_URL = env('SUPABASE_URL');

// Supabase 不允許連出 587 埠，所以用 Gmail 的 465（SSL）
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: GMAIL_USER, pass: env('GMAIL_APP_PASSWORD') },
});

// 固定時間比較，避免從回應時間猜出密鑰
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, 60);

function threadLabel(thread: string) {
  if (thread === 'wall') return '首頁「04 點燈留言」';
  if (thread?.startsWith('story:')) return `人物展間（ID：${thread.slice(6)}）`;
  return thread || '未知';
}

type Report = { id: number; message_id: string; reason: string; detail: string; created_at: string };
type Message = { id: string; thread: string; topic: string | null; name: string; message: string; hidden: boolean; keep: boolean; created_at: string };

async function loadContext(report: Report) {
  try {
    const db = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const [{ data: message }, { count }] = await Promise.all([
      db.from('messages').select('id,thread,topic,name,message,hidden,keep,created_at').eq('id', report.message_id).maybeSingle(),
      db.from('reports').select('id', { count: 'exact', head: true }).eq('message_id', report.message_id),
    ]);
    return { message: message as Message | null, count: count ?? 1 };
  } catch (err) {
    console.error('讀取留言失敗', err);
    return { message: null, count: 1 };
  }
}

function buildMail(report: Report, message: Message | null, count: number) {
  const projectRef = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '';
  const lines = [
    message?.keep
      ? '有觀眾檢舉了一則你先前標記為「沒問題（keep）」的留言，所以這次沒有自動隱藏，請再確認一次。'
      : '有觀眾檢舉了一則留言，系統已「自動隱藏」，網站上暫時看不到。請確認後決定刪除或恢復。',
    '',
    `檢舉原因：${report.reason}`,
    `補充說明：${report.detail || '（無）'}`,
    `這則留言累計被檢舉：${count} 次`,
    '',
    '── 被檢舉的留言 ──',
  ];
  if (message) {
    lines.push(
      `位置：${threadLabel(message.thread)}${message.topic ? ` · ${message.topic}` : ''}`,
      `暱稱：${message.name}`,
      `時間：${message.created_at}`,
      `目前狀態：${message.hidden ? '已隱藏' : '公開中'}${message.keep ? '（已標記 keep）' : ''}`,
      '內容：',
      message.message,
    );
  } else {
    lines.push('（無法讀取留言內容，可能已被刪除。）');
  }
  lines.push(
    '',
    '── 處理方式 ──',
    `後台表格：https://supabase.com/dashboard/project/${projectRef}/editor （選 messages 表，找 id = ${report.message_id}）`,
    '',
    '▸ 確實違規 → 刪除該列，或在 SQL Editor 執行：',
    `delete from public.messages where id = '${report.message_id}';`,
    '',
    '▸ 檢舉不成立 → 恢復顯示，並標記 keep（之後再被檢舉只寄信、不會自動隱藏）：',
    `update public.messages set hidden = false, keep = true where id = '${report.message_id}';`,
    '',
    '（這封信由 Light Across Home 留言板自動寄出）',
  );
  return {
    from: `Light Across Home 留言板 <${GMAIL_USER}>`,
    to: ADMIN_EMAIL,
    subject: `【留言檢舉・${message?.keep ? '未隱藏' : '已自動隱藏'}】${report.reason}：${message ? oneLine(message.name) + ' 的留言' : report.message_id}`,
    // 純文字信件：留言內容不會被當成 HTML 執行
    text: lines.join('\n'),
  };
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = env('WEBHOOK_SECRET');
  if (!secret || !safeEqual(req.headers.get('x-webhook-secret') ?? '', secret))
    return new Response('Unauthorized', { status: 401 });

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const report = payload?.record as Report | undefined;
  if (payload?.type !== 'INSERT' || payload?.table !== 'reports' || !report?.message_id)
    return new Response('Ignored', { status: 200 });

  const { message, count } = await loadContext(report);
  try {
    await transporter.sendMail(buildMail(report, message, count));
  } catch (err) {
    console.error('寄信失敗', err);
    return new Response('Mail failed', { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
