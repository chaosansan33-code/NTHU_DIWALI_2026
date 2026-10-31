// Rangoli 對稱上色創作：點圖形上色，可整圈同色或自由配色，可下載 SVG。

const COLORS = ['#c77a62', '#b99963', '#606f92', '#bea6af'];

export default {
  id: 'rangoli',
  icon: '✳',
  card: {
    zh: { tag: 'COLOR & CREATE', title: 'Rangoli 創作', text: '選一種顏色，畫出屬於你的對稱圖案。', action: '開始創作 · 可下載作品' },
    en: { tag: 'COLOR & CREATE', title: 'Rangoli Studio', text: 'Pick a color and paint your own symmetrical pattern.', action: 'Start creating · downloadable' },
  },
  strings: {
    zh: {
      title: '一圈一圈，把心意畫出來。',
      intro: '選擇顏色，點選圖形上色。同一圈會一起改變，也可以切換自由配色。這是對稱幾何創作示範；正式圖樣可由共同策展者提供。',
      color: '顏色',
      mode: '模式',
      ring: '對稱配色',
      single: '自由配色',
      reset: '重設',
      save: '下載作品',
      canvas: '可上色的對稱幾何畫布',
      tile: '第 {ring} 圈，第 {index} 個圖形',
      hint: '用鍵盤 Tab 選擇圖形，按 Enter 也能上色。',
      saved: '已保存此裝置上的創作進度。',
      downloaded: '作品已下載',
    },
    en: {
      title: 'Ring by ring, draw what you feel.',
      intro: 'Choose a color and tap a shape to paint it. A whole ring changes together, or switch to free painting. This is a sample geometric design; final patterns can come from the co-curators.',
      color: 'Color',
      mode: 'Mode',
      ring: 'Symmetrical',
      single: 'Free painting',
      reset: 'Reset',
      save: 'Download',
      canvas: 'Symmetrical pattern canvas you can paint',
      tile: 'Ring {ring}, shape {index}',
      hint: 'Use Tab to choose a shape and press Enter to paint it.',
      saved: 'Your artwork is saved on this device.',
      downloaded: 'Artwork downloaded',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    const saved = ctx.store.read('art', {});

    let tiles = '';
    for (let ring = 0; ring < 4; ring++) {
      const count = (ring + 1) * 8;
      const r = 40 + ring * 52;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const x = 250 + Math.cos(a) * r;
        const y = 250 + Math.sin(a) * r;
        const id = `${ring}-${i}`;
        tiles += `<ellipse class="tile" tabindex="0" role="button" aria-label="${t('tile', { ring: ring + 1, index: i + 1 })}" data-ring="${ring}" data-tile="${id}" cx="${x}" cy="${y}" rx="${16 - ring}" ry="23" transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})" fill="${ctx.escapeHTML(saved[id] || COLORS[ring])}" stroke="#151c2b" stroke-width="2"/>`;
      }
    }

    root.innerHTML = `
      <p class="eyebrow">COLOR & CREATE</p><h2>${t('title')}</h2><p>${t('intro')}</p>
      <div class="activity-toolbar">
        <label>${t('color')}<input data-role="color" type="color" value="#eac18c"></label>
        <label>${t('mode')}<select data-role="mode"><option value="ring">${t('ring')}</option><option value="single">${t('single')}</option></select></label>
        <button data-role="reset">${t('reset')}</button><button data-role="save" class="gold">${t('save')}</button>
      </div>
      <svg class="rangoli-canvas" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${t('canvas')}">
        <circle cx="250" cy="250" r="244" fill="#151c2b"/><circle cx="250" cy="250" r="231" fill="none" stroke="#eac18c55"/>
        ${tiles}
        <circle cx="250" cy="250" r="12" fill="#eac18c"/>
      </svg>
      <p class="game-status" data-role="status">${t('hint')}</p>`;

    const $ = selector => root.querySelector(selector);
    const svg = $('.rangoli-canvas');

    const paint = tile => {
      const color = $('[data-role="color"]').value;
      const targets = $('[data-role="mode"]').value === 'ring' ? svg.querySelectorAll(`[data-ring="${tile.dataset.ring}"]`) : [tile];
      targets.forEach(el => {
        el.setAttribute('fill', color);
        saved[el.dataset.tile] = color;
      });
      ctx.store.write('art', saved);
      ctx.complete();
      $('[data-role="status"]').textContent = t('saved');
    };
    svg.querySelectorAll('.tile').forEach(tile => {
      tile.onclick = () => paint(tile);
      tile.onkeydown = ev => {
        if (['Enter', ' '].includes(ev.key)) {
          ev.preventDefault();
          paint(tile);
        }
      };
    });
    $('[data-role="reset"]').onclick = () => {
      ctx.store.remove('art');
      ctx.restart();
    };
    $('[data-role="save"]').onclick = () => {
      const copy = svg.cloneNode(true);
      copy.setAttribute('width', '1000');
      copy.setAttribute('height', '1000');
      ctx.download('my-rangoli.svg', new XMLSerializer().serializeToString(copy), 'image/svg+xml');
      ctx.complete();
      ctx.toast(t('downloaded'));
    };
  },
};
