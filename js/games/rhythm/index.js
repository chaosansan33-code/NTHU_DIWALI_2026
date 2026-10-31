// 光的節奏：記住光點亮起的順序並重複，共 5 關。音效用 Web Audio 即時合成。

const NOTES = [261.63, 329.63, 392, 523.25];
const LEVELS = 5;

export default {
  id: 'rhythm',
  icon: '♫',
  card: {
    zh: { tag: 'FOLLOW THE LIGHT', title: '光的節奏', text: '記住亮起的順序，回應一段光與聲音。', action: '挑戰記憶 · 5 個關卡' },
    en: { tag: 'FOLLOW THE LIGHT', title: 'Rhythm of Light', text: 'Remember the order the lights glow and echo it back.', action: 'Take the challenge · 5 levels' },
  },
  strings: {
    zh: {
      title: '聽見光的節奏。',
      intro: '按開始後，記住光點亮起的順序，再依序點選。共五關。聲音為合成遊戲音效，不是印度傳統音樂；靜音也可以玩。',
      start: '開始挑戰',
      mute: '靜音',
      pad: '光點 {index}',
      ready: '準備好，跟著光一起記憶。',
      watch: '第 {level} / {total} 關 · 看仔細……',
      yourTurn: '第 {level} / {total} 關 · 換你了！',
      failed: '停在第 {level} 關。再試一次，慢慢來。',
      retry: '再試一次',
      won: '五關完成！你記住了整段光的節奏。',
      again: '再玩一次',
    },
    en: {
      title: 'Hear the rhythm of light.',
      intro: 'Press start, watch the order in which the lights glow, then tap them in the same order. Five levels. The sounds are synthesized game tones, not traditional Indian music — you can also play muted.',
      start: 'Start',
      mute: 'Mute',
      pad: 'Light {index}',
      ready: 'Get ready to follow the light.',
      watch: 'Level {level} / {total} · watch closely…',
      yourTurn: 'Level {level} / {total} · your turn!',
      failed: 'Stopped at level {level}. Take your time and try again.',
      retry: 'Try again',
      won: 'All five levels! You remembered the whole rhythm.',
      again: 'Play again',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    root.innerHTML = `
      <p class="eyebrow">FOLLOW THE LIGHT</p><h2>${t('title')}</h2><p>${t('intro')}</p>
      <div class="activity-toolbar"><button data-role="start" class="gold">${t('start')}</button><label><input data-role="mute" type="checkbox" style="width:auto">${t('mute')}</label></div>
      <div class="sound-pads">${['①', '②', '③', '④'].map((x, i) => `<button data-pad="${i}" aria-label="${t('pad', { index: i + 1 })}" disabled>${x}</button>`).join('')}</div>
      <p class="game-status" data-role="status">${t('ready')}</p>`;

    const $ = selector => root.querySelector(selector);
    const pads = [...root.querySelectorAll('[data-pad]')];
    const startButton = $('[data-role="start"]');
    const status = $('[data-role="status"]');
    let audio = null;
    let sequence = [];
    let input = 0;
    let level = 0;
    let playing = false;
    let alive = true;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

    const beep = n => {
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume();
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.frequency.value = NOTES[n];
        o.type = 'sine';
        g.gain.setValueAtTime(0.001, audio.currentTime);
        g.gain.exponentialRampToValueAtTime(0.13, audio.currentTime + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.32);
        o.connect(g);
        g.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + 0.35);
      } catch {}
    };
    const light = n => {
      pads[n].classList.add('lit');
      later(() => pads[n].classList.remove('lit'), 360);
      if (!$('[data-role="mute"]').checked) beep(n);
    };
    const setPads = disabled => pads.forEach(b => (b.disabled = disabled));
    const round = () => {
      level++;
      input = 0;
      sequence.push(Math.floor(Math.random() * 4));
      playing = true;
      setPads(true);
      status.textContent = t('watch', { level, total: LEVELS });
      sequence.forEach((n, i) => later(() => light(n), i * 650 + 450));
      later(
        () => {
          playing = false;
          setPads(false);
          status.textContent = t('yourTurn', { level, total: LEVELS });
        },
        sequence.length * 650 + 450,
      );
    };

    startButton.onclick = () => {
      sequence = [];
      level = 0;
      startButton.disabled = true;
      round();
    };
    pads.forEach(
      b =>
        (b.onclick = () => {
          if (playing) return;
          const n = +b.dataset.pad;
          light(n);
          if (sequence[input] !== n) {
            status.textContent = t('failed', { level });
            setPads(true);
            startButton.disabled = false;
            startButton.textContent = t('retry');
            return;
          }
          input++;
          if (input === sequence.length) {
            playing = true;
            setPads(true);
            if (level === LEVELS) {
              status.textContent = t('won');
              ctx.complete();
              startButton.disabled = false;
              startButton.textContent = t('again');
            } else later(round, 750);
          }
        }),
    );

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      audio?.close();
    };
  },
};
