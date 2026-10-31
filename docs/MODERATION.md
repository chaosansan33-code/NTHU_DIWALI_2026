# 留言管理（刪除、隱藏、查看檢舉）

留言送出後會立即公開。

**有人按「檢舉」時，該留言會立刻自動隱藏**（網站上看不到），同時寄「【留言檢舉】」通知信給管理員。這是為了讓問題留言最快下架；代價是任何人都能先讓一則留言消失，所以**每封通知信都請看一下**，再決定：

| 判斷 | 做法 |
|---|---|
| 確實違規 | 刪除該留言（或維持隱藏） |
| 檢舉不成立 | 恢復顯示，並勾 `keep` —— 之後再被檢舉只會寄信，不會自動隱藏 |

標記 `keep` 的留言之後再被檢舉時，訪客會看到「這則留言已經過管理員確認，會繼續保留。你的意見已轉給管理員。」，留言不會消失，管理員仍會收到通知信。

自己在網站上看到不當留言時，直接按「檢舉」就能立即下架。

## 方法一：用表格介面（最簡單）

1. 登入 <https://supabase.com/dashboard>，進入專案。
2. 左側 **Table Editor** → 選 **`messages`**。
3. 找到要處理的留言（可以用上方 Filter 依 `id` 或 `name` 篩選；通知信裡有留言的 `id`）。
4. 擇一：
   - **刪除**：勾選那一列 → **Delete**。相關檢舉紀錄會一起刪除。
   - **維持隱藏**（保留紀錄）：被檢舉的留言 `hidden` 已經是 `true`，不用動。
   - **恢復顯示**：把 `hidden` 改成 `false`，並把 `keep` 改成 `true` → Save。

網站重新整理後就會生效。

## 方法二：用 SQL

左側 **SQL Editor** → New query，貼上後 Run：

```sql
-- 刪除一則留言（id 從通知信複製）
delete from public.messages where id = '貼上留言 id';

-- 手動隱藏
update public.messages set hidden = true where id = '貼上留言 id';

-- 檢舉不成立：恢復顯示，並標記 keep（之後再被檢舉不會自動隱藏）
update public.messages set hidden = false, keep = true where id = '貼上留言 id';

-- 被惡意大量檢舉時：一次恢復最近 1 小時內因檢舉而隱藏的留言（先確認名單再執行）
select m.id, m.name, m.message from public.messages m
where m.hidden and exists (select 1 from public.reports r where r.message_id = m.id and r.created_at > now() - interval '1 hour');
update public.messages m set hidden = false
where m.hidden and exists (select 1 from public.reports r where r.message_id = m.id and r.created_at > now() - interval '1 hour');

-- 看最近的檢舉，以及每則被檢舉幾次
select m.id, m.name, m.message, m.hidden, count(r.id) as 檢舉次數, max(r.created_at) as 最近檢舉
from public.reports r join public.messages m on m.id = r.message_id
group by m.id
order by 最近檢舉 desc;

-- 看最新 50 則留言（包含已隱藏）
select id, thread, topic, name, message, hidden, created_at
from public.messages order by created_at desc limit 50;

-- 被洗版時：刪除最近 30 分鐘內、同一個來源送出的所有留言
-- （先用上一段查出可疑留言的 id，填進下面）
delete from public.messages
where author_hash = (select author_hash from public.messages where id = '可疑留言 id')
  and created_at > now() - interval '30 minutes';
```

## 緊急關閉留言板

把 `js/config.js` 的兩個值改回空字串 `''` 並 push。網站會顯示示例留言、表單停用；資料庫裡的留言不受影響，改回來就恢復。

## 欄位說明（`messages` 表）

| 欄位 | 意思 |
|---|---|
| `thread` | `wall` = 首頁留言牆；`story:jaipur-memory` = Aarav 的展間（冒號後是人物 ID） |
| `topic` | 首頁留言的主題（祝福／家的記憶／提問）；人物展間留言為空 |
| `name`、`message` | 暱稱、內容 |
| `hidden` | `true` 時網站不顯示（被檢舉時自動變成 `true`） |
| `keep` | 管理員確認沒問題後設 `true`：之後被檢舉只寄信，不自動隱藏 |
| `author_hash` | 留言來源的雜湊，用來限制頻率，無法反推出 IP |

> 注意：人物 ID（在策展編輯頁可改）是留言對應的依據。如果改了某位人物的 ID，舊留言不會跟著過去。
