// 策展內容編輯頁：在瀏覽器編輯 data/content.json，匯出後再上傳到 GitHub。
// 「編輯英文」模式只改各物件的 en 欄位（翻譯），共用欄位（ID、座標、圖片）要在中文模式改。
// 留言不在這裡管理：留言存在 Supabase，處理方式見 docs/MODERATION.md。

import { $, $$, escapeHTML as e, download } from '../lib/dom.js';
import { store } from '../lib/storage.js';
import { validateContent, loadJSON, CONTENT_PATH } from '../lib/content.js';

let data;
let section = 'site';
let storyIndex = 0;
let dirty = false;
let editLang = store.read('editor-lang', 'zh') === 'en' ? 'en' : 'zh';

const status = text => ($('#editor-status').textContent = text);
const divider = '<hr style="border-color:var(--line);margin:30px 0">';
const isEn = () => editLang === 'en';

function input(attr, key, value, type = 'text') {
  return type === 'textarea'
    ? `<textarea ${attr}="${key}">${e(value)}</textarea>`
    : `<input ${attr}="${key}" type="${type}" value="${e(value)}" ${type === 'number' ? 'step="any"' : ''}>`;
}

// 中英共用欄位（ID、座標、圖片、影片網址）——英文模式不顯示
function field(label, key, value, type = 'text') {
  return `<label>${label}${input('data-field', key, value, type)}</label>`;
}

// 可翻譯的文字欄位：中文模式編輯 obj[key]，英文模式編輯 obj.en[key] 並顯示中文對照
function textField(label, obj, key, type = 'text') {
  if (!isEn()) return field(label, key, obj[key], type);
  return `<label>${label}<span class="editor-ref">${e(obj[key] || '（中文空白）')}</span>${input('data-field-en', key, obj.en?.[key] ?? '', type)}</label>`;
}

function mediaField(label, key, value) {
  if (isEn()) return '';
  return (
    field(label + '（網址或相對路徑，例如 assets/photo.jpg）', key, value) +
    `<label class="media-upload">或選擇圖片，自動縮小並嵌入內容檔<input type="file" data-upload="${key}" accept="image/png,image/jpeg,image/webp"></label>`
  );
}

// 寫入翻譯；空白就刪掉，讓網站自動退回中文
function setEn(obj, key, value) {
  obj.en ??= {};
  if (Array.isArray(value) ? value.every(v => v.trim()) : value.trim()) obj.en[key] = value;
  else delete obj.en[key];
  if (!Object.keys(obj.en).length) delete obj.en;
}

function mark() {
  dirty = true;
  status('有尚未匯出的修改。');
}

// 把目前畫面上的欄位值寫回 data
function collect() {
  if (section === 'site' || section === 'story') {
    const o = section === 'site' ? data.site : data.stories[storyIndex];
    for (const el of $$('[data-field]')) {
      const key = el.dataset.field;
      if (key === 'lon' || key === 'lat') o.coordinates[key === 'lon' ? 0 : 1] = Number(el.value);
      else o[key] = el.type === 'checkbox' ? el.checked : el.value;
    }
    for (const el of $$('[data-field-en]')) setEn(o, el.dataset.fieldEn, el.value);
    if (section === 'story') {
      const memoryRows = $$('[data-memory]');
      const photoRows = $$('[data-photo]');
      if (isEn()) {
        memoryRows.forEach((row, i) => {
          setEn(o.memories[i], 'title', $('[data-memory-title]', row).value);
          setEn(o.memories[i], 'text', $('[data-memory-text]', row).value);
        });
        photoRows.forEach((row, i) => setEn(o.photos[i], 'caption', $('[data-photo-caption]', row).value));
      } else {
        o.memories = memoryRows.map((row, i) => ({
          ...o.memories[i],
          title: $('[data-memory-title]', row).value,
          text: $('[data-memory-text]', row).value,
        }));
        o.photos = photoRows
          .map((row, i) => ({ ...o.photos[i], url: $('[data-photo-url]', row).value, caption: $('[data-photo-caption]', row).value }))
          .filter(p => p.url);
      }
    }
  }
  if (section === 'culture')
    for (const row of $$('[data-culture-editor]')) {
      const c = data.culture.find(c => c.id === row.dataset.cultureEditor);
      for (const key of ['title', 'subtitle', 'body', 'sourceLabel']) {
        const value = $(`[data-key="${key}"]`, row).value;
        if (isEn()) setEn(c, key, value);
        else c[key] = value;
      }
      if (!isEn()) c.source = $('[data-key="source"]', row).value;
    }
  if (section === 'quiz')
    $$('[data-quiz-editor]').forEach((row, i) => {
      const q = data.quiz[i];
      const options = $$('[data-option]', row).map(x => x.value);
      const question = $('[data-question]', row).value;
      const explanation = $('[data-explanation]', row).value;
      if (isEn()) {
        setEn(q, 'question', question);
        setEn(q, 'options', options);
        setEn(q, 'explanation', explanation);
      } else Object.assign(q, { question, options, explanation, answer: Number($('[data-answer]', row).value) });
    });
}

