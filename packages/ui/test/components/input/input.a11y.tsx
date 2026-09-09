import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Input } from '../../../src/components/input/input';

/** Every scene names the control: an aria-label, or a visible label by id. */
const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ['valid and empty', () => <Input aria-label="Name" />],
  ['filled', () => <Input aria-label="Name" defaultValue="Ada" />],
  [
    'invalid with an error message',
    () => (
      <div>
        <Input aria-label="Name" invalid errorId="err" />
        <div data-part="error" id="err">
          Required
        </div>
      </div>
    ),
  ],
  ['required', () => <Input aria-label="Name" required />],
  ['disabled', () => <Input aria-label="Name" disabled />],
  ['read-only', () => <Input aria-label="Name" readOnly defaultValue="seed" />],
  [
    'visible label',
    () => (
      <div>
        <label htmlFor="name">Name</label>
        <Input id="name" />
      </div>
    ),
  ],
  [
    'email with placeholder',
    () => <Input aria-label="Email" type="email" name="email" placeholder="you@x.com" />,
  ],
];

for (const [name, scene] of scenes) {
  test(`input ${name}`, async ({ task }) => {
    const { container } = await render(scene());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
