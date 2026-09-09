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

const scenes: ReadonlyArray<[string, string]> = [
  ...SIZES.map((size): [string, string] => [`size=${size}`, `size="${size}"`]),
  ...VARIANTS.map((variant): [string, string] => [`variant=${variant}`, `variant="${variant}"`]),
];

for (const [name, attrs] of scenes) {
  test(`rafters-spinner ${name}`, async ({ task }) => {
    const host = mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
