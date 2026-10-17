import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input-group/input-group.element';

const input = '<input id="amount" aria-label="Amount">';
const both = `<div data-part="addonStart">$</div>${input}<div data-part="addonEnd">USD</div>`;

const scenes: ReadonlyArray<[string, string, string]> = [
  ['valid with both affixes', '', both],
  ['invalid', 'data-invalid', both],
  ['no affixes', '', input],
];

for (const [name, attrs, inner] of scenes) {
  test(`rafters-input-group ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-input-group ${attrs}>${inner}</rafters-input-group></main>`;
    await Promise.resolve();
    const results = await runAxe(document.body.querySelector('main') as HTMLElement);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
