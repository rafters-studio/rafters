import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/radio-group/radio-group.element';

const SCENES: ReadonlyArray<[string, string, string]> = [
  ['none selected', '', ''],
  ['seeded selection', 'value="b"', ''],
  ['horizontal', 'orientation="horizontal"', ''],
  ['required', 'required', ''],
  ['disabled group', 'disabled', ''],
  ['disabled item', '', 'disabled'],
];

afterEach(() => {
  document.body.innerHTML = '';
});

for (const [name, attrs, itemA] of SCENES) {
  test(`radio-group.element ${name} has no axe violations`, async ({ task }) => {
    document.body.innerHTML =
      '<main>' +
      `<rafters-radio-group name="plan" aria-label="Plan" ${attrs}>` +
      `<div data-part="item" value="a" ${itemA}>A</div>` +
      '<div data-part="item" value="b">B</div>' +
      '</rafters-radio-group></main>';
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
