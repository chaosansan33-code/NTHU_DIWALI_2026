# 互動工坊小遊戲：實作指引

> 給 AI 與人類開發者。依照使用者的 prompt 新增或修改小遊戲時，**照這份文件做**。
> 一個遊戲 = 一個資料夾。不需要、也不應該修改 `host.js`、`index.html` 或其他遊戲。

---

## 1. 架構

```
js/games/
  README.md          ← 本文件
  registry.js        ← 遊戲清單（唯一需要動的共用檔案：加一行 import + 放進陣列）
  host.js            ← 主機：畫卡片、開視窗、建立 ctx、載入 style.css、關閉時清理（不要改）
  _template/         ← 新遊戲範本，複製它開始
  rangoli/  index.js  style.css    ← 每個遊戲一個資料夾
  memory/   index.js  style.css  images/*.svg   ← 需要圖片時放在自己的資料夾（範例）
  quiz/  rhythm/  hunt/  postcard/
```

流程：訪客點卡片 → `host.startGame(id)` → 打開互動視窗，產生空的 `root` 容器 → 呼叫遊戲的 `mount(root, ctx)` → 視窗關閉時執行遊戲回傳的清理函式。

## 2. 遊戲合約（`<id>/index.js` 的 `export default`）

```js
export default {
  id: 'lantern',                 // 必填，= 資料夾名稱；英文小寫、數字、連字號
  icon: '✦',                     // 必填，卡片上的大圖示（一個字元或 emoji）
  card: {                        // 必填，卡片文字；格式固定，所有遊戲卡片長得一樣
    zh: { tag: 'LIGHT A LANTERN', title: '點一盞燈籠', text: '一句話介紹玩法。', action: '開始 · 約 1 分鐘' },
    en: { tag: 'LIGHT A LANTERN', title: 'Light a Lantern', text: 'One-line description.', action: 'Start · about 1 min' },
  },
  strings: {                     // 遊戲內所有文字；zh / en 的 key 必須一致
    zh: { title: '標題', score: '得分：{score}' },
    en: { title: 'Title', score: 'Score: {score}' },
  },
  styles: true,                  // 同資料夾有 style.css 時設 true，host 會在第一次開啟時載入
  mount(root, ctx) {             // 必填
    // 在 root 裡畫畫面、綁事件
    return () => { /* 選填：清理計時器、音訊、事件 */ };
  },
};
```

卡片欄位對應畫面：`tag` = 卡片上方英文小字標籤（中英文版通常相同）、`title` = 大標題、`text` = 說明、`action` = 底部行動提示（host 會自動加上「＋」）。

## 3. ctx 一覽（遊戲只透過 ctx 和外界互動）

| 名稱 | 說明 |
|---|---|
| `ctx.t(key, params?)` | 取目前語言的遊戲文字；`{score}` 這類參數會被替換。缺英文時自動用中文 |
| `ctx.lang` | `'zh'` 或 `'en'` |
| `ctx.root` | 同 `mount` 的 `root` |
| `ctx.content` | 目前語言版本的 `data/content.json`（`stories`、`culture`、`quiz`、`site`…） |
| `ctx.progress` | 唯讀副本：`{ visited: [人物 ID], saved: [人物 ID], games: [已完成遊戲 ID] }` |
| `ctx.complete()` | 記錄「這個遊戲已體驗」（收藏頁統計會用到）；可重複呼叫 |
| `ctx.store.read(key, fallback)` / `.write(key, value)` / `.remove(key)` | 存在訪客瀏覽器的資料，已自動加上遊戲專屬前綴，不會撞名 |
| `ctx.asset(path)` | 遊戲資料夾內檔案的網址，例如 `ctx.asset('images/lamp.svg')`（圖片、音效用） |
| `ctx.escapeHTML(text)` | 把外部文字（內容檔、訪客輸入）放進 `innerHTML` 前一定要先跳脫 |
| `ctx.toast(message)` | 畫面下方的短暫提示 |
| `ctx.download(filename, data, mimeType)` | 讓訪客下載檔案（`data` 可為字串或 Blob） |
| `ctx.onCleanup(fn)` | 登記關閉視窗時要執行的清理（也可直接讓 `mount` 回傳函式） |
| `ctx.restart()` | 重新開始這個遊戲（重新呼叫 `mount`） |
| `ctx.close()` | 關閉遊戲視窗 |
| `ctx.goTo(hash)` | 關閉視窗並跳到頁面區塊，例如 `ctx.goTo('map')`、`ctx.goTo('wall')` |

## 4. 從 prompt 到新遊戲：步驟

1. **複製範本**：把 `js/games/_template/` 複製成 `js/games/<新 id>/`，把 `id` 改成資料夾名稱。
2. **寫卡片**：填 `icon` 與 `card.zh` / `card.en`。四個欄位都要有，長度和現有卡片相近（`text` 約 15–25 個中文字）。
3. **列出文字**：遊戲畫面上每一段文字都放進 `strings.zh` 與 `strings.en`（同一組 key）。英文由中文翻譯即可。
4. **寫 `mount(root, ctx)`**：
   - 先用 `root.innerHTML = \`...\`` 畫出畫面，第一行建議是 `<p class="eyebrow">英文標籤</p><h2>${t('title')}</h2><p>${t('intro')}</p>`，和其他遊戲一致。
   - 用 `root.querySelector('[data-role="..."]')` 找元素，**不要用 `id`**、不要用 `document.querySelector`。
   - 達成目標時呼叫 `ctx.complete()`。
   - 有 `setTimeout` / `setInterval` / `requestAnimationFrame` / `AudioContext` / `window` 事件時，回傳清理函式把它們全部停掉。
