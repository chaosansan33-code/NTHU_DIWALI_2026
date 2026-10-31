// 小遊戲的「主機」：畫遊戲卡片、開啟互動視窗、提供 ctx 給遊戲、負責清理。
// 寫新遊戲不需要改這個檔案 —— 請看 js/games/README.md。

import { $, $$, escapeHTML as e, toast, download } from '../lib/dom.js';
import { store } from '../lib/storage.js';
import { getLang, format, t as siteT } from '../i18n/index.js';
import { openActivity, setActivityCleanup } from '../app/dialogs.js';
import { state, progress, complete } from '../app/state.js';
import { GAMES } from './registry.js';

const loadedStyles = new Set();

// 依目前語言取一包文字，缺的 key 退回中文
function pick(bundle = {}) {
  return { ...bundle.zh, ...bundle[getLang()] };
}

// 遊戲有 style.css 時，第一次開啟才載入
function loadStyles(game) {
  if (!game.styles || loadedStyles.has(game.id)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL(`./${game.id}/style.css`, import.meta.url).href;
  document.head.append(link);
  loadedStyles.add(game.id);
}

// 卡片格式固定，每個遊戲只提供 icon 與 card 文字
export function renderGameCards(container = $('#game-grid')) {
  container.innerHTML = GAMES.map(game => {
    const card = pick(game.card);
    return `<button class="game-card" data-game="${e(game.id)}"><div class="game-art"><span aria-hidden="true">${e(game.icon)}</span></div><div class="game-copy"><span class="game-meta">${e(card.tag)}</span><h3>${e(card.title)}</h3><p>${e(card.text)}</p><span class="game-action">${e(card.action)} ＋</span></div></button>`;
  }).join('');
  $$('[data-game]', container).forEach(b => (b.onclick = () => startGame(b.dataset.game)));
}

function createContext(game, root) {
  const strings = pick(game.strings);
  const cleanups = [];
  const prefix = `game:${game.id}:`;
  const close = () => $('#activity-dialog').close();
  return {
    cleanups,
    ctx: {
      id: game.id,
      lang: getLang(),
      root,
      t: (key, params) => format(strings[key] ?? key, params),
      content: state.content,
      progress: Object.freeze({
        visited: [...progress.visited],
        saved: [...progress.saved],
        games: [...progress.games],
      }),
      store: {
        read: (key, fallback) => store.read(prefix + key, fallback),
        write: (key, value) => store.write(prefix + key, value),
        remove: key => store.remove(prefix + key),
      },
      // 遊戲資料夾內檔案（圖片、音效）的網址，例如 ctx.asset('images/lamp.svg')
      asset: path => new URL(`./${game.id}/${path}`, import.meta.url).href,
      complete: () => complete(game.id),
      escapeHTML: e,
      toast,
      download,
      onCleanup: fn => cleanups.push(fn),
      restart: () => startGame(game.id),
      close,
      goTo: hash => {
        close();
        location.hash = hash;
      },
    },
  };
}

export function startGame(id) {
  const game = GAMES.find(g => g.id === id);
  if (!game) return;
  loadStyles(game);
  const root = openActivity('');
  root.dataset.game = game.id;
  const { ctx, cleanups } = createContext(game, root);
  setActivityCleanup(() => {
    for (const fn of cleanups.splice(0)) {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
  });
  try {
    const cleanup = game.mount(root, ctx);
    if (typeof cleanup === 'function') cleanups.push(cleanup);
  } catch (err) {
    console.error(`[game:${game.id}]`, err);
    root.innerHTML = `<p class="game-status">${e(siteT('game.loadError'))}</p>`;
  }
}