function save() {
  collect();
  validateContent(data);
  if (!store.write('draft', data)) throw Error('草稿儲存空間不足。請先匯出內容檔，再改用圖片路徑或網址。');
  dirty = false;
  status('草稿已保存在這個瀏覽器；公開網站尚未變更。');
}

function newStory() {
  return {
    id: 'story-' + Date.now(),
    name: '新受訪者',
    city: '請填家鄉',
    cityEn: 'HOMETOWN',
    coordinates: [78, 23],
    theme: '新的故事',
    demo: true,
    quote: '請填入本人確認的引言',
    intro: '',
    body: '',
    taiwan: '',
    portrait: '',
    cover: '',
    video: '',
    audio: '',
    photos: [],
    memories: [
      { title: '第一件物品', text: '' },
      { title: '第二件物品', text: '' },
      { title: '第三件物品', text: '' },
    ],
  };
}

function nav() {
  $('#editor-nav').innerHTML =
    `<button data-section="site">展覽首頁</button><button data-section="culture">文化介紹卡片</button><button data-section="quiz">互動問答題</button><p class="eyebrow" style="margin:20px 0 0">人物展間</p>${data.stories.map((s, i) => `<button data-index="${i}" class="${section === 'story' && storyIndex === i ? 'active' : ''}">${e(s.name)} · ${e(s.city)}</button>`).join('')}${isEn() ? '' : '<button id="add-story">＋ 新增受訪者</button>'}`;
  $$('[data-section]').forEach(b => {
    b.classList.toggle('active', b.dataset.section === section);
    b.onclick = () => {
      collect();
      section = b.dataset.section;
      render();
    };
  });
  $$('[data-index]').forEach(
    b =>
      (b.onclick = () => {
        collect();
        section = 'story';
        storyIndex = +b.dataset.index;
        render();
      }),
  );
  $('#add-story')?.addEventListener('click', () => {
    collect();
    data.stories.push(newStory());
    storyIndex = data.stories.length - 1;
    section = 'story';
    mark();
    render();
  });
}

const enHint = () =>
  isEn()
    ? '<p class="editor-hint">英文模式：灰色小字是中文原文，下面填英文。留空的欄位網站會自動顯示中文。ID、座標、圖片等共用設定請切回「編輯中文」。</p>'
    : '';

function siteHTML() {
  const s = data.site;
  return (
    '<h2>展覽首頁</h2>' +
    enHint() +
    textField('展覽名稱', s, 'title') +
    textField('首頁引言', s, 'intro', 'textarea') +
    mediaField('首頁氛圍影像', 'heroImage', s.heroImage) +
    textField('策展說明與素材揭露', s, 'about', 'textarea') +
    textField('在清華一起慶祝：段落文字', s, 'eventText', 'textarea')
  );
}