5. **需要圖片或音效時**：照第 6 節放在遊戲資料夾內，用 `ctx.asset()` 取網址。
6. **需要樣式時**：建立 `style.css`，`styles: true`。class 名稱加遊戲前綴（例如 `.lantern-sky`）避免影響別人。
7. **註冊**：在 `registry.js` 加 `import lantern from './lantern/index.js';`，並把 `lantern` 放進 `GAMES` 陣列（陣列順序 = 卡片順序）。
8. **測試**：照第 8 節檢查清單。

修改既有遊戲時，只改該遊戲資料夾；文字一律改 `strings`，兩種語言都要改。

## 5. 規則（必須遵守）

- **只動自己的資料夾 + `registry.js`。** 不改 `host.js`、`index.html`、`css/styles.css`、其他遊戲。
- **雙語**：所有看得到的文字都要在 `strings` / `card` 有 zh 和 en；不要把中文直接寫在 HTML 字串裡。
- **安全**：
  - 來自 `ctx.content`、訪客輸入、網址的文字，放進 `innerHTML` 前用 `ctx.escapeHTML()`；或改用 `textContent`。
  - 不可使用 `eval`、`new Function`、`<script>`、行內事件屬性（`onclick="..."`）。用 `element.onclick = ...`。
  - 不可載入外部 JS／CSS／字型（網站有 Content-Security-Policy，會被擋）。圖片、音效放在自己的遊戲資料夾，用 `ctx.asset()`。
  - 不可呼叫留言板（Supabase）或任何外部 API。
- **無障礙**：可點的東西用 `<button>`；非按鈕元素要可點時加 `tabindex="0" role="button" aria-label` 並處理 Enter／空白鍵；只用顏色表達的資訊要另外有文字。
- **行動版**：390px 寬不能出現橫向捲軸；觸控目標至少約 44px。
- **動畫**：尊重 `matchMedia('(prefers-reduced-motion: reduce)')`，減少或關閉大動作動畫。
- **聲音**：只能在使用者點擊後開始播放，並提供靜音選項（參考 `rhythm/`）。
- **資料**：只存在 `ctx.store`；不要存個資。
- **不要依賴其他遊戲**：遊戲之間不互相 import。共用的小工具直接寫在自己的檔案裡。

## 6. 使用圖片與音效

範例：`memory/`（記憶翻翻卡的卡面就是 `memory/images/*.svg`）。

1. 把檔案放進自己的遊戲資料夾，例如 `js/games/lantern/images/lamp.svg`、`js/games/lantern/sounds/bell.mp3`。
   - 圖片：SVG（線條圖示最清晰、檔案最小）、PNG、WebP、JPG；單張建議 200KB 以下。
   - 音效：MP3 或 OGG，短音效 100KB 以下；只能在使用者點擊後播放，並提供靜音。
   - 只放有授權、可公開使用的素材（自己畫的、AI 生成並確認可用的、或 CC0）。
2. 用 `ctx.asset('images/lamp.svg')` 取得網址，**不要**寫死 `js/games/...` 路徑（網站搬家或改資料夾時會壞掉）。
3. 每張圖片都要有替代文字，而且是雙語：把名稱放在 `strings`，`alt="${t('lamp')}"`。
4. 會反覆顯示的圖片可先預載，避免翻牌或切換時閃爍：

```js
const ITEMS = [{ key: 'lamp', image: 'images/lamp.svg' }, { key: 'letter', image: 'images/letter.svg' }];

mount(root, ctx) {
  const { t } = ctx;
  const faces = ITEMS.map(item => Object.assign(new Image(), { src: ctx.asset(item.image) })); // 預載
  root.innerHTML = ITEMS.map((item, i) => `<img class="lantern-pic" src="${faces[i].src}" alt="${t(item.key)}">`).join('');
  const bell = new Audio(ctx.asset('sounds/bell.mp3')); // 在按鈕 onclick 裡才 bell.play()
  return () => bell.pause();
}
```

5. 圖片尺寸用遊戲自己的 `style.css` 控制（例如 `.lantern-pic { width: 56px; height: 56px; }`），手機版在 `@media (max-width: 700px)` 縮小。

想把現有遊戲的文字換成圖片（或反過來），只要改資料與畫出卡面的那一段，其餘邏輯不用動 —— 可以對照 `memory/index.js` 的 `ITEMS`、`showFace()`。

## 7. 可直接使用的共用樣式

這些 class 已在 `css/styles.css` 定義，遊戲可直接用，外觀會和其他遊戲一致：

