import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Calendar from '../../../src/components/calendar/calendar.astro';
import { bindCalendar } from '../../../src/components/calendar/calendar.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Calendar, {
    props: { id: 'cal', today: '2026-07-20', defaultMonth: '2026-07-01', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindCalendar(document.querySelector('[data-part="root"][data-mode]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['single, nothing selected', {}],
  ['single with a selected date', { selected: '2026-07-08' }],
  ['multiple with two selected', { mode: 'multiple', selected: '2026-07-05,2026-07-12' }],
  ['range with both ends', { mode: 'range', selected: '2026-07-10..2026-07-20' }],
  ['bounded by fromDate and toDate', { fromDate: '2026-07-10', toDate: '2026-07-25' }],
  ['week starts on Monday', { weekStartsOn: 1 }],
  ['fixed six weeks without outside days', { fixedWeeks: true, showOutsideDays: false }],
];

for (const [name, props] of scenes) {
  test(`calendar.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
