// 中／英切換。
// - 介面文字：js/i18n/strings.js 的字典，用 t('key') 取用；HTML 用 data-i18n 屬性標記。
// - 展覽內容：data/content.json 中任何物件都可以有一個 en 子物件（key 相同、值為英文），
//   英文模式時覆蓋中文；沒填的欄位自動退回中文。

import { $$ } from '../lib/dom.js';
import { store } from '../lib/storage.js';
import { STRINGS } from './strings.js';

export const LANGS = ['zh', 'en'];

function initialLang() {
  const fromURL = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(fromURL)) return fromURL;
  const saved = store.read('lang', null);
  return LANGS.includes(saved) ? saved : 'zh';
}

let lang = initialLang();
const listeners = new Set();

export const getLang = () => lang;

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  store.write('lang', lang);
  // 網址上有 ?lang= 時一起更新，避免重新整理後又變回去
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
  }
  syncDocumentLang();
  listeners.forEach(fn => fn(lang));
}

export function syncDocumentLang() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
}

// '{count} 個故事' + {count: 3} → '3 個故事'
export function format(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in params ? params[key] : match));
}

// 取介面字串；dict 預設為全站字典，小遊戲會傳入自己的 strings
export function t(key, params, dict = STRINGS) {
  const value = dict[lang]?.[key] ?? dict.zh?.[key] ?? key;
  return format(value, params);
}

// 回傳「目前語言版本」的物件：英文模式時用 obj.en 的非空值覆蓋
export function localize(obj) {
  if (!obj || lang === 'zh' || !obj.en || typeof obj.en !== 'object') return obj;
  const out = { ...obj };
  for (const [key, value] of Object.entries(obj.en)) {
    if (value === '' || value == null) continue;
    if (Array.isArray(obj[key]) && (!Array.isArray(value) || value.length !== obj[key].length)) continue;
    out[key] = value;
  }
  return out;
}

// 整份 content.json → 目前語言版本（巢狀的記憶抽屜、照片也一起轉換）
export function localizeContent(raw) {
  return {
    ...raw,
    site: localize(raw.site),
    stories: raw.stories.map(s => ({
      ...localize(s),
      memories: s.memories.map(localize),
      photos: s.photos.map(localize),
    })),
    culture: raw.culture.map(localize),
    quiz: raw.quiz.map(localize),
    messages: (raw.messages || []).map(localize),
  };
}

// 套用 HTML 上的 data-i18n 標記：
//   data-i18n="key"            → textContent
//   data-i18n-html="key"       → innerHTML（只能用字典裡我們自己寫的字串）
//   data-i18n-attr="placeholder:key; aria-label:key2"
export function applyStaticText(root = document) {
  $$('[data-i18n]', root).forEach(el => (el.textContent = t(el.dataset.i18n)));
  $$('[data-i18n-html]', root).forEach(el => (el.innerHTML = t(el.dataset.i18nHtml)));
  $$('[data-i18n-attr]', root).forEach(el => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map(x => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

syncDocumentLang();
