import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Calendar, type CalendarProps } from '../../../src/components/calendar/calendar';

const TODAY = new Date(2026, 6, 20);
const MONTH = new Date(2026, 6, 1);

const scenes: ReadonlyArray<[string, CalendarProps]> = [
  ['single, nothing selected', {}],
  ['single with a selected date', { selected: new Date(2026, 6, 8) }],
  [
    'multiple with two selected',
    { mode: 'multiple', selected: [new Date(2026, 6, 5), new Date(2026, 6, 12)] },
  ],
  [
    'range with both ends',
    { mode: 'range', selected: { from: new Date(2026, 6, 10), to: new Date(2026, 6, 20) } },
  ],
  [
    'bounded by fromDate and toDate',
    { fromDate: new Date(2026, 6, 10), toDate: new Date(2026, 6, 25) },
  ],
  ['disabled predicate', { disabled: (date) => date.getDate() === 15 }],
  ['week starts on Monday', { weekStartsOn: 1 }],
  ['fixed six weeks without outside days', { fixedWeeks: true, showOutsideDays: false }],
];

for (const [name, props] of scenes) {
  test(`calendar ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Calendar today={TODAY} defaultMonth={MONTH} {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