| class | 用途 |
|---|---|
| `eyebrow` | 標題上方的金色英文小字 |
| `activity-toolbar` | 一排按鈕／選項的工具列 |
| `game-status` | 金色的狀態文字（得分、提示） |
| `button gold` | 金色主要按鈕；`button` 為一般外框按鈕 |
| `gold`（在工具列按鈕上） | 金色文字按鈕 |
| `storage-note` | 灰色小字說明 |

`<label>文字<input></label>` 會自動排成「標籤在上、欄位在下」。CSS 變數可用：`--gold`、`--text`、`--muted`、`--line`、`--surface`、`--panel`、`--serif`、`--sans`。

## 8. 測試檢查清單

本機啟動：在專案根目錄執行 `python3 -m http.server 8080`，打開 <http://localhost:8080/#play>。

- [ ] 卡片出現在互動工坊，格式與其他卡片相同（圖示、英文標籤、標題、說明、行動提示 ＋）
- [ ] 點卡片能開啟、可完整玩一輪、達成目標時呼叫 `ctx.complete()`（右上「收藏」視窗的「已體驗 N 種互動」會增加）
- [ ] 右上角切換 English：卡片與遊戲內沒有殘留中文；切回中文也正常
- [ ] 關閉視窗後再開，狀態正確；瀏覽器 Console 沒有錯誤，也沒有關窗後仍在跑的計時器或聲音
- [ ] 手機寬度（DevTools 選 390px）沒有橫向捲軸，按鈕好按
- [ ] 只用鍵盤（Tab / Enter）也能玩
- [ ] 沒有修改 `host.js`、`index.html`、其他遊戲

## 9. 常見錯誤

| 症狀 | 原因 |
|---|---|
| 卡片沒出現 | 忘了在 `registry.js` 加入，或 `id` 與資料夾名稱不同 |
| 畫面空白、Console 有錯誤 | `mount` 內丟出例外；host 會顯示「這個遊戲暫時無法開啟」 |
| 樣式沒套用 | 沒設 `styles: true`，或 `style.css` 不在遊戲資料夾內 |
| 切換英文後還是中文 | 文字寫死在 HTML 字串裡，沒有放進 `strings` |
| 關掉視窗聲音還在響 | 沒有回傳清理函式關閉 `AudioContext` / 計時器 |
| 和別的遊戲樣式互相影響 | class 名稱沒有加遊戲前綴 |
| 內容檔的文字出現奇怪符號或被當成 HTML | 沒有用 `ctx.escapeHTML()` |
| 圖片顯示破圖 | 路徑寫錯或沒用 `ctx.asset()`；檔名大小寫要完全相同（GitHub Pages 區分大小寫） |

## 10. 完整範例：點燈小遊戲

```js
// js/games/lantern/index.js
const TOTAL = 5;

export default {
  id: 'lantern',
  icon: '🪔',
  card: {
    zh: { tag: 'LIGHT THE LAMPS', title: '點亮五盞燈', text: '依序點亮五盞燈，送出你的祝福。', action: '點燈 · 約 30 秒' },
    en: { tag: 'LIGHT THE LAMPS', title: 'Light Five Lamps', text: 'Light five lamps one by one and send your wishes.', action: 'Light up · about 30 sec' },
  },
  strings: {
    zh: { title: '一盞一盞，把光點亮。', intro: '點擊燈，讓它亮起來。', lamp: '第 {n} 盞燈', count: '已點亮 {lit} / {total}', done: '五盞燈都亮了，祝福已經送出！' },
    en: { title: 'One by one, let the light grow.', intro: 'Tap a lamp to light it.', lamp: 'Lamp {n}', count: 'Lit {lit} / {total}', done: 'All five lamps are lit — your wishes are on their way!' },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    root.innerHTML = `
      <p class="eyebrow">LIGHT THE LAMPS</p><h2>${t('title')}</h2><p>${t('intro')}</p>
      <div class="lantern-row">${Array.from({ length: TOTAL }, (_, i) => `<button class="lantern-lamp" data-lamp="${i}" aria-label="${t('lamp', { n: i + 1 })}">🪔</button>`).join('')}</div>
      <p class="game-status" data-role="status">${t('count', { lit: 0, total: TOTAL })}</p>`;
    let lit = 0;
    root.querySelectorAll('[data-lamp]').forEach(button => {
      button.onclick = () => {
        if (button.classList.contains('is-lit')) return;
        button.classList.add('is-lit');
        lit++;
        const status = root.querySelector('[data-role="status"]');
        status.textContent = t('count', { lit, total: TOTAL });
        if (lit === TOTAL) {
          status.textContent = t('done');
          ctx.complete();
        }
      };
    });
  },
};
```

```css
/* js/games/lantern/style.css */
.lantern-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 24px 0; }
.lantern-lamp { width: 64px; height: 64px; font-size: 28px; border-radius: 50%; filter: grayscale(1) brightness(0.6); }
.lantern-lamp.is-lit { filter: none; box-shadow: 0 0 24px #eac18c80; border-color: var(--gold); }
```

```js
// js/games/registry.js 加上：
import lantern from './lantern/index.js';
export const GAMES = [rangoli, memory, quiz, rhythm, hunt, postcard, lantern];
```
