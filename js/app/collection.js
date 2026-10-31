// 右上角「收藏」：列出訪客在這個瀏覽器收藏的故事。

import { $, $$, escapeHTML as e } from '../lib/dom.js';
import { t } from '../i18n/index.js';
import { state, progress } from './state.js';
import { openActivity } from './dialogs.js';
import { openStory } from './stories.js';

export function showCollection() {
  const { stories } = state.content;
  const list = stories.filter(s => progress.saved.includes(s.id));
  const visited = progress.visited.filter(id => stories.some(s => s.id === id)).length;
  openActivity(
    `<p class="eyebrow">YOUR EXHIBITION JOURNEY</p><h2>${e(t('collection.title'))}</h2><p>${e(t('collection.summary', { visited, games: progress.games.length }))}</p>${
      list.length
        ? list
            .map(
              s =>
                `<button class="story-card" data-saved="${e(s.id)}"><span class="portrait-letter">${e(s.name.slice(0, 1))}</span><span><strong>${e(s.name)}</strong><small>${e(s.city)} · ${e(s.theme)}</small><p>${e(s.quote)}</p></span><span>＋</span></button>`,
            )
            .join('')
        : `<p class="empty-state">${e(t('collection.empty'))}</p>`
    }`,
  );
  $$('[data-saved]').forEach(
    b =>
      (b.onclick = () => {
        $('#activity-dialog').close();
        openStory(b.dataset.saved);
      }),
  );
}
