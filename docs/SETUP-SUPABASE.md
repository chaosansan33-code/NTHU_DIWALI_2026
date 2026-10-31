# 留言板設定步驟（Supabase + Gmail 檢舉通知）

完成後：

- 首頁「04 點燈留言」與每個人物展間的「想對 ○○ 說的話」都會**即時公開**，所有觀眾都看得到。
- 每則留言旁有「檢舉」按鈕。有人檢舉時，**該留言立即隱藏**，管理員的 Gmail 同時收到通知信，再到 Supabase 後台決定刪除或恢復。

大約需要 30 分鐘。整個過程**不需要**把任何密碼放進 GitHub。

---

## 第 1 步：建立 Supabase 專案

1. 到 <https://supabase.com> 註冊並登入（可用 GitHub 帳號）。
2. **New project**：
   - Name：例如 `nthu-diwali`
   - Database Password：按 Generate 產生，存到安全的地方（之後幾乎用不到）
   - Region：選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**，離臺灣近比較快
3. 等 1–2 分鐘專案建立完成。

## 第 2 步：建立資料表與權限

1. 左側選單 **SQL Editor** → **New query**。
2. 打開本 repo 的 [`supabase/schema.sql`](../supabase/schema.sql)，全部複製貼上 → 按 **Run**。
3. 看到 `Success. No rows returned` 就完成了。

> 這份 SQL 可以重複執行（例如之後要調整留言頻率限制，或從舊版升級加入「檢舉即隱藏」），不會刪掉已經有的留言。
> **已經設定過舊版的專案**：重新貼上最新的 `schema.sql` 執行一次即可升級，再重新部署第 5 步的 Edge Function（信件內容有更新）。

## 第 3 步：把網站接上 Supabase

1. 左側 **Project Settings** → **API Keys**（舊版介面在 **API**）。
2. 複製兩個值：
   - **Project URL**：像 `https://abcdefghijkl.supabase.co`（在 Project Settings → Data API 或 API 頁面）
   - **Publishable key**：`sb_publishable_` 開頭。舊專案只有 **anon public** key，用那個也可以。
3. 編輯 repo 的 [`js/config.js`](../js/config.js)，填進去：

   ```js
   export const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';
   export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xxxxxxxx';
   ```

4. Commit、push。GitHub Pages 更新後，留言板就能使用了。

> ✅ publishable / anon key 本來就是給網頁公開用的，放在 GitHub 沒問題。
> ⛔ **secret key、service_role key 絕對不要**放進 `js/config.js` 或 repo 的任何地方。

到這一步留言功能已經完整可用；接下來設定檢舉通知。

---

## 第 4 步：建立 Gmail 應用程式密碼

建議用活動專用的 Gmail 帳號寄通知信。

1. 到 <https://myaccount.google.com/security>，開啟 **兩步驟驗證**（沒開就無法建立應用程式密碼）。
2. 到 <https://myaccount.google.com/apppasswords>，名稱填 `supabase`，按建立。
3. 會顯示一組 **16 碼密碼**，先複製起來（只會顯示一次）。

## 第 5 步：部署寄信用的 Edge Function

1. Supabase 左側 **Edge Functions** → **Deploy a new function** → **Via Editor**。
2. 函式名稱填 **`report-notify`**（要一模一樣）。
3. 把 [`supabase/functions/report-notify/index.ts`](../supabase/functions/report-notify/index.ts) 的內容全部貼上，取代預設程式碼 → **Deploy**。
4. 部署完成後，進入該函式的 **Details / Settings**，把 **Verify JWT**（Enforce JWT verification）**關閉** → 儲存。
   這個函式改用下一步的 `WEBHOOK_SECRET` 驗證，外人沒有密鑰就無法叫它寄信。

> 會用指令列的話，也可以：`supabase functions deploy report-notify --no-verify-jwt`

## 第 6 步：設定 Secrets（密鑰）

**Edge Functions** → **Secrets**（Manage secrets），新增四個：

