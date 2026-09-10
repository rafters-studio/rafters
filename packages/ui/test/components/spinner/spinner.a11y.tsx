import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Spinner, type SpinnerProps } from '../../../src/components/spinner/spinner';
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

const scenes: ReadonlyArray<[string, SpinnerProps]> = [
  ...SIZES.map((size): [string, SpinnerProps] => [`size=${size}`, { size }]),
  ...VARIANTS.map((variant): [string, SpinnerProps] => [`variant=${variant}`, { variant }]),
];

for (const [name, props] of scenes) {
  test(`spinner ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Spinner {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
