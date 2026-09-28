import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { DatePicker, type DatePickerProps } from '../../../src/components/date-picker/date-picker';

const calendarProps = { today: new Date(2026, 6, 20), defaultMonth: new Date(2026, 6, 1) };

const scenes: ReadonlyArray<[string, DatePickerProps]> = [
  ['closed, nothing selected', {}],
  ['closed with a value', { defaultValue: new Date(2026, 6, 8) }],
  ['open, nothing selected', { defaultOpen: true }],
  ['open with a value', { defaultOpen: true, defaultValue: new Date(2026, 6, 8) }],
  [
    'open range with both ends',
    {
      mode: 'range',
      defaultOpen: true,
      defaultValue: { from: new Date(2026, 6, 10), to: new Date(2026, 6, 14) },
    },
  ],
  ['form-associated', { name: 'due', defaultValue: new Date(2026, 6, 8) }],
  ['disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`date-picker ${name}`, async ({ task }) => {
    await render(
      <main>
        <DatePicker calendarProps={calendarProps} {...props} />
      </main>,
    );
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
