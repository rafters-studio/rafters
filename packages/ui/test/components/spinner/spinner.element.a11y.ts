import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/spinner/spinner.element';
import type { SpinnerSize, SpinnerVariant } from '../../../src/components/spinner/spinner.behavior';

// The score projects aria-label="Loading" on every instance, so there is no
// unlabelled form; sizes and variants are the states that vary.
const SIZES: ReadonlyArray<SpinnerSize> = ['sm', 'default', 'lg'];
const VARIANTS: ReadonlyArray<SpinnerVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'muted',
];

function mount(attrs: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-spinner ${attrs}></rafters-spinner></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

for (const size of SIZES) {
  test(`rafters-spinner size=${size}`, async ({ task }) => {
    const host = mount(`size="${size}"`);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const variant of VARIANTS) {
  test(`rafters-spinner variant=${variant}`, async ({ task }) => {
    const host = mount(`variant="${variant}"`);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
