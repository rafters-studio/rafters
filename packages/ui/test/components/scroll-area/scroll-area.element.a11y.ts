import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/scroll-area/scroll-area.element';

// Content includes a focusable element: scroll-area.md records the
// scrollable-region-focusable gap for content with nothing focusable.
const scenes: ReadonlyArray<[string, string]> = [
  [
    'vertical',
    '<rafters-scroll-area><a href="#x">Focusable</a><p>Content</p></rafters-scroll-area>',
  ],
  [
    'horizontal',
    '<rafters-scroll-area orientation="horizontal"><button type="button">Focusable</button></rafters-scroll-area>',
  ],
  [
    'both',
    '<rafters-scroll-area orientation="both"><a href="#x">Focusable</a></rafters-scroll-area>',
  ],
];

for (const [name, html] of scenes) {
  test(`rafters-scroll-area ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>${html}</main>`;
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