| Name | Value |
|---|---|
| `GMAIL_USER` | 寄件 Gmail，例如 `nthu.diwali@gmail.com` |
| `GMAIL_APP_PASSWORD` | 第 4 步的 16 碼密碼（空格可以拿掉） |
| `ADMIN_EMAIL` | 收通知的信箱，多個用逗號分隔；不填就寄給 `GMAIL_USER` |
| `WEBHOOK_SECRET` | 自己產生的一長串亂碼（見下方） |

產生 `WEBHOOK_SECRET`：在瀏覽器按 F12 開啟 Console，輸入 `crypto.randomUUID() + crypto.randomUUID()` 按 Enter，複製結果。下一步還會用到同一串。

## 第 7 步：設定 Database Webhook（有人檢舉 → 呼叫寄信函式）

1. 左側 **Database** → **Webhooks**（新版介面在 **Integrations → Database Webhooks**）。第一次使用要先按 **Enable webhooks**。
2. **Create a new hook**：
   - Name：`report-notify`
   - Table：**`reports`**
   - Events：只勾 **Insert**
   - Webhook configuration / Type：**Supabase Edge Functions**，選 `report-notify`，Method `POST`
   - HTTP Headers：新增一列
     - Name：`x-webhook-secret`
     - Value：和第 6 步 `WEBHOOK_SECRET` **完全相同**的那串
3. **Create webhook**。

## 第 8 步：測試

1. 打開網站，留一則測試留言 → 重新整理後應該還在（代表真的存進資料庫）。
2. 換一台裝置或手機網路打開網站，按那則留言的「檢舉」→ 送出。
3. 那則留言應該立刻從畫面消失；重新整理也看不到。
4. 幾秒內 `ADMIN_EMAIL` 應收到主旨為「【留言檢舉・已自動隱藏】…」的信。
5. 依照信中步驟刪掉測試留言（見 [MODERATION.md](MODERATION.md)）。

### 沒收到信？

- **Edge Functions → report-notify → Logs**：
  - `Unauthorized`：Webhook 的 `x-webhook-secret` 和 Secrets 的 `WEBHOOK_SECRET` 不一致。
  - `寄信失敗` + `Invalid login`：Gmail 應用程式密碼錯誤，或帳號沒開兩步驟驗證。
  - 完全沒有紀錄：檢查第 7 步 Webhook 的 Table 是否選 `reports`、Events 是否勾 Insert。
- 也看看 Gmail 的垃圾郵件匣。
- 同一台裝置對同一則留言只能檢舉一次；重複檢舉不會再寄信。

---

## 安全設計說明（給之後的維護者）

| 項目 | 做法 |
|---|---|
| 網頁拿到的權限 | 只有 publishable key；資料庫用 RLS + 欄位權限限制，只能讀「未隱藏留言」的公開欄位 |
| 寫入留言 | 只能透過 `submit_message()`：檢查長度、主題、留言區格式，移除控制字元 |
| 防洗版 | 同一來源 10 分鐘最多 10 則、全站每小時最多 300 則；表單有隱藏欄位擋機器人 |
| 檢舉 | 只能透過 `report_message()`：被檢舉的留言立即隱藏（管理員標記 `keep` 的除外）；同一來源同一則只算一次、同一來源 10 分鐘最多 5 次、全站每小時最多 30 次（= 通知信與自動下架的上限） |
| 訪客隱私 | 不存 IP，只存「加鹽 SHA-256 雜湊」用來限流；鹽值在不公開的 `private` schema，自動產生 |
| XSS | 所有留言都經過跳脫後才顯示；另有 Content-Security-Policy 只允許本站程式執行 |
| Gmail 密碼 | 只存在 Supabase Secrets；通知信為純文字 |

**調整限制**：在 `supabase/schema.sql` 搜尋 `per_source_limit`、`site_hourly_limit`，改數字後到 SQL Editor 重新執行整份檔案。

**已知限制**：檢舉即隱藏代表有心人可以讓正常留言暫時消失（受上述次數限制），管理員收到信後可一鍵恢復並標記 `keep`。另外，同一個 Wi-Fi（例如校園網路）的人可能共用同一個對外 IP，會一起計算「同一來源」的次數，所以預設值刻意不設太低。有心人可以更換網路繞過單一來源的限制，這時靠全站上限兜底；若真的遭到大量洗版，可暫時把 `js/config.js` 清空關閉留言板，再到後台清理。
