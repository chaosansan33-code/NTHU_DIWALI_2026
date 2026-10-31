// 互動工坊的遊戲清單 —— 新增 / 移除 / 調整順序只要改這個檔案。
// 每個遊戲是一個資料夾，規格見 js/games/README.md。

import rangoli from './rangoli/index.js';
import memory from './memory/index.js';
import quiz from './quiz/index.js';
import rhythm from './rhythm/index.js';
import hunt from './hunt/index.js';
import postcard from './postcard/index.js';

export const GAMES = [rangoli, memory, quiz, rhythm, hunt, postcard];
