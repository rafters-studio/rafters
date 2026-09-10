import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Switch, type SwitchProps } from '../../../src/components/switch/switch';

// A switch has no intrinsic text, so every scene carries an accessible name
// the way the conformance suite gives it: aria-label on the control.
const scenes: ReadonlyArray<[string, SwitchProps]> = [
  ['unchecked default', {}],
  ['checked', { defaultChecked: true }],
  ['destructive lg checked', { variant: 'destructive', size: 'lg', defaultChecked: true }],
  ['small', { size: 'sm' }],
  ['required unchecked', { required: true }],
  ['disabled', { disabled: true }],
  ['controlled checked', { checked: true }],
];

for (const [name, props] of scenes) {
  test(`switch ${name}`, async ({ task }) => {
    const { container } = await render(<Switch aria-label="Enable notifications" {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('switch named by a paired label', async ({ task }) => {
  const { container } = await render(
    <div>
      <Switch id="wifi" />
      <label htmlFor="wifi">Wi-Fi</label>
    </div>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
