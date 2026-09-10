import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/calendar/calendar.element';

async function mount(attrs: Record<string, string>): Promise<HTMLElement> {
  const merged: Record<string, string> = {
    today: '2026-07-20',
    'default-month': '2026-07-01',
    ...attrs,
  };
  const attrString = Object.entries(merged)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  document.body.innerHTML = `<main><rafters-calendar ${attrString}></rafters-calendar></main>`;
  await Promise.resolve(); // the element scaffolds and binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Record<string, string>]> = [
  ['single, nothing selected', {}],
  ['single with a selected date', { selected: '2026-07-08' }],
  ['multiple with two selected', { mode: 'multiple', selected: '2026-07-05,2026-07-12' }],
  ['range with both ends', { mode: 'range', selected: '2026-07-10..2026-07-20' }],
  ['bounded by from-date and to-date', { 'from-date': '2026-07-10', 'to-date': '2026-07-25' }],
  ['week starts on Monday', { 'week-starts-on': '1' }],
  ['fixed six weeks without outside days', { 'fixed-weeks': 'true', 'show-outside-days': 'false' }],
];

for (const [name, attrs] of scenes) {
  test(`rafters-calendar ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
