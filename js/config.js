// 留言板（Supabase）連線設定 —— 整個網站只有這裡需要填。
//
// 到 Supabase 專案 → Project Settings → API Keys 複製：
//   SUPABASE_URL：Project URL，例如 https://abcdefghijkl.supabase.co
//   SUPABASE_PUBLISHABLE_KEY：publishable key（sb_publishable_ 開頭；舊專案叫 anon key）
//
// publishable key 本來就是設計給網頁公開使用的，放在這裡安全；
// 權限由資料庫的 RLS 與函式控管（見 supabase/schema.sql）。
// ⚠️ 絕對不要把 secret key / service_role key 放進這個檔案或任何前端檔案。
//
// 兩個值留空時，留言板會停用並顯示示例留言，網站其他功能不受影響。

export const SUPABASE_URL = 'https://xjtsfgqltajcrctdkbcj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DHs_PqkXYqPPfEFlDy5fXw_tVUVb82c';
