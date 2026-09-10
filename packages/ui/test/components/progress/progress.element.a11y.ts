import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/progress/progress.element';
import type {
  ProgressSize,
  ProgressVariant,
} from '../../../src/components/progress/progress.behavior';

const VARIANTS: ReadonlyArray<ProgressVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];
const SIZES: ReadonlyArray<ProgressSize> = ['sm', 'default', 'lg'];

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-progress ${attrs}></rafters-progress></main>`;
  await Promise.resolve(); // the element builds and binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

// A progressbar needs an accessible name; every scene supplies one.
const scenes: ReadonlyArray<[string, string]> = [
  ['determinate', 'data-value="66" aria-label="Upload progress"'],
  ['indeterminate', 'aria-label="Loading"'],
  ['empty', 'data-value="0" aria-label="Upload progress"'],
  ['complete', 'data-value="100" aria-label="Upload progress"'],
  [
    'custom max with a value label',
    'data-value="3" data-max="10" data-value-text="3 of 10 files" aria-label="Files"',
  ],
  ...VARIANTS.map((variant): [string, string] => [
    `variant=${variant}`,
    `data-value="40" data-variant="${variant}" aria-label="Upload progress"`,
  ]),
  ...SIZES.map((size): [string, string] => [
    `size=${size}`,
    `data-value="40" data-size="${size}" aria-label="Upload progress"`,
  ]),
];

for (const [name, attrs] of scenes) {
  test(`rafters-progress ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
