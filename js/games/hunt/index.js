// 故事尋光：依訪客的觀展紀錄（走進幾個展間、幾種主題、是否收藏）顯示任務進度。

export default {
  id: 'hunt',
  icon: '⌖',
  card: {
    zh: { tag: 'A JOURNEY THROUGH STORIES', title: '故事尋光', text: '探訪不同家鄉，留下一段自己的觀展路線。', action: '出發尋光 · 3 個任務' },
    en: { tag: 'A JOURNEY THROUGH STORIES', title: 'Story Trail', text: 'Visit different hometowns and trace your own path through the exhibition.', action: 'Set off · 3 tasks' },
  },
  strings: {
    zh: {
      title: '下一盞光，會在哪裡？',
      intro: '回到地圖，自由探索。每次打開故事，都會在這個裝置留下旅程足跡。',
      taskRooms: '走進三個人物展間',
      taskThemes: '探索兩種故事主題',
      taskSave: '收藏一個喜歡的故事',
      done: '你已完成這段尋光旅程。還有更多故事，等你慢慢發現。',
      notYet: '完成任務後，回到這裡看看你的進度。',
      explore: '回地圖探索',
    },
    en: {
      title: 'Where will the next light be?',
      intro: 'Go back to the map and explore freely. Each story you open leaves a footprint on this device.',
      taskRooms: 'Visit three story rooms',
      taskThemes: 'Explore two story themes',
      taskSave: 'Save a story you love',
      done: "You've completed the trail. More stories are waiting for you.",
      notYet: 'Come back here after finishing the tasks to see your progress.',
      explore: 'Explore the map',
    },
  },
  styles: true,

  mount(root, ctx) {
    const { t } = ctx;
    const { stories } = ctx.content;
    const visited = ctx.progress.visited.filter(id => stories.some(s => s.id === id));
    const themes = new Set(stories.filter(s => visited.includes(s.id)).map(s => s.theme));
    const tasks = [
      { label: t('taskRooms'), value: Math.min(3, visited.length), max: 3 },
      { label: t('taskThemes'), value: Math.min(2, themes.size), max: 2 },
      { label: t('taskSave'), value: Math.min(1, ctx.progress.saved.length), max: 1 },
    ];
    const done = tasks.every(task => task.value === task.max);
    if (done) ctx.complete();
    root.innerHTML = `
      <p class="eyebrow">A JOURNEY THROUGH STORIES</p><h2>${t('title')}</h2><p>${t('intro')}</p>
      <ul class="hunt-list">${tasks.map(task => `<li>${task.value === task.max ? '✦' : '○'} ${task.label}<span>${task.value} / ${task.max}</span></li>`).join('')}</ul>
      <p class="game-status">${t(done ? 'done' : 'notYet')}</p>
      <button class="button gold" data-role="explore">${t('explore')}</button>`;
    root.querySelector('[data-role="explore"]').onclick = () => ctx.goTo('map');
  },
};
