import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Checkbox, type CheckboxProps } from '../../../src/components/checkbox/checkbox';

const labelled: ReadonlyArray<[string, CheckboxProps]> = [
  ['unchecked default', {}],
  ['checked', { defaultChecked: true }],
  ['indeterminate', { defaultChecked: 'indeterminate' }],
  ['required', { required: true }],
  ['hard disabled', { disabled: true }],
  ['destructive lg checked', { defaultChecked: true, variant: 'destructive', size: 'lg' }],
  ['primary sm', { variant: 'primary', size: 'sm' }],
  ['controlled checked', { checked: true }],
];

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ...labelled.map(([name, props]): [string, () => ReactElement] => [
    name,
    () => <Checkbox aria-label="Accept terms" {...props} />,
  ]),
  [
    'labelled by visible text',
    () => (
      <>
        <span id="terms-label">Accept terms</span>
        <Checkbox aria-labelledby="terms-label" />
      </>
    ),
  ],
  [
    'named inside a form',
    () => (
      <form>
        <Checkbox name="terms" value="yes" defaultChecked aria-label="Accept terms" />
      </form>
    ),
  ],
];

for (const [name, element] of scenes) {
  test(`checkbox ${name}`, async ({ task }) => {
    const { container } = await render(<main>{element()}</main>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
