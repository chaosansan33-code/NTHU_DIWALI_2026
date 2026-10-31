// 留言板 UI：首頁「點燈留言」與人物展間「想對 ○○ 說的話」共用。
// 負責載入留言、送出表單、檢舉。外觀由呼叫端的 renderItem 決定。
// 檢舉成功後資料庫會立即隱藏該留言，這裡也同步把它從畫面移除；
// 管理員已確認（keep）的留言不會被隱藏，改為提示訪客。

import { $, escapeHTML as e, toast } from '../lib/dom.js';
import { store } from '../lib/storage.js';
import { t, getLang } from '../i18n/index.js';
import { commentsEnabled, listMessages, submitMessage, reportMessage, errorText } from './api.js';

// 值必須與 supabase/schema.sql 的白名單相同（顯示文字另外翻譯）
const REPORT_REASONS = ['不當內容', '騷擾或攻擊', '垃圾訊息', '其他'];

export function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(getLang() === 'en' ? 'en-GB' : 'zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function reportControl(m) {
  if (m.sample) return '';
  return `<button type="button" class="report-button" data-report="${e(m.id)}" aria-label="${e(t('board.reportAria'))}">${e(t('board.report'))}</button>`;
}

function reportFormHTML(id) {
  return `<form class="report-form" data-report-form="${e(id)}">
    <label>${e(t('board.reportReason'))}<select name="reason">${REPORT_REASONS.map(r => `<option value="${r}">${e(t('reason.' + r))}</option>`).join('')}</select></label>
    <label>${e(t('board.reportDetail'))}<input name="detail" maxlength="200" autocomplete="off"></label>
    <p class="storage-note">${e(t('board.reportHint'))}</p>
    <div class="report-actions"><button type="submit" class="gold">${e(t('board.reportSubmit'))}</button><button type="button" data-report-cancel>${e(t('board.reportCancel'))}</button></div>
  </form>`;
}

/**
 * @param {object} options
 * @param {string} options.thread       'wall' 或 'story:<人物 ID>'
 * @param {Element} options.listEl      放留言清單的容器
 * @param {HTMLFormElement} options.formEl 留言表單
 * @param {(m: object, report: string) => string} options.renderItem 單則留言 HTML（已含檢舉按鈕字串）
 * @param {() => string} options.emptyHTML 沒有留言時顯示的 HTML
 * @param {() => object[]} [options.samples] 留言板未連線時顯示的示例留言
 * @param {(m: object) => boolean} [options.filter] 例如依主題篩選
 * @param {() => void} [options.onSubmitted]
 */
export function createBoard({ thread, listEl, formEl, renderItem, emptyHTML, samples = () => [], filter = () => true, onSubmitted }) {
  let items = [];
  let status = commentsEnabled ? 'loading' : 'offline';

  function draw() {
    if (status === 'loading') {
      listEl.innerHTML = `<p class="empty-state">${e(t('board.loading'))}</p>`;
      return;
    }
    if (status === 'error') {
      listEl.innerHTML = `<p class="empty-state">${e(t('board.loadError'))} <button type="button" class="text-button" data-retry>${e(t('board.retry'))}</button></p>`;
      return;
    }
    const list = (status === 'offline' ? samples().map(m => ({ ...m, sample: true })) : items).filter(filter);
    listEl.innerHTML = list.length ? list.map(m => renderItem(m, reportControl(m))).join('') : emptyHTML();
  }

  async function refresh() {
    if (!commentsEnabled) return draw();
    status = 'loading';
    draw();
    try {
      items = await listMessages(thread);
      status = 'ready';
    } catch {
      status = 'error';
    }
    draw();
  }

  function removeItem(id) {
    items = items.filter(m => m.id !== id);
    draw();
  }

  listEl.addEventListener('click', ev => {
    const target = ev.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-retry')) refresh();
    if (target.dataset.report) {
      const article = target.closest('article');
      if (!article || $('.report-form', article)) return;
      article.insertAdjacentHTML('beforeend', reportFormHTML(target.dataset.report));
      $('.report-form select', article).focus();
    }
    if (target.hasAttribute('data-report-cancel')) target.closest('form').remove();
  });

  listEl.addEventListener('submit', async ev => {
    const form = ev.target.closest('[data-report-form]');
    if (!form) return;
    ev.preventDefault();
    const id = form.dataset.reportForm;
    const data = new FormData(form);
    const button = $('button[type=submit]', form);
    button.disabled = true;
    try {
      const result = await reportMessage({ id, reason: data.get('reason'), detail: String(data.get('detail') || '').trim() });
      if (result?.hidden === true) {
        removeItem(id);
        toast(t('board.reportDone'));
      } else {
        // 管理員已確認過（keep）的留言不會被隱藏，只通知管理員
        form.remove();
        toast(t('board.reportKept'));
      }
    } catch (err) {
      if (err?.code === 'not_found') removeItem(id);
      button.disabled = false;
      toast(errorText(err));
    }
  });

  // 未連線：停用表單並顯示說明（用 data-i18n 讓切換語言時也會更新）
  const note = $('.storage-note', formEl);
  if (!commentsEnabled) {
    for (const el of formEl.elements) el.disabled = true;
    if (note) {
      note.dataset.i18n = 'board.offline';
      note.textContent = t('board.offline');
    }
  }

  formEl.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!commentsEnabled) return;
    const data = new FormData(formEl);
    const name = String(data.get('name') || '').trim();
    const message = String(data.get('message') || '').trim();
    if (!name || !message) return;
    const button = $('button[type=submit]', formEl);
    button.disabled = true;
    try {
      const row = await submitMessage({
        thread,
        topic: data.get('topic') || null,
        name,
        message,
        website: String(data.get('website') || ''),
      });
      formEl.reset();
      if (row?.id) {
        items.unshift(row);
        status = 'ready';
      }
      onSubmitted?.();
      draw();
      toast(t('board.sent'));
    } catch (err) {
      toast(errorText(err));
    } finally {
      button.disabled = false;
    }
  });

  refresh();
  return { draw, refresh };
}

// 表單內的隱藏欄位：真人看不到也不會填，填了就是機器人。
export const HONEYPOT_FIELD =
  '<label class="hp-field" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label>';
