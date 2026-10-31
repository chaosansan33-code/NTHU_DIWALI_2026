# 離家以後，我們一起點燈｜Light Across Home

清華排燈節（Diwali）互動數位展覽網站。純靜態網頁（HTML + CSS + 原生 JavaScript 模組），放在 GitHub Pages；留言板資料存在 Supabase。

> **主辦人／非技術人員請先看 [主辦人使用指南.md](主辦人使用指南.md)**：修改內容、上傳 content.json、處理檢舉、請 AI 擴充小遊戲。

## 檔案結構

```
index.html            展覽首頁
curator-nf8dvgy41x/   策展內容編輯頁（刻意放在不易猜到的資料夾，首頁沒有連結）
assets/               圖片（hero.jpg、favicon.svg；新照片也放這裡）
data/
  content.json        展覽內容：人物故事、文化卡片、問答題、示例留言（英文放在各物件的 en）
  map.json            印度地圖底圖資料（Natural Earth）
css/styles.css        全站樣式
js/
  config.js           ★ Supabase 連線設定（唯一需要填的設定檔）
  i18n/               中英切換：index.js（切換邏輯）、strings.js（介面文字字典）
  lib/                共用小工具：DOM、瀏覽器儲存、內容讀取與檢查
  comments/           留言板：api.js（跟 Supabase 溝通）、board.js（留言 / 檢舉介面）
  app/                首頁各區塊：main.js（進入點）、map.js、stories.js、culture.js、wall.js …
  games/              互動工坊：每個遊戲一個資料夾；README.md 是新增遊戲的指引
  editor/editor.js    策展編輯頁的程式
supabase/
  schema.sql          資料表、權限、留言 / 檢舉函式（貼到 Supabase SQL Editor 執行）
  functions/report-notify/index.ts   有人檢舉時寄 Gmail 通知的 Edge Function
docs/
  SETUP-SUPABASE.md   ★ 留言板設定步驟
  MODERATION.md       處理檢舉：刪除 / 恢復留言
  TRANSLATION.md      中英文內容與 AI 翻譯流程
主辦人使用指南.md     ★ 給主辦人的白話操作指南
AGENTS.md / CLAUDE.md 給 AI 助理的專案說明
.claude/skills/mini-game/  讓 Claude Code 自動套用小遊戲指引
```

## 留言板

- 首頁「04 點燈留言」和每個人物展間的「想對 ○○ 說的話」共用同一套程式（`js/comments/`）。
- 留言即時公開；按「檢舉」後該留言**立即隱藏**並寄 Gmail 給管理員，管理員再決定刪除或恢復（[docs/MODERATION.md](docs/MODERATION.md)）。
- 第一次設定請照 **[docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md)**。
- `js/config.js` 留空時，留言板自動停用並顯示示例留言，網站其他功能照常。

## 中英文

- 右上角 **EN / 中文** 切換；網址加 `?lang=en` 直接開英文版。
- 展覽內容的英文在 `data/content.json` 各物件的 `en`，可在編輯頁「English」模式填寫，或請 AI 翻譯：見 **[docs/TRANSLATION.md](docs/TRANSLATION.md)**。
- 介面文字在 `js/i18n/strings.js`。

## 互動工坊小遊戲

每個遊戲是 `js/games/<id>/` 一個資料夾，卡片格式統一。新增或修改遊戲請照 **[js/games/README.md](js/games/README.md)**（也可以直接把這份文件和你的需求一起交給 AI）。

## 更新展覽內容

1. 打開策展編輯頁：網站網址後面加 **`/curator-nf8dvgy41x/`**（首頁沒有連結，請收藏起來）。
2. 修改後按「儲存並預覽草稿」確認，再按「匯出網站內容」下載 `content.json`。
3. 用下載的檔案取代 repo 裡的 **`data/content.json`**，commit 後網站就會更新。
4. 照片上傳到 `assets/`，在編輯頁填 `assets/檔名.jpg`。

> 編輯頁只會改動你自己瀏覽器裡的草稿與下載的檔案，本身沒有修改網站的權限，所以即使路徑被知道也不會造成損害。但 GitHub repo 若是公開的，這個資料夾名稱在 repo 裡看得到。想換路徑時，把資料夾改名並更新本 README 與 `AGENTS.md`。

## 部署（GitHub Pages）

Repo 的 **Settings → Pages → Build and deployment**：Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)`。之後每次 push 到 `main` 就會自動更新。

> 用 GitHub 網頁上傳檔案時，請先進入對應資料夾再上傳（例如進 `data/` 再上傳 `content.json`），不要把所有檔案丟在最外層。

## 本機預覽

ES 模組不能用雙擊 `index.html` 開啟，需要一個簡單的伺服器：

```bash
python3 -m http.server 8080
# 打開 http://localhost:8080
```
