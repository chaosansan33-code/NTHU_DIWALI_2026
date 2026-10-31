-- =====================================================================
-- Light Across Home 留言板：Supabase 資料庫設定
--
-- 用法：Supabase 後台 → SQL Editor → New query → 貼上整份 → Run。
-- 可以重複執行：會更新函式與權限，不會刪掉已經存在的留言。
--
-- 安全設計重點：
--   * 網頁只拿得到公開的 publishable key，所以「誰能做什麼」全部由這裡決定。
--   * 訪客只能：讀取未隱藏的留言（只看得到安全欄位）、
--     透過 submit_message() 留言、透過 report_message() 檢舉。
--   * 訪客不能直接新增、修改、刪除任何資料，也讀不到檢舉紀錄。
--   * 不儲存訪客 IP，只存「加鹽雜湊」用來限制留言頻率。
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 不公開的 schema：Data API 不會暴露，網頁無法存取
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  id boolean primary key default true check (id), -- 只允許一列
  hash_salt text not null default encode(extensions.gen_random_bytes(32), 'hex')
);
insert into private.settings default values on conflict do nothing;

-- 訪客來源的雜湊（同一來源會得到同一個值，但無法反推出 IP）
create or replace function private.client_hash()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  source text := coalesce(
    nullif(headers ->> 'cf-connecting-ip', ''),
    nullif(headers ->> 'x-forwarded-for', ''),
    'unknown'
  );
  salt text;
begin
  select hash_salt into salt from private.settings;
  return encode(extensions.digest(salt || source, 'sha256'), 'hex');
end;
$$;

-- 清理文字：去掉控制字元與看不見的方向控制字元，修剪頭尾空白
create or replace function private.clean_text(value text, keep_newlines boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    case
      when keep_newlines then regexp_replace(
        regexp_replace(
          replace(coalesce(value, ''), E'\r\n', E'\n'),
          E'[\\x01-\\x09\\x0b-\\x1f\\x7f\\u200b\\u200c\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]', '', 'g'
        ),
        E'\n{3,}', E'\n\n', 'g'
      )
      else regexp_replace(
        coalesce(value, ''),
        E'[\\x01-\\x1f\\x7f\\u200b\\u200c\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]', '', 'g'
      )
    end,
    E' \n　'
  )
$$;

revoke all on function private.client_hash() from public, anon, authenticated;
revoke all on function private.clean_text(text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 留言
-- thread：'wall' = 首頁留言牆；'story:<人物 ID>' = 該人物展間
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread text not null check (thread ~ '^(wall|story:[a-z0-9-]{1,70})$'),
  topic text check (topic in ('祝福', '家的記憶', '提問')),
  name text not null check (char_length(name) between 1 and 24),
  message text not null check (char_length(message) between 1 and 300),
  hidden boolean not null default false, -- true = 不顯示（被檢舉時自動設為 true）
  keep boolean not null default false,   -- 管理員確認沒問題後設 true：之後的檢舉只寄信、不再自動隱藏
  author_hash text not null,             -- 只用來限流，不對外公開
  created_at timestamptz not null default now()
);
-- 舊版資料表升級用（第一次執行時這行什麼都不做）
alter table public.messages add column if not exists keep boolean not null default false;

create index if not exists messages_thread_idx on public.messages (thread, created_at desc) where not hidden;
create index if not exists messages_author_idx on public.messages (author_hash, created_at);
create index if not exists messages_created_idx on public.messages (created_at);

alter table public.messages enable row level security;
revoke all on public.messages from public, anon, authenticated;
-- 只開放「讀取」安全欄位；hidden、author_hash 對訪客不可見
grant select (id, thread, topic, name, message, created_at) on public.messages to anon, authenticated;

drop policy if exists "visitors read visible messages" on public.messages;
create policy "visitors read visible messages"
  on public.messages for select
  to anon, authenticated
  using (not hidden);

-- ---------------------------------------------------------------------
-- 檢舉（訪客完全無法讀寫；新增一列時由 Database Webhook 觸發 Gmail 通知）
-- 被檢舉的留言會「立即隱藏」，管理員收到信後再決定刪除或恢復。
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.messages (id) on delete cascade,
  reason text not null check (reason in ('不當內容', '騷擾或攻擊', '垃圾訊息', '其他')),
  detail text not null default '' check (char_length(detail) <= 200),
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_hash)
);
create index if not exists reports_reporter_idx on public.reports (reporter_hash, created_at);
create index if not exists reports_created_idx on public.reports (created_at);

alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
-- 沒有任何 policy = 訪客什麼都做不了

