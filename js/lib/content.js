// 讀取、檢查展覽內容（data/content.json）與錯誤提示。

import { $ } from './dom.js';
import { store } from './storage.js';

export const CONTENT_PATH = 'data/content.json';
export const MAP_PATH = 'data/map.json';

// 只允許 http(s) 網址或相對路徑；圖片另外允許編輯頁產生的 base64 圖片。
export function safeURL(value, { image = false } = {}) {
  if (!value) return '';
  if (image && /^data:image\/(png|jpeg|webp);base64,/i.test(value)) return value;
  try {
    const u = new URL(value, location.href);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

export function validateContent(d) {
  if (
    !d ||
    d.version !== 1 ||
    !d.site ||
    !Array.isArray(d.stories) ||
    !Array.isArray(d.culture) ||
    !Array.isArray(d.quiz) ||
    (d.messages !== undefined && !Array.isArray(d.messages))
  )
    throw Error('資料格式不正確，請匯入此網站匯出的 content.json。');
  if (d.stories.length > 100 || !d.stories.length) throw Error('人物數量必須為 1–100 位。');
  const ids = new Set();
  for (const s of d.stories) {
    if (!/^[a-z0-9-]{1,70}$/.test(s.id) || ids.has(s.id))
      throw Error('人物 ID 必須唯一，且只使用英文小寫、數字與連字號。');
    ids.add(s.id);
    if (
      !s.name ||
      !Array.isArray(s.coordinates) ||
      s.coordinates.length !== 2 ||
      !s.coordinates.every(Number.isFinite) ||
      s.coordinates[0] < -180 ||
      s.coordinates[0] > 180 ||
      s.coordinates[1] < -90 ||
      s.coordinates[1] > 90
    )
      throw Error('請檢查人物名稱與經緯度。');
    if (!Array.isArray(s.memories) || !Array.isArray(s.photos)) throw Error('人物素材格式不完整。');
  }
  // 選填的英文版：任何物件可有 en 子物件（見 docs/TRANSLATION.md）
  const objects = [
    d.site,
    ...d.stories,
    ...d.stories.flatMap(s => [...s.memories, ...s.photos]),
    ...d.culture,
    ...d.quiz,
    ...d.messages ?? [],
  ];
  for (const o of objects) {
    if (o?.en !== undefined && (typeof o.en !== 'object' || o.en === null || Array.isArray(o.en)))
      throw Error('「en」必須是物件，例如 "en": { "name": "Aarav" }。');
  }
  for (const q of d.quiz) {
    if (q.en?.options !== undefined && (!Array.isArray(q.en.options) || q.en.options.length !== q.options.length))
      throw Error('問答題英文選項（en.options）的數量必須和中文選項相同。');
    if (
      !Array.isArray(q.options) ||
      q.options.length < 2 ||
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer >= q.options.length
    )
      throw Error('問答題的選項或正確答案有誤。');
  }
  d.messages ??= [];
  return d;
}

// path 以網站根目錄（index.html 所在位置）為基準；任何子目錄的頁面呼叫都一樣。
const SITE_ROOT = new URL('../../', import.meta.url);
export async function loadJSON(path) {
  const url = new URL(path, SITE_ROOT);
  let response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw Error(`無法連線讀取 ${path}。請檢查網路後重試。`);
  }
  if (!response.ok)
    throw Error(
      response.status === 404
        ? `找不到 ${path}（404）。請確認 GitHub 已上傳這個檔案，且資料夾名稱與大小寫完全相同。`
        : `讀取 ${path} 失敗（HTTP ${response.status}）。`,
    );
  const text = (await response.text()).replace(/^﻿/, '');
  try {
    return JSON.parse(text);
  } catch {
    throw Error(
      /^\s*</.test(text)
        ? `${path} 回傳的是網頁，不是 JSON 資料。請確認上傳的是原始檔案，而不是 GitHub 預覽頁。`
        : `${path} 不是有效的 JSON。請使用策展編輯頁匯出的內容檔，並保留完整格式。`,
    );
  }
}

// ?preview=1 時優先使用編輯頁存在這個瀏覽器的草稿。
export async function loadContent() {
  const preview = new URLSearchParams(location.search).get('preview') === '1';
  const draft = preview ? store.read('draft', null) : null;
  if (draft) return validateContent(draft);
  return validateContent(await loadJSON(CONTENT_PATH));
}

export function showLoadError(error, heading = '展覽內容載入未完成') {
  let panel = $('#load-error');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'load-error';
    panel.setAttribute('role', 'alert');
    panel.style.cssText =
      'margin:20px 5%;padding:22px;border:1px solid #eac18c;background:#1c2030;color:#eee9df;overflow-wrap:anywhere';
    ($('main') || document.body).prepend(panel);
  }
  panel.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = heading;
  title.style.fontSize = '22px';
  const message = document.createElement('p');
  message.textContent = error.message || String(error);
  const note = document.createElement('p');
  note.textContent = '請把這段訊息與網站網址提供給維護者，即可定位問題。';
  note.style.fontSize = '14px';
  const retry = document.createElement('button');
  retry.textContent = '重新載入';
  retry.onclick = () => location.reload();
  panel.append(title, message, note, retry);
  console.error(error);
}
