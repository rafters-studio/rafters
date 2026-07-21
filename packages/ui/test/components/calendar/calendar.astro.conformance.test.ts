/**
 * Astro performance of the calendar score. AstroContainer renders the SSR markup
 * with the initial month already projected, but does NOT run the <script>, so
 * the test calls bindCalendar directly -- that IS the script's job -- then drives
 * the same score the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import Calendar from '../../../src/components/calendar/calendar.astro';
import {
  bindCalendar,
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import {
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Calendar, {
    props: { id: 'cal', today: '2026-07-20', defaultMonth: '2026-07-01', ...props },
  });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-part="root"][data-mode]') as HTMLElement;
  bindCalendar(root); // the <script> does this per instance on the real page
  return root;
}

function baseConfig(overrides: Partial<CalendarConfig> = {}): CalendarConfig {
  return {
    mode: 'single',
    showOutsideDays: true,
    fixedWeeks: false,
    weekStartsOn: 0,
    today: '2026-07-20',
    defaultMonth: '2026-07-01',
    ...overrides,
  };
}

const dayCell = (iso: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`)!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('calendar conformance [astro]', () => {
  it('SSR: a labelled grid with the seeded month and today marked', async () => {
    await mount();
    expect(partElement(document.body, 'grid')?.getAttribute('role')).toBe('grid');
    expect(partElement(document.body, 'heading')?.textContent).toBe('July 2026');
    expect(dayCell('2026-07-20').getAttribute('data-today')).toBe('true');
  });

  it('contract: grid/heading/nav projections and per-day ARIA equal the DOM', async () => {
    const root = await mount();
    const config = baseConfig();
    const state = calendarBehavior.initialState(config);
    assertContractFulfillment(calendarBehavior, root, state, config, [
      'grid',
      'heading',
      'prev',
      'next',
    ]);
    assertInstanceAriaFulfillment(calendarBehavior, root, state, config);
  });

  it('click selects a day and reflects the projection', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(dayCell('2026-07-09'));
    expect(dayCell('2026-07-09').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-09').getAttribute('data-selected')).toBe('true');
  });

  it('arrow keys move focus and cross the month boundary', async () => {
    const user = userEvent.setup();
    await mount();
    dayCell('2026-07-31').focus();
    await user.keyboard('{ArrowRight}');
    expect(partElement(document.body, 'heading')?.textContent).toBe('August 2026');
    expect(document.activeElement).toBe(dayCell('2026-08-01'));
  });

  it('the header controls page the visible month', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(partElement(document.body, 'next')!);
    expect(partElement(document.body, 'heading')?.textContent).toBe('August 2026');
  });
});
