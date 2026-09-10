import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Avatar from '../../../src/components/avatar/avatar.astro';
import { AVATAR_SIZES } from '../../../src/components/avatar/avatar.behavior';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Avatar, { props, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // Avatar is a caller-decides static: no bindAvatar exists, so nothing to hydrate.
  return document;
}

for (const size of AVATAR_SIZES) {
  test(`avatar.astro size=${size}`, async ({ task }) => {
    const document = await mount({ size, src: '/user.jpg', alt: 'Jane Doe' });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, Record<string, string>]> = [
  ['loaded image', { src: '/user.jpg', alt: 'Jane Doe' }, {}],
  [
    'loading: image and fallback both present',
    { src: '/user.jpg', alt: 'Jane Doe', status: 'loading', fallback: 'JD' },
    {},
  ],
  ['error: fallback only', { src: '/user.jpg', status: 'error', fallback: 'JD' }, {}],
  ['no src: fallback text', { fallback: 'JD' }, {}],
  ['no src: fallback slot', {}, { default: 'JD' }],
  [
    'decorative, hidden from assistive tech',
    { src: '/bot.png', alt: '', 'aria-hidden': 'true' },
    {},
  ],
];

for (const [name, props, slots] of scenes) {
  test(`avatar.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
