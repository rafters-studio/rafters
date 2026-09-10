import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/avatar/avatar.element';
import { AVATAR_SIZES } from '../../../src/components/avatar/avatar.behavior';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function mount(attrs: string, slot: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-avatar ${attrs}>${slot}</rafters-avatar></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

for (const size of AVATAR_SIZES) {
  test(`rafters-avatar size=${size}`, async ({ task }) => {
    const host = mount(`size="${size}" src="${PIXEL}" alt="Jane Doe"`, 'JD');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const scenes: ReadonlyArray<[string, string, string]> = [
  ['loaded image', `src="${PIXEL}" alt="Jane Doe"`, ''],
  [
    'loading: image and fallback both present',
    `src="${PIXEL}" status="loading" alt="Jane Doe"`,
    'JD',
  ],
  ['error: fallback only', `src="${PIXEL}" status="error"`, 'JD'],
  ['no src: fallback slot', '', 'JD'],
  ['decorative, hidden from assistive tech', `aria-hidden="true" src="${PIXEL}" alt=""`, 'AI'],
];

for (const [name, attrs, slot] of scenes) {
  test(`rafters-avatar ${name}`, async ({ task }) => {
    const host = mount(attrs, slot);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
