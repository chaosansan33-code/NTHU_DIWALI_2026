// 人物展間：故事內容、收藏、複製連結，以及「想對 ○○ 說的話」留言區。

import { $, escapeHTML as e, toast } from '../lib/dom.js';
import { safeURL } from '../lib/content.js';
import { t } from '../i18n/index.js';
import { createBoard, formatDate, HONEYPOT_FIELD } from '../comments/board.js';
import { state, progress, persist } from './state.js';

let currentId = '';

// 目前開著的人物 ID（切換語言時用來重新開啟）
export const openStoryId = () => ($('#story-dialog').open ? currentId : '');

// 「JAIPUR · 齋浦爾」；英文模式城市名本來就是英文時只顯示一次
export function placeLabel(s, separator) {
  return s.cityEn && s.city && s.cityEn.toLowerCase() !== s.city.toLowerCase()
    ? `${s.cityEn}${separator}${s.city}`
    : s.cityEn || s.city;
}

function mediaVideo(url) {
  const u = safeURL(url);
  if (!u) return `<div class="video-placeholder"><p>${t('story.videoPlaceholder')}</p></div>`;
  const parsed = new URL(u);
  let vid = '';
  if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname))
    vid = parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
  if (parsed.hostname === 'youtu.be') vid = parsed.pathname.slice(1);
  if (/^[\w-]{11}$/.test(vid))
    return `<iframe src="https://www.youtube-nocookie.com/embed/${vid}" title="${e(t('story.videoTitle'))}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
  return `<video controls preload="metadata" src="${e(u)}">${e(t('story.videoFallback'))}</video>`;
}

function gallery(photos) {
  if (!photos.length) return '';
  const figures = photos
    .filter(p => safeURL(p.url, { image: true }))
    .map(
      p =>
        `<figure><img src="${e(safeURL(p.url, { image: true }))}" alt="${e(p.caption)}" loading="lazy"><figcaption>${e(p.caption)}</figcaption></figure>`,
    )
    .join('');
  return `<div class="story-gallery">${figures}</div>`;
}

function commentsSection(s) {
  return `<section class="story-comments">
    <h3>${e(t('story.commentsTitle', { name: s.name }))}</h3>
    <div id="story-comment-list"></div>
    <form id="story-comment-form">
      <label>${e(t('comment.nameLabel'))}<input name="name" maxlength="24" required></label>
      <label>${e(t('comment.messageLabel'))}<textarea name="message" maxlength="300" rows="3" required placeholder="${e(t('comment.placeholder'))}"></textarea></label>
      ${HONEYPOT_FIELD}
      <p class="storage-note">${e(t('board.note'))}</p>
      <button class="button gold" type="submit">${e(t('comment.submit'))}</button>
    </form>
  </section>`;
}

const saveLabel = id => t(progress.saved.includes(id) ? 'story.saved' : 'story.save');

export function openStory(id) {
  const { stories } = state.content;
  const s = stories.find(s => s.id === id);
  if (!s) return;
  currentId = id;
  if (!progress.visited.includes(id)) {
    progress.visited.push(id);
    persist();
  }
  const cover = safeURL(s.cover, { image: true });
  const audio = safeURL(s.audio);
  $('#story-content').innerHTML = `
    <div class="story-head">
      <p class="eyebrow">${e(placeLabel(s, ' / '))}</p>
      ${s.demo ? `<span class="badge">${e(t('story.demoBadge'))}</span>` : ''}
      <h2>${e(t('story.heading', { name: s.name }))}</h2>
      <p class="story-meta">${e(s.theme)} · ${e(s.intro)}</p>
      <blockquote>「${e(s.quote)}」</blockquote>
      <div class="story-actions"><button class="button" id="save-story">${e(saveLabel(id))}</button><button class="button" id="copy-story">${e(t('story.copy'))}</button></div>
    </div>
    <div class="story-body">
      ${cover ? `<img class="story-hero-image" src="${e(cover)}" alt="${e(t('story.coverAlt', { name: s.name }))}">` : ''}
      ${mediaVideo(s.video)}
      ${audio ? `<p>${e(t('story.listen'))}</p><audio controls preload="none" src="${e(audio)}"></audio>` : ''}
      <h3>${e(t('story.sectionDiwali'))}</h3><p>${e(s.body)}</p>
      <h3>${e(t('story.sectionMemories'))}</h3>
      <div class="memory-items">${s.memories.map(m => `<details><summary>${e(m.title)}</summary><p>${e(m.text)}</p></details>`).join('')}</div>
      <h3>${e(t('story.sectionTaiwan'))}</h3><p>${e(s.taiwan)}</p>
      ${gallery(s.photos)}
      ${commentsSection(s)}
      <div class="story-actions"><button class="button" id="next-story">${e(t('story.next'))}</button></div>
    </div>`;
  if (!$('#story-dialog').open) $('#story-dialog').showModal();
  $('#story-dialog').scrollTop = 0;
  history.replaceState(null, '', location.pathname + location.search + '#story/' + encodeURIComponent(id));

  $('#save-story').onclick = () => {
    const i = progress.saved.indexOf(id);
    if (i < 0) progress.saved.push(id);
    else progress.saved.splice(i, 1);
    persist();
    $('#save-story').textContent = saveLabel(id);
  };
  $('#copy-story').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast(t('story.copied'));
    } catch {
      toast(t('story.copyFail'));
    }
  };
  $('#next-story').onclick = () => openStory(stories[(stories.indexOf(s) + 1) % stories.length].id);

  createBoard({
    thread: 'story:' + id,
    listEl: $('#story-comment-list'),
    formEl: $('#story-comment-form'),
    emptyHTML: () => `<p class="empty-state">${e(t('story.commentsEmpty', { name: s.name }))}</p>`,
    renderItem: (m, report) =>
      `<article class="story-comment"><small>${e(m.name)}${m.created_at ? ' · ' + e(formatDate(m.created_at)) : ''}</small><p>${e(m.message)}</p>${report}</article>`,
  });
}
