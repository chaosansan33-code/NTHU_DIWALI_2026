# 給 AI 助理的專案說明（AGENTS.md）

清華排燈節數位展覽網站。純靜態網站（HTML + CSS + 原生 ES modules，無打包工具、無 npm 相依），部署在 GitHub Pages；留言板資料在 Supabase。

## 依任務找指引

| 任務 | 先讀 |
|---|---|
| 新增／修改互動工坊小遊戲 | `js/games/README.md`（必讀，規則嚴格） |
| 翻譯或修改展覽內容（人物、文化卡、問答） | `docs/TRANSLATION.md`；內容在 `data/content.json` |
| 介面文字（按鈕、標題等）中英文 | `js/i18n/strings.js`（zh 與 en 要同時加同一個 key） |
| 留言板、檢舉、資料庫 | `docs/SETUP-SUPABASE.md`、`docs/MODERATION.md`、`supabase/schema.sql` |
| 檔案結構總覽 | `README.md` |
| 給主辦人（非技術）的操作說明；改動流程時要同步更新 | `主辦人使用指南.md` |

## 共通規則

- 不引入 npm 套件、打包工具或外部 CDN script；網站有 Content-Security-Policy（`index.html` 開頭），只允許本站程式。
- 所有使用者看得到的文字都要有中英文。HTML 靜態文字用 `data-i18n` 屬性；JS 裡用 `t('key')`。
- 放進 `innerHTML` 的外部文字一律先 `escapeHTML`（`js/lib/dom.js`）。
- 不要在前端放 Supabase secret / service_role key；`js/config.js` 只放 publishable key。
- 策展編輯頁在 `curator-nf8dvgy41x/`（刻意不連結）；改路徑時同步更新 `README.md`。
- 本機測試：`python3 -m http.server 8080`，開 `http://localhost:8080/`。修改後確認瀏覽器 Console 無錯誤、中英文切換正常、390px 手機寬度無橫向捲軸。
