// 文化好奇心問答：題目來自 data/content.json 的 quiz（可在策展編輯頁修改，英文放 en）。

export default {
  id: 'quiz',
  icon: '?',
  card: {
    zh: { tag: 'A LITTLE CURIOSITY', title: '文化好奇心', text: '從三個小問題，練習用好奇心靠近彼此。', action: '開始探索 · 3 道題目' },
    en: { tag: 'A LITTLE CURIOSITY', title: 'Cultural Curiosity', text: 'Three small questions to practice getting closer through curiosity.', action: 'Start · 3 questions' },
  },
  strings: {
    zh: {
      correct: '答對了。',
      wrong: '換個角度想想。',
      next: '下一題',
      doneTitle: '帶著好奇，繼續認識彼此。',
      doneText: '你答對了 {score} / {total} 題。每一個故事，都值得多問一句、多聽一點。',
      again: '再玩一次',
    },
    en: {
      correct: 'Correct. ',
      wrong: 'Try looking at it another way. ',
      next: 'Next question',
      doneTitle: 'Stay curious and keep getting to know each other.',
      doneText: 'You got {score} / {total}. Every story deserves one more question and a little more listening.',
      again: 'Play again',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t, escapeHTML: e } = ctx;
    const quiz = ctx.content.quiz;
    let index = 0;
    let score = 0;

    const renderDone = () => {
      ctx.complete();
      root.innerHTML = `<p class="eyebrow">CURIOSITY COMPLETED</p><h2>${t('doneTitle')}</h2><p>${t('doneText', { score, total: quiz.length })}</p><button class="button gold" data-role="again">${t('again')}</button>`;
      root.querySelector('[data-role="again"]').onclick = ctx.restart;
    };

    const render = () => {
      if (index >= quiz.length) return renderDone();
      const q = quiz[index];
      root.innerHTML = `
        <p class="eyebrow">A LITTLE CURIOSITY · ${index + 1} / ${quiz.length}</p><h2>${e(q.question)}</h2>
        <div class="question-options">${q.options.map((o, i) => `<button data-answer="${i}">${e(o)}</button>`).join('')}</div>
        <p class="game-status" data-role="feedback"></p>
        <button class="button gold" data-role="next" hidden>${t('next')}</button>`;
      const options = root.querySelectorAll('[data-answer]');
      options.forEach(
        b =>
          (b.onclick = () => {
            const correct = +b.dataset.answer === q.answer;
            if (correct) score++;
            options.forEach(o => {
              o.disabled = true;
              if (+o.dataset.answer === q.answer) o.classList.add('correct');
            });
            if (!correct) b.classList.add('wrong');
            root.querySelector('[data-role="feedback"]').textContent = t(correct ? 'correct' : 'wrong') + q.explanation;
            root.querySelector('[data-role="next"]').hidden = false;
          }),
      );
      root.querySelector('[data-role="next"]').onclick = () => {
        index++;
        render();
      };
    };
    render();
  },
};
