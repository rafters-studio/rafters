/**
 * WC performance of the calendar score, driven end to end. The custom element
 * scaffolds the light-DOM parts from its attributes and hands the root to
 * bindCalendar -- the same score and controller the Astro performance drives.
 * today/default-month are pinned so the projection is deterministic.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCalendar } from '../../../src/components/calendar/calendar.element';
import {
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-calendar')) {
    customElements.define('rafters-calendar', RaftersCalendar);
  }
});

async function mount(attrs: Record<string, string> = {}): Promise<HTMLElement> {
  const merged: Record<string, string> = {
    today: '2026-07-20',
    'default-month': '2026-07-01',
    ...attrs,
  };
  const attrString = Object.entries(merged)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  document.body.innerHTML = `<main><rafters-calendar ${attrString}></rafters-calendar></main>`;
  await Promise.resolve(); // let the element's deferred scaffold + bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
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
  cleanup();
  document.body.innerHTML = '';
});

describe('calendar conformance [wc]', () => {
  it('scaffolds a labelled grid with the seeded month, axe-clean', async () => {
    await mount();
    const grid = partElement(document.body, 'grid');
    expect(grid?.getAttribute('role')).toBe('grid');
    expect(grid?.hasAttribute('aria-labelledby')).toBe(true);
    expect(partElement(document.body, 'heading')?.textContent).toBe('July 2026');
    expect(dayCell('2026-07-20').getAttribute('data-today')).toBe('true');
    await assertAxeClean(document.body);
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
    await user.click(dayCell('2026-07-15'));
    expect(dayCell('2026-07-15').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-15').getAttribute('data-selected')).toBe('true');
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
    await user.click(partElement(document.body, 'prev')!);
    expect(partElement(document.body, 'heading')?.textContent).toBe('June 2026');
  });

  it('range mode fills the interior between two clicks', async () => {
    const user = userEvent.setup();
    await mount({ mode: 'range' });
    await user.click(dayCell('2026-07-10'));
    await user.click(dayCell('2026-07-20'));
    expect(dayCell('2026-07-15').getAttribute('data-in-range')).toBe('true');
    expect(dayCell('2026-07-10').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-20').getAttribute('aria-selected')).toBe('true');
  });
});
