import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Spinner } from '../../../src/components/spinner/spinner';
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

for (const size of SIZES) {
  test(`spinner size=${size}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Spinner size={size} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const variant of VARIANTS) {
  test(`spinner variant=${variant}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Spinner variant={variant} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
