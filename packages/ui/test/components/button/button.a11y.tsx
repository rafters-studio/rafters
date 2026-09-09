import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Button, type ButtonProps } from '../../../src/components/button/button';
import {
  BUTTON_ICON_SIZES,
  BUTTON_TEXT_SIZES,
  BUTTON_VARIANTS,
} from '../../../src/components/button/button.behavior';

for (const variant of BUTTON_VARIANTS) {
  test(`button variant=${variant}`, async ({ task }) => {
    const { container } = await render(<Button variant={variant}>Save changes</Button>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BUTTON_TEXT_SIZES) {
  test(`button size=${size}`, async ({ task }) => {
    const { container } = await render(<Button size={size}>Save changes</Button>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BUTTON_ICON_SIZES) {
  test(`button size=${size} icon-only with an accessible name`, async ({ task }) => {
    const { container } = await render(
      <Button size={size} aria-label="Close">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" />
        </svg>
      </Button>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const states: ReadonlyArray<[string, ButtonProps]> = [
  ['loading', { loading: true }],
  ['toggle unpressed', { toggle: true }],
  ['toggle pressed', { toggle: true, defaultPressed: true }],
  ['soft-disabled', { softDisabled: true }],
  ['hard disabled', { disabled: true }],
];

for (const [name, props] of states) {
  test(`button ${name}`, async ({ task }) => {
    const { container } = await render(<Button {...props}>Save changes</Button>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
