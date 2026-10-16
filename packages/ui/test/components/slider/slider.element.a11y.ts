import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/slider/slider.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['default', ''],
  ['min max step', 'min="10" max="50" step="5"'],
  ['vertical', 'orientation="vertical"'],
  ['disabled', 'disabled'],
  ['destructive lg', 'variant="destructive" size="lg"'],
  ['range with name', 'default-value="25 75" name="vol"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-slider ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-slider aria-label="Volume" ${attrs}></rafters-slider></main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
