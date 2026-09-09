import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Checkbox, type CheckboxProps } from '../../../src/components/checkbox/checkbox';

const scenes: ReadonlyArray<[string, CheckboxProps]> = [
  ['unchecked default', {}],
  ['checked', { defaultChecked: true }],
  ['indeterminate', { defaultChecked: 'indeterminate' }],
  ['required', { required: true }],
  ['hard disabled', { disabled: true }],
  ['destructive lg checked', { defaultChecked: true, variant: 'destructive', size: 'lg' }],
  ['primary sm', { variant: 'primary', size: 'sm' }],
  ['controlled checked', { checked: true }],
];

for (const [name, props] of scenes) {
  test(`checkbox ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Checkbox aria-label="Accept terms" {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('checkbox labelled by visible text', async ({ task }) => {
  const { container } = await render(
    <main>
      <span id="terms-label">Accept terms</span>
      <Checkbox aria-labelledby="terms-label" />
    </main>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('checkbox named inside a form', async ({ task }) => {
  const { container } = await render(
    <main>
      <form>
        <Checkbox name="terms" value="yes" defaultChecked aria-label="Accept terms" />
      </form>
    </main>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
