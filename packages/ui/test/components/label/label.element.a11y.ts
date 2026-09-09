import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/label/label.element';
import type { LabelVariant } from '../../../src/components/label/label.behavior';
import { labelVariantClasses } from '../../../src/components/label/label.classes';

const VARIANTS = Object.keys(labelVariantClasses) as LabelVariant[];

function mount(markup: string): HTMLElement {
  document.body.innerHTML = `<main>${markup}</main>`;
  return document.body.querySelector('main') as HTMLElement;
}

// The inner <label> lives in the shadow root, so a host `for` cannot reach a
// light-DOM control by id (the element's documented shadow-boundary caveat).
// The conformance test audits the host with slotted text alone; the wrapping
// scene slots the control through the label so the association is structural.
for (const variant of VARIANTS) {
  test(`rafters-label variant=${variant}`, async ({ task }) => {
    const host = mount(`<rafters-label variant="${variant}">Email address</rafters-label>`);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('rafters-label wrapping its control through the slot', async ({ task }) => {
  const host = mount(
    '<rafters-label>Email address <input type="email" name="email" /></rafters-label>',
  );
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
