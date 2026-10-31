// 全站共用的狀態：展覽內容與訪客自己的觀展進度（存在瀏覽器）。

import { $ } from '../lib/dom.js';
import { store } from '../lib/storage.js';

// raw：data/content.json 原始資料；content：目前語言版本（切換語言時重新產生）
export const state = { raw: null, content: null };

const savedProgress = store.read('progress', {});
export const progress = Object.fromEntries(
  ['visited', 'saved', 'games'].map(key => [
    key,
    Array.isArray(savedProgress?.[key]) ? savedProgress[key].filter(id => typeof id === 'string') : [],
  ]),
);

export function persist() {
  store.write('progress', progress);
  $('#collection-count').textContent = progress.saved.length;
}

// 記錄某個互動遊戲已完成
export function complete(id) {
  if (!progress.games.includes(id)) {
    progress.games.push(id);
    persist();
  }
}
