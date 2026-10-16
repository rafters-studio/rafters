import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/calendar/calendar.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['default', ''],
  ['multiple', 'mode="multiple"'],
  ['range', 'mode="range" selected="2026-07-10..2026-07-14"'],
  ['bounds', 'from-date="2026-07-05" to-date="2026-07-25"'],
  ['no outside days', 'show-outside-days="false"'],
  ['fixed weeks', 'fixed-weeks="true"'],
  ['week starts monday', 'week-starts-on="1"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-calendar ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-calendar today="2026-07-15" default-month="2026-07-01" ${attrs}></rafters-calendar></main>`;
    await Promise.resolve();
    const host = document.body.querySelector('main') as HTMLElement;
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
