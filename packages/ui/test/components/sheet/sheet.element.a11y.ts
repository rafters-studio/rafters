import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/sheet/sheet.element';
import { sheetContentClasses } from '../../../src/components/sheet/sheet.classes';

const scenes: ReadonlyArray<[string, string, boolean]> = [
  ['closed modal', '', false],
  ['open modal', '', true],
  ['closed non-modal', 'modal="false"', false],
  ['open non-modal', 'modal="false"', true],
];

for (const [name, attrs, open] of scenes) {
  test(`sheet.element ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>
      <rafters-sheet ${attrs}>
        <button type="button" data-part="trigger" id="s-trigger">Open filters</button>
        <div data-part="overlay" id="s-overlay" hidden></div>
        <div data-part="content" id="s-content" data-side="right" class="${sheetContentClasses('right')}" tabindex="-1" hidden>
          <h2 data-part="title" id="s-title">Filters</h2>
          <button type="button">Apply</button>
          <button type="button" data-part="close" id="s-close">Close</button>
        </div>
      </rafters-sheet></main>`;
    await Promise.resolve();
    if (open) document.getElementById('s-trigger')?.click();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
    document.body.innerHTML = '';
  });
}
