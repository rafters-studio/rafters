import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Slider, type SliderProps } from '../../../src/components/slider/slider';

// A slider has no intrinsic text, so every scene names each thumb with the
// same `aria-label` the conformance suite applies.
const scenes: ReadonlyArray<[string, SliderProps]> = [
  ['single default', { defaultValue: [50] }],
  ['range two thumbs', { defaultValue: [25, 75] }],
  ['small at min', { size: 'sm', defaultValue: [0] }],
  ['destructive lg', { variant: 'destructive', size: 'lg', defaultValue: [60] }],
  ['vertical', { orientation: 'vertical', defaultValue: [40] }],
  ['stepped custom range', { min: 10, max: 20, step: 2, defaultValue: [14] }],
  ['disabled', { disabled: true, defaultValue: [30] }],
  ['form associated', { name: 'volume', defaultValue: [25, 75] }],
];

for (const [name, props] of scenes) {
  test(`slider ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Slider aria-label="Volume" {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
