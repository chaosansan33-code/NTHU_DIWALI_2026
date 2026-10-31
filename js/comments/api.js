// 與 Supabase 溝通的唯一出口。直接使用 REST API（PostgREST），不需額外套件。
// 前端只能：讀取公開留言、呼叫 submit_message、呼叫 report_message。
// 其他權限都被資料庫擋下，見 supabase/schema.sql。

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config.js';
import { t } from '../i18n/index.js';

export const commentsEnabled = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

const baseURL = SUPABASE_URL.replace(/\/+$/, '');

export class CommentError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(baseURL + path, {
      method,
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new CommentError('network');
  }
  if (!response.ok) {
    let detail = {};
    try {
      detail = await response.json();
    } catch {}
    throw new CommentError(detail.message || 'http_' + response.status, response.status);
  }
  return response.status === 204 ? null : response.json();
}

export function listMessages(thread) {
  const query = new URLSearchParams({
    select: 'id,topic,name,message,created_at',
    thread: 'eq.' + thread,
    order: 'created_at.desc',
    limit: '100',
  });
  return request('/rest/v1/messages?' + query);
}

export function submitMessage({ thread, topic = null, name, message, website = '' }) {
  return request('/rest/v1/rpc/submit_message', {
    method: 'POST',
    body: { p_thread: thread, p_topic: topic, p_name: name, p_message: message, p_website: website },
  });
}

export function reportMessage({ id, reason, detail = '' }) {
  return request('/rest/v1/rpc/report_message', {
    method: 'POST',
    body: { p_message_id: id, p_reason: reason, p_detail: detail },
  });
}

// 資料庫函式丟出的錯誤代碼 → 給訪客看的訊息（文字在 js/i18n/strings.js 的 error.*）
const KNOWN_ERRORS = ['network', 'rate_limited', 'busy', 'invalid_name', 'invalid_message', 'invalid_topic', 'invalid_thread', 'invalid_reason', 'invalid_detail', 'not_found'];

export function errorText(error) {
  return t('error.' + (KNOWN_ERRORS.includes(error?.code) ? error.code : 'unknown'));
}