function storyHTML() {
  const s = data.stories[storyIndex];
  const shared = isEn()
    ? ''
    : field('人物 ID（上線後盡量保持不變；留言是依這個 ID 對應的）', 'id', s.id) +
      `<div class="row">${field('家鄉英文名稱（地圖與卡片上方的大寫標籤）', 'cityEn', s.cityEn)}</div>` +
      `<div class="row">${field('經度 Longitude', 'lon', s.coordinates[0], 'number')}${field('緯度 Latitude', 'lat', s.coordinates[1], 'number')}</div>` +
      `<label><input data-field="demo" type="checkbox" ${s.demo ? 'checked' : ''} style="width:auto"> 這是虛構示例（公開前請替換，再取消勾選）</label>`;
  const memoryValue = (m, key) => (isEn() ? (m.en?.[key] ?? '') : m[key]);
  const ref = (m, key) => (isEn() ? `<span class="editor-ref">${e(m[key] || '（中文空白）')}</span>` : '');
  const photos = isEn() ? s.photos : [...s.photos, { url: '', caption: '' }];
  return (
    `<h2>${e(s.name)} 的人物展間</h2><p class="editor-hint">只放入已取得本人同意的公開素材。座標填寫城市位置即可。影片可使用 YouTube 連結或 MP4 路徑。</p>` +
    enHint() +
    shared +
    `<div class="row">${textField('顯示名字', s, 'name')}${textField('故事主題', s, 'theme')}</div>` +
    textField(isEn() ? '家鄉名稱（英文）' : '家鄉中文名稱', s, 'city') +
    textField('人物引言', s, 'quote') +
    textField('一句話介紹', s, 'intro') +
    textField('我家的排燈節', s, 'body', 'textarea') +
    textField('離家以後', s, 'taiwan', 'textarea') +
    mediaField('人物照片', 'portrait', s.portrait) +
    mediaField('故事封面', 'cover', s.cover) +
    (isEn() ? '' : field('訪談影片 YouTube 或 MP4', 'video', s.video) + field('聲音 MP3 或其他可播放音檔', 'audio', s.audio)) +
    '<h3>記憶抽屜</h3>' +
    s.memories
      .map(
        (m, i) =>
          `<div data-memory><label>物件 ${i + 1} 名稱${ref(m, 'title')}<input data-memory-title value="${e(memoryValue(m, 'title'))}"></label><label>故事${ref(m, 'text')}<textarea data-memory-text>${e(memoryValue(m, 'text'))}</textarea></label></div>`,
      )
      .join('') +
    '<h3>照片故事</h3>' +
    (isEn() ? '' : '<p class="editor-hint">把照片上傳到 GitHub 的 assets 資料夾，這裡填 assets/檔名.jpg；也可以填完整網址。</p>') +
    photos
      .map((p, i) =>
        isEn()
          ? `<div data-photo><label>照片 ${i + 1} 說明${ref(p, 'caption')}<input data-photo-caption value="${e(p.en?.caption ?? '')}"></label></div>`
          : `<div data-photo><label>照片 ${i + 1} 網址或路徑<input data-photo-url value="${e(p.url)}"></label><label>照片說明／替代文字<input data-photo-caption value="${e(p.caption)}"></label></div>`,
      )
      .join('') +
    (isEn() ? '' : `<button id="more-photo">＋ 再加入一張照片</button>${divider}<button id="delete-story" class="danger">移除此人物草稿</button>`)
  );
}

function cultureHTML() {
  const one = (c, label, key, type = 'text') => {
    const value = isEn() ? (c.en?.[key] ?? '') : c[key];
    const ref = isEn() ? `<span class="editor-ref">${e(c[key] || '（中文空白）')}</span>` : '';
    const control = type === 'textarea' ? `<textarea data-key="${key}">${e(value)}</textarea>` : `<input data-key="${key}" value="${e(value)}">`;
    return `<label>${label}${ref}${control}</label>`;
  };
  return (
    '<h2>文化介紹卡片</h2>' +
    enHint() +
    data.culture
      .map(
        c =>
          `<div data-culture-editor="${e(c.id)}">${one(c, '標題', 'title')}${one(c, '簡介', 'subtitle')}${one(c, '展開內容', 'body', 'textarea')}${isEn() ? '' : `<label>參考資料連結<input data-key="source" value="${e(c.source)}"></label>`}${one(c, '參考資料名稱', 'sourceLabel')}${divider}</div>`,
      )
      .join('')
  );
}

function quizHTML() {
  const ref = text => (isEn() ? `<span class="editor-ref">${e(text || '（中文空白）')}</span>` : '');
  return (
    '<h2>互動問答題</h2><p class="editor-hint">可以改成由採訪故事出發的題目，請在解答補上背景說明。</p>' +
    (isEn() ? '<p class="editor-hint">英文選項要全部填完才會套用；正確答案與中文相同。</p>' : '') +
    data.quiz
      .map((q, i) => {
        const v = isEn() ? { question: q.en?.question ?? '', options: q.en?.options ?? q.options.map(() => ''), explanation: q.en?.explanation ?? '' } : q;
        return `<div data-quiz-editor><label>題目 ${i + 1}${ref(q.question)}<textarea data-question>${e(v.question)}</textarea></label>${q.options.map((o, j) => `<label>選項 ${j + 1}${j === q.answer ? '（正確答案）' : ''}${ref(o)}<input data-option value="${e(v.options[j])}"></label>`).join('')}${isEn() ? '' : `<label>正確答案<select data-answer>${q.options.map((o, j) => `<option value="${j}" ${j === q.answer ? 'selected' : ''}>選項 ${j + 1}</option>`).join('')}</select></label>`}<label>解答說明${ref(q.explanation)}<textarea data-explanation>${e(v.explanation)}</textarea></label>${divider}</div>`;
      })
      .join('')
  );
}

