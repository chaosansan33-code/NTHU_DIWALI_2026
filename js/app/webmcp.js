// 讓支援 WebMCP 的瀏覽器助理可以列出、開啟故事（不支援的瀏覽器會直接略過）。

import { $ } from '../lib/dom.js';
import { state } from './state.js';
import { openStory } from './stories.js';

export function registerExhibitTools() {
  if (!document.modelContext?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const tools = [
    {
      name: 'list_exhibition_stories',
      description: 'List the available exhibition stories and their public titles.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({
        stories: state.content.stories.map(s => ({ id: s.id, name: s.name, city: s.city, theme: s.theme, demo: s.demo })),
      }),
    },
    {
      name: 'open_exhibition_story',
      description: 'Open a named story in the visible exhibition. This records a visit in this browser only.',
      inputSchema: {
        type: 'object',
        properties: { storyId: { type: 'string' } },
        required: ['storyId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: input => {
        if (!input || typeof input.storyId !== 'string' || !state.content.stories.some(s => s.id === input.storyId))
          throw Error('Unknown story ID');
        if ($('#activity-dialog').open) $('#activity-dialog').close();
        openStory(input.storyId);
        return { opened: input.storyId, localVisitRecorded: true };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
    } catch {}
  }
}
