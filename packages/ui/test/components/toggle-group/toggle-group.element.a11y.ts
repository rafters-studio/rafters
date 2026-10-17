import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/toggle-group/toggle-group.element';

afterEach(() => {
  document.body.innerHTML = '';
});

const ITEMS =
  '<span data-part="item" value="bold">Bold</span>' +
  '<span data-part="item" value="italic">Italic</span>';

const DISABLED_ITEM =
  '<span data-part="item" value="bold" disabled>Bold</span>' +
  '<span data-part="item" value="italic">Italic</span>';

const scenarios: Array<[string, string, string]> = [
  ['none pressed', '', ITEMS],
  ['seeded single', 'value="italic"', ITEMS],
  ['multiple', 'type="multiple" value="bold,italic"', ITEMS],
  ['outline lg', 'variant="outline" size="lg"', ITEMS],
  ['vertical', 'orientation="vertical"', ITEMS],
  ['disabled group', 'disabled', ITEMS],
  ['disabled item', '', DISABLED_ITEM],
];

for (const [name, attrs, items] of scenarios) {
  test(`toggle-group.element ${name} has no axe violations`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-toggle-group aria-label="Format" ${attrs}>${items}</rafters-toggle-group></main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