-- ---------------------------------------------------------------------
-- 送出留言（網頁唯一能寫入留言的方式）
-- 限制（可直接改下面 declare 區的數字後重新執行本檔）：
--   同一來源 10 分鐘最多 10 則（校園 Wi-Fi 常是很多人共用同一個對外 IP，所以不設太低）
--   全站 1 小時最多 300 則
-- ---------------------------------------------------------------------
create or replace function public.submit_message(
  p_thread text,
  p_topic text,
  p_name text,
  p_message text,
  p_website text default ''
)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hash text := private.client_hash();
  v_name text := private.clean_text(p_name, false);
  v_message text := private.clean_text(p_message, true);
  v_topic text := nullif(btrim(coalesce(p_topic, '')), '');
  v_row public.messages;
  per_source_limit constant int := 10;  -- 同一來源每 10 分鐘
  site_hourly_limit constant int := 300; -- 全站每小時
begin
  -- 隱藏欄位有值 = 機器人。假裝成功，但什麼都不寫。
  if coalesce(p_website, '') <> '' then
    return json_build_object('ok', true);
  end if;

  if p_thread is null or p_thread !~ '^(wall|story:[a-z0-9-]{1,70})$' then
    raise exception 'invalid_thread' using errcode = 'PT400';
  end if;
  if p_thread = 'wall' then
    if v_topic is null or v_topic not in ('祝福', '家的記憶', '提問') then
      raise exception 'invalid_topic' using errcode = 'PT400';
    end if;
  else
    v_topic := null; -- 人物展間的留言沒有主題
  end if;
  if char_length(v_name) not between 1 and 24 then
    raise exception 'invalid_name' using errcode = 'PT400';
  end if;
  if char_length(v_message) not between 1 and 300 then
    raise exception 'invalid_message' using errcode = 'PT400';
  end if;

  -- 依序處理，避免同時大量送出時繞過計數
  perform pg_advisory_xact_lock(hashtext('public.submit_message'));
  if (select count(*) from public.messages
      where author_hash = v_hash and created_at > now() - interval '10 minutes') >= per_source_limit then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if (select count(*) from public.messages where created_at > now() - interval '1 hour') >= site_hourly_limit then
    raise exception 'busy' using errcode = 'PT429';
  end if;

  insert into public.messages (thread, topic, name, message, author_hash)
  values (p_thread, v_topic, v_name, v_message, v_hash)
  returning * into v_row;

  return json_build_object(
    'id', v_row.id,
    'thread', v_row.thread,
    'topic', v_row.topic,
    'name', v_row.name,
    'message', v_row.message,
    'created_at', v_row.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 檢舉留言：記錄檢舉，並立即隱藏該留言（除非管理員已標記 keep）
-- 限制：同一來源對同一則只算一次；同一來源 10 分鐘最多 5 次；全站 1 小時最多 30 次
-- （也就是管理員信箱 1 小時最多收到 30 封通知）
-- ---------------------------------------------------------------------
create or replace function public.report_message(
  p_message_id uuid,
  p_reason text,
  p_detail text default ''
)
returns json
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hash text := private.client_hash();
  v_detail text := private.clean_text(p_detail, true);
  per_source_limit constant int := 5;   -- 同一來源每 10 分鐘
  site_hourly_limit constant int := 30; -- 全站每小時（= 管理員每小時最多收到幾封通知信）
begin
  if p_reason is null or p_reason not in ('不當內容', '騷擾或攻擊', '垃圾訊息', '其他') then
    raise exception 'invalid_reason' using errcode = 'PT400';
  end if;
  if char_length(v_detail) > 200 then
    raise exception 'invalid_detail' using errcode = 'PT400';
  end if;
  if not exists (select 1 from public.messages where id = p_message_id and not hidden) then
    raise exception 'not_found' using errcode = 'PT404';
  end if;

  perform pg_advisory_xact_lock(hashtext('public.report_message'));
  if exists (select 1 from public.reports where message_id = p_message_id and reporter_hash = v_hash) then
    return json_build_object('ok', true, 'duplicate', true);
  end if;
  if (select count(*) from public.reports
      where reporter_hash = v_hash and created_at > now() - interval '10 minutes') >= per_source_limit then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if (select count(*) from public.reports where created_at > now() - interval '1 hour') >= site_hourly_limit then
    raise exception 'busy' using errcode = 'PT429';
  end if;

  insert into public.reports (message_id, reason, detail, reporter_hash)
  values (p_message_id, p_reason, v_detail, v_hash);

  -- 先下架再說：管理員收到信後決定刪除，或改回 hidden = false 並勾 keep
  update public.messages set hidden = true where id = p_message_id and not keep;

  return json_build_object('ok', true, 'hidden', found);
end;
$$;

-- 只有這兩個函式開放給網頁呼叫
revoke all on function public.submit_message(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.report_message(uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_message(text, text, text, text, text) to anon, authenticated;
grant execute on function public.report_message(uuid, text, text) to anon, authenticated;
