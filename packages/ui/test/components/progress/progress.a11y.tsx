import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Progress, type ProgressProps } from '../../../src/components/progress/progress';
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

// A progressbar needs an accessible name; every scene supplies one.
const scenes: ReadonlyArray<[string, ProgressProps]> = [
  ['determinate', { value: 66, 'aria-label': 'Upload progress' }],
  ['indeterminate', { 'aria-label': 'Loading' }],
  ['empty', { value: 0, 'aria-label': 'Upload progress' }],
  ['complete', { value: 100, 'aria-label': 'Upload progress' }],
  [
    'custom max with a value label',
    {
      value: 3,
      max: 10,
      'aria-label': 'Files',
      getValueLabel: (value, max) => `${value} of ${max} files`,
    },
  ],
  ...VARIANTS.map((variant): [string, ProgressProps] => [
    `variant=${variant}`,
    { value: 40, variant, 'aria-label': 'Upload progress' },
  ]),
  ...SIZES.map((size): [string, ProgressProps] => [
    `size=${size}`,
    { value: 40, size, 'aria-label': 'Upload progress' },
  ]),
];

for (const [name, props] of scenes) {
  test(`progress ${name}`, async ({ task }) => {
    const { container } = await render(<Progress {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
