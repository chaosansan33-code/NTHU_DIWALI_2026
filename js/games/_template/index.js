// ─────────────────────────────────────────────────────────────
// 新遊戲範本：複製整個 _template 資料夾，改名成你的遊戲 id（英文小寫、數字、連字號），
// 再到 js/games/registry.js 加一行 import 並放進 GAMES。
// 完整規則與檢查清單：js/games/README.md
// ─────────────────────────────────────────────────────────────

export default {
  // 必須和資料夾名稱相同
  id: 'template',

  // 卡片上的大圖示：一個字元或 emoji
  icon: '✦',

  // 卡片文字（格式固定）：tag = 卡片上方小字英文標籤，action = 卡片底部的行動提示
  card: {
    zh: { tag: 'A NEW GAME', title: '遊戲名稱', text: '一句話說明這個遊戲在做什麼。', action: '開始 · 約 1 分鐘' },
    en: { tag: 'A NEW GAME', title: 'Game title', text: 'One sentence about what players do.', action: 'Start · about 1 min' },
  },

  // 遊戲內所有文字。zh 與 en 的 key 要一樣；{name} 會被 ctx.t(key, { name }) 替換
  strings: {
    zh: {
      eyebrow: 'A NEW GAME',
      title: '標題',
      intro: '玩法說明。',
      start: '開始',
      score: '目前得分：{score}',
      done: '完成了！',
    },
    en: {
      eyebrow: 'A NEW GAME',
      title: 'Title',
      intro: 'How to play.',
      start: 'Start',
      score: 'Score: {score}',
      done: 'Done!',
    },
  },

  // 有同資料夾的 style.css 才設成 true（host 會自動載入）
  // 需要圖片／音效：放在這個資料夾（例如 images/），用 ctx.asset('images/xxx.svg') 取網址（範例：memory/）
  styles: false,

  /**
   * 開啟遊戲時呼叫。
   * @param {HTMLElement} root 遊戲畫面的容器（只在這裡面操作 DOM）
   * @param {object} ctx      host 提供的工具，見 README「ctx 一覽」
   * @returns {Function|void} 選填：關閉視窗時要執行的清理函式
   */
  mount(root, ctx) {
    const { t } = ctx;
    let score = 0;

    root.innerHTML = `
      <p class="eyebrow">${t('eyebrow')}</p>
      <h2>${t('title')}</h2>
      <p>${t('intro')}</p>
      <div class="activity-toolbar"><button class="gold" data-role="start">${t('start')}</button></div>
      <p class="game-status" data-role="status"></p>`;

    const $ = selector => root.querySelector(selector);
    const status = $('[data-role="status"]');

    $('[data-role="start"]').onclick = () => {
      score++;
      status.textContent = t('score', { score });
      if (score >= 3) {
        status.textContent = t('done');
        ctx.complete(); // 記錄「已體驗」，會出現在收藏頁的統計
      }
    };

    // 有 setTimeout / setInterval / 音訊時，一定要在這裡清掉
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
  },
};
