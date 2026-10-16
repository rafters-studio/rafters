import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/input-otp/input-otp.element';

const SLOTS = [0, 1, 2, 3, 4, 5]
  .map((i) => `<rafters-input-otp-slot index="${i}"></rafters-input-otp-slot>`)
  .join('');

const scenarios: Array<{ name: string; attrs: string; typed: string }> = [
  { name: 'empty', attrs: '', typed: '' },
  { name: 'two typed', attrs: '', typed: '12' },
  { name: 'six typed', attrs: '', typed: '123456' },
  { name: 'disabled', attrs: 'disabled', typed: '' },
  { name: 'required', attrs: 'required', typed: '' },
  { name: 'aria-label', attrs: 'aria-label="Code"', typed: '' },
];

for (const scenario of scenarios) {
  test(`input-otp.element ${scenario.name}`, async ({ task }) => {
    document.body.innerHTML =
      `<main><rafters-input-otp ${scenario.attrs}>` +
      `<rafters-input-otp-group>${SLOTS}</rafters-input-otp-group>` +
      '</rafters-input-otp></main>';
    await Promise.resolve();
    const field = document.querySelector('input') as HTMLInputElement;
    if (scenario.typed) await userEvent.type(field, scenario.typed);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
