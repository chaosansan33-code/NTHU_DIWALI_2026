// 04 點燈留言牆（首頁）。

import { $, $$, escapeHTML as e } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { createBoard, formatDate } from '../comments/board.js';
import { state } from './state.js';

let wallTopic = 'all';
let board;

function setTopic(topic) {
  wallTopic = topic;
  $$('[data-wall]').forEach(b => b.classList.toggle('active', b.dataset.wall === topic));
}

// 主題在資料庫存中文（祝福／家的記憶／提問），畫面上依語言顯示
const topicLabel = topic => (topic ? t('topic.' + topic) : '');

export function initWall() {
  board = createBoard({
    thread: 'wall',
    listEl: $('#messages'),
    formEl: $('#message-form'),
    samples: () => state.content.messages,
    filter: m => wallTopic === 'all' || m.topic === wallTopic,
    emptyHTML: () => `<p class="empty-state">${e(t('wall.empty'))}</p>`,
    renderItem: (m, report) =>
      `<article class="message"><span class="spark" aria-hidden="true">✦</span><small> ${e(topicLabel(m.topic))}</small><p>${e(m.message)}</p><small>${e(m.name)}${m.sample ? ' · ' + e(t('board.sample')) : m.created_at ? ' · ' + e(formatDate(m.created_at)) : ''}</small>${report}</article>`,
    onSubmitted: () => setTopic('all'),
  });
  $$('[data-wall]').forEach(
    b =>
      (b.onclick = () => {
        setTopic(b.dataset.wall);
        board.draw();
      }),
  );
}

// 切換語言時重畫（不重新向資料庫讀取）
export const redrawWall = () => board?.draw();
