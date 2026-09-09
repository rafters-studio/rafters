import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/aspect-ratio/aspect-ratio.element';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const PHOTO = `<img src="${PIXEL}" alt="A descriptive alt" />`;
const DECORATIVE = `<img src="${PIXEL}" alt="" />`;
const TEXT = '<div>Video placeholder</div>';

function mount(attrs: string, slot: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-aspect-ratio ${attrs}>${slot}</rafters-aspect-ratio></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string, string]> = [
  ['default square with a photo', '', PHOTO],
  ['16/9 with a photo', 'ratio="16/9"', PHOTO],
  ['4/3 with a photo', 'ratio="4/3"', PHOTO],
  ['square with a decorative image', 'ratio="1"', DECORATIVE],
  ['16/9 with text content', 'ratio="16/9"', TEXT],
];

for (const [name, attrs, slot] of scenes) {
  test(`rafters-aspect-ratio ${name}`, async ({ task }) => {
    const host = mount(attrs, slot);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
