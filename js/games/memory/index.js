// 記憶翻翻卡：翻開兩張找相同的記憶物件，共 6 組。卡面是 images/ 裡的 SVG 圖片。

// key 對應 strings 裡的物件名稱（作為圖片的替代文字），image 是 images/ 下的檔名
const ITEMS = [
  { key: 'lamp', image: 'images/lamp.svg' },
  { key: 'recipe', image: 'images/recipe.svg' },
  { key: 'photo', image: 'images/photo.svg' },
  { key: 'letter', image: 'images/letter.svg' },
  { key: 'suitcase', image: 'images/suitcase.svg' },
  { key: 'table', image: 'images/table.svg' },
];

export default {
  id: 'memory',
  icon: '▧',
  card: {
    zh: { tag: 'FIND THE PAIRS', title: '記憶翻翻卡', text: '翻開卡片，找到六組故事裡的記憶物件。', action: '翻開記憶 · 約 2 分鐘' },
    en: { tag: 'FIND THE PAIRS', title: 'Memory Pairs', text: 'Flip the cards to find six pairs of objects from the stories.', action: 'Flip cards · about 2 min' },
  },
  strings: {
    zh: {
      lamp: '燈',
      recipe: '食譜',
      photo: '合照',
      letter: '信',
      suitcase: '行李',
      table: '餐桌',
      title: '把散落的記憶，慢慢找回。',
      intro: '每次翻開兩張，找到相同的物件。這些物件也是你可以在採訪時使用的故事入口。',
      cardHidden: '第 {index} 張，未翻開',
      hidden: '未翻開的卡片',
      status: '已找到 {matches} / {total} 組 · 翻牌 {moves} 次',
      allFound: ' · 所有記憶都找回來了！',
      again: '重新開始',
    },
    en: {
      lamp: 'Lamp',
      recipe: 'Recipe',
      photo: 'Photo',
      letter: 'Letter',
      suitcase: 'Suitcase',
      table: 'Dining table',
      title: 'Gather the scattered memories, one by one.',
      intro: 'Flip two cards at a time to find matching objects. Each one can also open a conversation in an interview.',
      cardHidden: 'Card {index}, face down',
      hidden: 'Face-down card',
      status: 'Found {matches} / {total} pairs · {moves} moves',
      allFound: ' · Every memory is back!',
      again: 'Play again',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    const total = ITEMS.length;
    const cards = ITEMS.flatMap((item, id) => [
      { ...item, id },
      { ...item, id },
    ]);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    root.innerHTML = `
      <p class="eyebrow">FIND THE PAIRS</p><h2>${t('title')}</h2><p>${t('intro')}</p>
      <div class="memory-board">${cards.map((c, i) => `<button class="memory-tile" data-card="${i}" aria-label="${t('cardHidden', { index: i + 1 })}">✦</button>`).join('')}</div>
      <p class="game-status" data-role="status"></p>
      <button data-role="again">${t('again')}</button>`;

    // 卡面圖片：先預載，翻牌時不會閃一下
    const faces = ITEMS.map(item => {
      const img = new Image();
      img.src = ctx.asset(item.image);
      return img;
    });
    const showFace = (tile, card) => {
      tile.innerHTML = `<img class="memory-face" src="${faces[card.id].src}" alt="${t(card.key)}">`;
      tile.setAttribute('aria-label', t(card.key));
    };
    const showBack = tile => {
      tile.textContent = '✦';
      tile.setAttribute('aria-label', t('hidden'));
    };

    let first = null;
    let locked = false;
    let matches = 0;
    let moves = 0;
    let timer;
    const status = root.querySelector('[data-role="status"]');
    const update = () => (status.textContent = t('status', { matches, total, moves }) + (matches === total ? t('allFound') : ''));
    update();

    root.querySelectorAll('[data-card]').forEach(
      b =>
        (b.onclick = () => {
          if (locked || b === first || b.classList.contains('matched')) return;
          const c = cards[+b.dataset.card];
          showFace(b, c);
          b.classList.add('revealed');
          if (!first) {
            first = b;
            return;
          }
          moves++;
          if (cards[+first.dataset.card].id === c.id) {
            [first, b].forEach(tile => {
              tile.classList.add('matched');
              tile.disabled = true;
            });
            first = null;
            matches++;
            if (matches === total) ctx.complete();
          } else {
            locked = true;
            const prev = first;
            timer = setTimeout(() => {
              [prev, b].forEach(tile => {
                showBack(tile);
                tile.classList.remove('revealed');
              });
              first = null;
              locked = false;
            }, 850);
          }
          update();
        }),
    );
    root.querySelector('[data-role="again"]').onclick = ctx.restart;
    return () => clearTimeout(timer);
  },
};
