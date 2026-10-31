// 瀏覽器本機儲存（收藏、遊戲進度、編輯草稿）。只存在訪客自己的瀏覽器。

const PREFIX = 'light-home:';

export const store = {
  read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },
};
