// 人物故事視窗（#story-dialog）與互動視窗（#activity-dialog）的開關邏輯。

import { $, $$ } from '../lib/dom.js';

let activityCleanup = () => {};

// 遊戲可登記「視窗關閉時要清掉的計時器、音效」
export function setActivityCleanup(fn) {
  activityCleanup = fn;
}

function clearStoryHash() {
  if (location.hash.startsWith('#story/'))
    history.replaceState(null, '', location.pathname + location.search + '#map');
}

function closeDialog(d) {
  d.close();
  if (d.id === 'story-dialog') clearStoryHash();
}

export function initDialogs() {
  for (const d of $$('dialog')) {
    $('.dialog-close', d).onclick = () => closeDialog(d);
    // 點視窗外的暗色背景也能關閉
    d.addEventListener('click', ev => {
      if (ev.target !== d) return;
      const r = d.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom)
        closeDialog(d);
    });
    d.addEventListener('close', () => {
      $$('video,audio', d).forEach(v => v.pause());
      $$('iframe', d).forEach(f => f.remove());
      if (d.id === 'activity-dialog') activityCleanup();
      if (d.id === 'story-dialog') clearStoryHash();
    });
  }
}

export function openActivity(html) {
  activityCleanup();
  activityCleanup = () => {};
  $('#activity-content').innerHTML = '<div class="activity-inner">' + html + '</div>';
  if (!$('#activity-dialog').open) $('#activity-dialog').showModal();
  return $('#activity-content .activity-inner');
}
