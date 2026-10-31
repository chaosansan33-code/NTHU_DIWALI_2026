// 一封光的明信片：輸入收件人、心意與署名，即時預覽並下載 1400×900 PNG。

function drawPostcard({ to, message, from, footer }) {
  const c = document.createElement('canvas');
  c.width = 1400;
  c.height = 900;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(1000, 850, 30, 700, 500, 1000);
  g.addColorStop(0, '#76503b');
  g.addColorStop(1, '#151c2c');
  x.fillStyle = g;
  x.fillRect(0, 0, 1400, 900);
  x.strokeStyle = '#c5a477';
  x.lineWidth = 2;
  x.strokeRect(45, 45, 1310, 810);
  x.textAlign = 'center';
  x.fillStyle = '#eac18c';
  x.font = '23px sans-serif';
  x.fillText('LIGHT ACROSS HOME', 700, 140);
  x.font = '42px serif';
  x.fillText(to, 700, 250, 1150);
  x.fillStyle = '#f2e8dc';
  x.font = '34px serif';
  // 逐字換行，避免超出明信片寬度（英文也適用，只是可能在單字中間換行）
  const lines = [];
  for (const para of message.split('\n')) {
    let line = '';
    for (const ch of para) {
      if (x.measureText(line + ch).width > 1080) {
        lines.push(line);
        line = ch;
      } else line += ch;
    }
    lines.push(line);
  }
  const start = 400 - Math.max(0, lines.length - 2) * 20;
  lines.forEach((line, i) => x.fillText(line, 700, start + i * 55));
  x.font = '24px sans-serif';
  x.fillStyle = '#d9c7b0';
  x.fillText(from, 700, 730, 1100);
  x.font = '18px sans-serif';
  x.fillText(footer, 700, 800);
  return c;
}

export default {
  id: 'postcard',
  icon: '✧',
  card: {
    zh: { tag: 'A NOTE TO SOMEONE', title: '一封光的明信片', text: '寫給想念的人，把一點溫暖帶走。', action: '寫張明信片 · 可下載' },
    en: { tag: 'A NOTE TO SOMEONE', title: 'A Postcard of Light', text: 'Write to someone you miss and take a little warmth with you.', action: 'Write a postcard · downloadable' },
  },
  strings: {
    zh: {
      title: '把一點光，寄給想念的人。',
      toLabel: '想寫給誰',
      toDefault: '給遠方的你',
      messageLabel: '你的心意',
      messageDefault: '願我們相隔再遠，也總有一起點燈的時刻。',
      fromLabel: '署名',
      fromPlaceholder: '你的名字',
      download: '下載明信片 PNG',
      footer: '離家以後，我們一起點燈。',
    },
    en: {
      title: 'Send a little light to someone you miss.',
      toLabel: 'To',
      toDefault: 'To you, far away',
      messageLabel: 'Your message',
      messageDefault: 'However far apart we are, may there always be a moment when we light the lamps together.',
      fromLabel: 'From',
      fromPlaceholder: 'Your name',
      download: 'Download postcard (PNG)',
      footer: 'Far from home, we light the lamps together.',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    root.innerHTML = `
      <p class="eyebrow">A NOTE TO SOMEONE</p><h2>${t('title')}</h2>
      <label>${t('toLabel')}<input data-role="to" maxlength="30" placeholder="${t('toDefault')}" value="${t('toDefault')}"></label>
      <label>${t('messageLabel')}<textarea data-role="message" maxlength="120" rows="3">${t('messageDefault')}</textarea></label>
      <label>${t('fromLabel')}<input data-role="from" maxlength="25" placeholder="${t('fromPlaceholder')}"></label>
      <div class="postcard-preview"><p class="eyebrow">LIGHT ACROSS HOME</p><h3 data-role="preview-to"></h3><p data-role="preview-message"></p><small data-role="preview-from"></small></div>
      <button class="button gold" data-role="download">${t('download')}</button>`;

    const field = role => root.querySelector(`[data-role="${role}"]`);
    const values = () => ({ to: field('to').value, message: field('message').value, from: field('from').value, footer: t('footer') });
    const update = () => {
      const v = values();
      field('preview-to').textContent = v.to;
      field('preview-message').textContent = v.message;
      field('preview-from').textContent = v.from;
    };
    ['to', 'message', 'from'].forEach(role => (field(role).oninput = update));
    update();
    field('download').onclick = () =>
      drawPostcard(values()).toBlob(blob => {
        ctx.download('a-little-light.png', blob, 'image/png');
        ctx.complete();
      });
  },
};
