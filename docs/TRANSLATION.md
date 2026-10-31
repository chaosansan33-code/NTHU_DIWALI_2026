# 中英文內容與翻譯

網站右上角的 **EN / 中文** 按鈕切換語言（訪客的選擇會被記住；網址加 `?lang=en` 可直接開英文版）。

英文分兩部分：

| 內容 | 放在哪 | 怎麼改 |
|---|---|---|
| 展覽內容：首頁文字、人物故事、記憶抽屜、文化卡、問答、示例留言 | `data/content.json` 各物件裡的 `en` | 策展編輯頁的「English」模式，或請 AI 翻譯（見下方） |
| 介面文字：選單、按鈕、標題、提示訊息 | `js/i18n/strings.js` | 直接改檔案，zh 與 en 要有同一個 key |
| 小遊戲文字 | 各遊戲 `js/games/<id>/index.js` 的 `card` 與 `strings` | 見 `js/games/README.md` |

觀眾留言本身不翻譯。

## content.json 的 `en` 規則

任何含中文文字的物件，都可以有一個 `en` 子物件，**key 和中文相同、值是英文**。英文模式會用 `en` 的值覆蓋；沒填或空白的欄位自動顯示中文。

```json
{
  "id": "jaipur-memory",
  "name": "Aarav",
  "city": "齋浦爾",
  "quote": "想念的，是廚房裡忙碌的聲音。",
  "coordinates": [75.7873, 26.9124],
  "memories": [
    { "title": "一張食譜", "text": "……", "en": { "title": "A recipe", "text": "……" } }
  ],
  "en": { "name": "Aarav", "city": "Jaipur", "quote": "What I miss is the busy sound of the kitchen." }
}
```

會翻譯的欄位：

- `site.en`：`title`、`intro`、`about`、`eventText`
- 每位人物 `stories[].en`：`name`、`city`、`theme`、`quote`、`intro`、`body`、`taiwan`
- `stories[].memories[].en`：`title`、`text`；`stories[].photos[].en`：`caption`
- `culture[].en`：`title`、`subtitle`、`body`、`sourceLabel`
- `quiz[].en`：`question`、`options`（陣列，**數量要和中文相同、順序對應**）、`explanation`
- `messages[].en`（示例留言）：`name`、`message`

不要翻譯、也不要放進 `en` 的欄位：`id`、`coordinates`、`cityEn`、圖片／影片／音檔網址、`answer`、`demo`、`topic`、`version`。

注意：`site.en.title` 若與介面預設英文標題「Far from Home, We Light the Lamps Together」相同，首頁大標題會保留原本的排版；改成其他文字則直接顯示新標題。

## 方法一：在編輯頁填寫

1. 開啟策展編輯頁（路徑見 `README.md`），按上方「編輯語言 → English」。
2. 每個欄位上方灰色小字是中文原文，下方填英文。ID、座標、圖片等共用欄位在英文模式會隱藏。
3. 「儲存並預覽草稿」會直接開英文預覽；確認後「匯出網站內容」，用下載的檔案取代 `data/content.json`。

## 方法二：請 AI 翻譯整份檔案

1. 編輯頁按「匯出網站內容」，或直接用 repo 的 `data/content.json`。
2. 把檔案連同下面的 prompt 交給 AI（ChatGPT、Claude、Gemini 皆可）：

   ````text
   以下是一個網站的內容檔 content.json（繁體中文）。請幫我補齊英文翻譯：

   規則：
   1. 只新增或更新各物件裡的 "en" 子物件；"en" 的 key 必須和該物件的中文欄位 key 相同，值為英文翻譯。
   2. 需要翻譯的欄位：
      - site：title, intro, about, eventText
      - stories[]：name, city, theme, quote, intro, body, taiwan
      - stories[].memories[]：title, text
      - stories[].photos[]：caption
      - culture[]：title, subtitle, body, sourceLabel（sourceLabel 為空就不用）
      - quiz[]：question, options（陣列，數量與順序必須和中文 options 完全相同）, explanation
      - messages[]：name, message
   3. 不要修改、刪除或翻譯任何其他欄位（id、coordinates、cityEn、網址、answer、demo、topic、version 等保持原樣）。
   4. 人名維持原本的拼寫；城市用常見英文名稱（例如 齋浦爾 → Jaipur）。
   5. 文字中的換行 \n 請保留相同的段落結構。
   6. 語氣：溫暖、簡潔、適合展覽說明的自然英文，不要逐字直譯。
   7. 只輸出完整、有效的 JSON（不要加說明文字或 Markdown 標記），以便我直接存檔。

   content.json：
   （貼上檔案內容）
   ````

3. 把 AI 的輸出存成 `content.json`，到編輯頁按「匯入內容檔」。**能成功匯入就代表格式正確**（若英文選項數量不對等，會顯示錯誤原因）。
4. 切換「English」模式逐頁檢查，預覽無誤後「匯出網站內容」，取代 `data/content.json`。

> 建議請熟悉內容的人至少看過一次人物故事的英文，確認語氣與事實，特別是真實受訪者的引言。
