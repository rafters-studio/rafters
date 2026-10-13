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
  [
    'start and end icons, svg title does not leak into the name',
    () => {
      const icon = (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <title>Magnifier</title>
          <path d="M2 4h20v16H2z" stroke="currentColor" />
        </svg>
      );
      return <Input aria-label="Search" startIcon={icon} endIcon={icon} />;
    },
  ],
  [
    'start and end icons, svg title does not leak into the name',
    () => {
      const icon = (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <title>Magnifier</title>
          <path d="M2 4h20v16H2z" stroke="currentColor" />
        </svg>
      );
      return <Input aria-label="Search" startIcon={icon} endIcon={icon} />;
    },
  ],
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

test('input icon wrappers are aria-hidden', async ({ task }) => {
  const { container } = await render(
    <Input aria-label="Search" startIcon={<svg viewBox="0 0 24 24" />} endIcon={<svg />} />,
  );
  task.meta.axe = await runAxe(container);
  expect(container.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
