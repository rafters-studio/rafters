import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/button/button.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['idle', ''],
  ['loading', 'aria-busy="true"'],
  ['soft-disabled', 'aria-disabled="true"'],
  ['toggle', 'aria-pressed="false"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-button ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-button><button data-part="root" type="button" ${attrs}><span data-part="label">Save</span></button></rafters-button></main>`;
    await Promise.resolve();
    await Promise.resolve();
    const results = await runAxe(document.body.querySelector('main') as HTMLElement);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