// 選圖片後縮小到最長邊 1600px，轉成 JPEG 嵌入內容檔
async function embedImage(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return status('請選擇 JPG、PNG 或 WebP。');
  if (file.size > 15 * 1024 * 1024) return status('圖片超過 15MB，請先縮小。');
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bitmap.width * scale);
    c.height = Math.round(bitmap.height * scale);
    c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
    $(`[data-field="${fileInput.dataset.upload}"]`).value = c.toDataURL('image/jpeg', 0.84);
    bitmap.close();
    mark();
    status('圖片已加入草稿。請記得匯出備份。');
  } catch {
    status('圖片無法讀取，請換一張圖片。');
  }
}

function render() {
  nav();
  $$('[data-edit-lang]').forEach(b => b.classList.toggle('active', b.dataset.editLang === editLang));
  const html = { site: siteHTML, story: storyHTML, culture: cultureHTML, quiz: quizHTML }[section]();
  $('#editor-panel').innerHTML = html;
  $$('input,textarea,select', $('#editor-panel')).forEach(el => el.addEventListener('input', mark));
  $$('[data-upload]').forEach(el => (el.onchange = () => embedImage(el)));
  if (section === 'story' && !isEn()) {
    $('#more-photo').onclick = () => {
      collect();
      data.stories[storyIndex].photos.push({ url: '', caption: '' });
      render();
      mark();
    };
    $('#delete-story').onclick = () => {
      if (data.stories.length === 1) return status('請至少保留一位人物。');
      if (confirm('從草稿移除這位人物？已發布的網站不會立即改變。')) {
        data.stories.splice(storyIndex, 1);
        storyIndex = 0;
        mark();
        render();
      }
    };
  }
}

function bindToolbar() {
  $$('[data-edit-lang]').forEach(
    b =>
      (b.onclick = () => {
        collect();
        editLang = b.dataset.editLang;
        store.write('editor-lang', editLang);
        render();
      }),
  );
  $('#preview-draft').onclick = () => {
    try {
      save();
      location.href = `../index.html?preview=1&lang=${editLang}`;
    } catch (err) {
      status(err.message);
    }
  };
  $('#export-content').onclick = () => {
    try {
      collect();
      validateContent(data);
      download('content.json', JSON.stringify(data, null, 2));
      store.write('draft', data);
      dirty = false;
      status('內容檔已匯出。將它替換到 GitHub 的 data/content.json 即可發布。');
    } catch (err) {
      status(err.message);
    }
  };
  $('#import-content').onchange = async ev => {
    try {
      const file = ev.target.files[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) throw Error('檔案超過 12MB，請改用外部圖片或相對路徑。');
      data = validateContent(JSON.parse(await file.text()));
      delete data.giscus;
      section = 'site';
      storyIndex = 0;
      render();
      mark();
      status('已匯入。請預覽並匯出備份。');
    } catch (err) {
      status('匯入失敗：' + err.message);
    }
  };
  $('#reset-draft').onclick = () => {
    if (confirm('放棄目前草稿並重新載入網站內容？請先匯出你想保留的版本。')) {
      store.remove('draft');
      dirty = false;
      location.reload();
    }
  };
  window.addEventListener('beforeunload', ev => {
    if (dirty) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });
}

async function init() {
  try {
    const published = validateContent(await loadJSON(CONTENT_PATH));
    const draft = store.read('draft', null);
    data = draft ? validateContent(draft) : published;
    delete data.giscus; // 舊版的 GitHub Discussions 設定，已改用 Supabase
    render();
    status(draft ? '已載入此瀏覽器的草稿。' : '已載入網站內容。');
    bindToolbar();
  } catch (err) {
    status(err.message);
  }
}

init();
