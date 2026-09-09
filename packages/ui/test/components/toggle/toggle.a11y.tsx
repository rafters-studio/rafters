import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Toggle, type ToggleProps } from '../../../src/components/toggle/toggle';

// Every scene carries an accessible name the way the conformance suite gives
// it: the "Bold" label as the button's text, or aria-label for the icon-only
// pattern.
const scenes: ReadonlyArray<[string, ToggleProps]> = [
  ['off default', {}],
  ['on (pressed)', { defaultPressed: true }],
  ['outline variant', { variant: 'outline' }],
  ['large size on', { size: 'lg', defaultPressed: true }],
  ['small size', { size: 'sm' }],
  ['hard disabled', { disabled: true }],
  ['disabled on', { disabled: true, defaultPressed: true }],
];

for (const [name, props] of scenes) {
  test(`toggle ${name}`, async ({ task }) => {
    const { container } = await render(<Toggle {...props}>Bold</Toggle>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('toggle icon-only with accessible name', async ({ task }) => {
  const { container } = await render(
    <Toggle aria-label="Bold">
      <span aria-hidden="true">B</span>
    </Toggle>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
