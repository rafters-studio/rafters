import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/image/image.element';

/** A 1x1 transparent GIF: no network, no layout surprises. */
const SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-image src="${SRC}" ${attrs}></rafters-image></main>`;
  await Promise.resolve(); // the element builds and binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['loaded', 'alt="A sunset over the ocean"'],
  ['loading', 'alt="Loading photo" data-status="loading"'],
  ['error', 'alt="Broken" data-status="error"'],
  ['error with custom message', 'alt="Broken" data-status="error" data-error-message="Gone"'],
  ['loading with custom label', 'alt="Photo" data-status="loading" data-loading-label="Wait"'],
  ['with caption', 'alt="Photo" caption="Photo by John"'],
  [
    'sized, left aligned, rounded',
    'alt="Photo" data-size="md" data-alignment="left" data-radius="2xl"',
  ],
  // No alt attribute: the element defaults the img to alt="" (decorative).
  ['decorative without alt', ''],
];

for (const [name, attrs] of scenes) {
  test(`rafters-image ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
