// 展覽首頁進入點：載入內容後，依序啟動各區塊；並處理中／英切換。

import { $, escapeHTML as e } from '../lib/dom.js';
import { loadContent, loadJSON, safeURL, showLoadError, MAP_PATH } from '../lib/content.js';
import { t, getLang, setLang, onLanguageChange, localizeContent, applyStaticText } from '../i18n/index.js';
import { state, persist } from './state.js';
import { initDialogs, openActivity } from './dialogs.js';
import { initMap, drawMap, drawMarkers, refreshMapLanguage } from './map.js';
import { openStory, openStoryId } from './stories.js';
import { renderCulture } from './culture.js';
import { renderGameCards } from '../games/host.js';
import { initWall, redrawWall } from './wall.js';
import { showCollection } from './collection.js';
import { registerExhibitTools } from './webmcp.js';

function applySiteText() {
  const { site, stories } = state.content;
  document.title = site.title + '｜Light Across Home';
  $('meta[name="description"]').content = t('meta.description');
  // 展覽名稱被改過才覆蓋大標題，否則保留有排版的預設標題
  if (site.title !== t('site.defaultTitle')) $('h1').textContent = site.title;
  $('.hero-intro').textContent = site.intro;
  $('.hero-intro').style.whiteSpace = 'pre-line';
  const hero = safeURL(site.heroImage, { image: true });
  if (hero)
    $('.hero-image').style.backgroundImage =
      `linear-gradient(90deg,#10121cf0 0%,#10121ca6 37%,#10121c10 70%),linear-gradient(0deg,#10121c 0%,transparent 25%),url(${JSON.stringify(hero)})`;
  $('.interlude-text').textContent = site.eventText;
  $('.interlude-text').style.whiteSpace = 'pre-line';
  if (new URLSearchParams(location.search).get('preview') === '1') $('.demo-note').textContent = t('hero.demoNotePreview');
  else if (!stories.some(s => s.demo)) $('.demo-note').textContent = t('hero.demoNoteReal');
}

function updateLangButton() {
  const button = $('#lang-button');
  button.textContent = t('lang.switch');
  button.setAttribute('aria-label', t('lang.switchAria'));
  button.lang = getLang() === 'en' ? 'zh-Hant' : 'en';
}

function showAbout() {
  openActivity(
    `<p class="eyebrow">ABOUT THE EXHIBITION</p><h2>${e(t('about.title'))}</h2><p style="white-space:pre-line">${e(state.content.site.about)}</p><p>${t('about.map')}</p><p>${e(t('about.privacy'))}</p>`,
  );
}

// 網址為 #story/<id> 時直接打開該人物展間（方便分享故事連結）
function openStoryFromHash() {
  if (location.hash.startsWith('#story/')) openStory(decodeURIComponent(location.hash.slice(7)));
}

async function loadMap() {
  try {
    const geo = await loadJSON(MAP_PATH);
    if (geo?.type !== 'FeatureCollection' || !Array.isArray(geo.features) || !geo.features.length)
      throw Error('map.json 格式不正確，請使用網站原附的地圖資料。');
    drawMap(geo);
  } catch (err) {
    drawMarkers();
    showLoadError(err, t('map.loadError'));
  }
}

// 切換語言：重新產生內容、重畫各區塊；開著的故事用新語言重開，開著的遊戲關閉
function onLanguageSwitched() {
  state.content = localizeContent(state.raw);
  applyStaticText();
  updateLangButton();
  applySiteText();
  refreshMapLanguage();
  renderCulture();
  renderGameCards();
  redrawWall();
  if ($('#activity-dialog').open) $('#activity-dialog').close();
  const storyId = openStoryId();
  if (storyId) openStory(storyId);
}

async function init() {
  initDialogs();
  applyStaticText();
  updateLangButton();
  try {
    state.raw = await loadContent();
  } catch (err) {
    showLoadError(err);
    return;
  }
  state.content = localizeContent(state.raw);
  applySiteText();
  initMap();
  renderCulture();
  renderGameCards();
  initWall();
  persist();
  $('#lang-button').onclick = () => setLang(getLang() === 'en' ? 'zh' : 'en');
  onLanguageChange(onLanguageSwitched);
  $('#collection-button').onclick = showCollection;
  $('#about-button').onclick = showAbout;
  window.addEventListener('hashchange', openStoryFromHash);
  openStoryFromHash();
  registerExhibitTools();
  await loadMap();
}

init();
