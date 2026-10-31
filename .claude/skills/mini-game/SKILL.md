---
name: mini-game
description: Add, modify, or remove a mini game in the exhibition's 互動工坊 (Workshop) section. Use whenever the user asks for a new 小遊戲 / 互動 / game, or to change an existing one (rangoli, memory, quiz, rhythm, hunt, postcard).
---

# 小遊戲實作（mini-game）

完整規格在 **`js/games/README.md`** —— 動手前先完整讀過，並嚴格照做。重點摘要：

1. 一個遊戲 = `js/games/<id>/index.js`（+ 選用 `style.css`）。從 `js/games/_template/` 複製開始。
2. `export default { id, icon, card: {zh, en}, strings: {zh, en}, styles, mount(root, ctx) }`。
   卡片欄位固定為 `tag`、`title`、`text`、`action`。
3. 遊戲只透過 `ctx` 與外界互動（`t`、`complete`、`store`、`content`、`progress`、`asset`、`escapeHTML`、`toast`、`download`、`restart`、`close`、`goTo`、`onCleanup`）。
   DOM 只在 `root` 內用 `[data-role="..."]` 查詢，不用 `id`。
4. 所有文字放 `strings`，zh 與 en 都要有；外部文字放進 innerHTML 前用 `ctx.escapeHTML`。
5. 計時器、動畫、音訊要在 `mount` 回傳的清理函式中停止。圖片／音效放在遊戲資料夾內，用 `ctx.asset('images/x.svg')` 取網址（範例：`memory/`）。
6. 在 `js/games/registry.js` 加 import 並放進 `GAMES` 陣列。**不要改** `host.js`、`index.html`、`css/styles.css`、其他遊戲。
7. 不可載入外部 script / CSS / 字型，不可用 `eval` 或行內事件屬性（CSP 會擋）。
8. 完成後照 README「測試檢查清單」測試：`python3 -m http.server 8080` → `http://localhost:8080/#play`，中英文、手機 390px、鍵盤操作、Console 無錯誤。

回報時說明：新增／修改了哪些檔案、遊戲玩法、測試了哪些項目。
