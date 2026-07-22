/**
 * React performance of the calendar score, driven end to end. Selection and
 * navigation move only through dispatched actions; the grid re-renders from the
 * score's state; arrow keys cross month boundaries. today/defaultMonth are
 * pinned so the projection is deterministic.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Calendar } from '../../../src/components/calendar/calendar';
import {
  calendarBehavior,
  toISO,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

const TODAY = new Date(2026, 6, 20);
const MONTH = new Date(2026, 6, 1);

const body = () => document.body;

function dayCell(iso: string): HTMLElement {
  const el = body().querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`);
  if (!el) throw new Error(`no day cell for ${iso}`);
  return el;
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

afterEach(() => {
  cleanup();
});

describe('calendar conformance [react]', () => {
  it('renders a labelled grid of gridcell days, axe-clean', async () => {
    render(
      <main>
        <Calendar today={TODAY} defaultMonth={MONTH} />
      </main>,
    );
    const grid = partElement(body(), 'grid');
    expect(grid?.getAttribute('role')).toBe('grid');
    expect(grid?.hasAttribute('aria-labelledby')).toBe(true);
    expect(partElement(body(), 'heading')?.textContent).toBe('July 2026');
    expect(dayCell('2026-07-15').getAttribute('role')).toBe('gridcell');
    await assertAxeClean(body());
  });

  it('contract: grid/heading/nav projections and per-day ARIA equal the DOM', () => {
    const config = baseConfig();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    const root = partElement(body(), 'root');
    if (!root) throw new Error('no root');
    const state = calendarBehavior.initialState(config);
    assertContractFulfillment(calendarBehavior, root, state, config, [
      'grid',
      'heading',
      'prev',
      'next',
    ]);
    assertInstanceAriaFulfillment(calendarBehavior, root, state, config);
  });

  it('today is marked and one cell owns the tabstop', () => {
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    expect(dayCell('2026-07-20').getAttribute('data-today')).toBe('true');
    expect(dayCell('2026-07-20').getAttribute('aria-current')).toBe('date');
    expect(dayCell('2026-07-20').getAttribute('tabindex')).toBe('0');
    expect(dayCell('2026-07-15').getAttribute('tabindex')).toBe('-1');
  });

  it('click selects a day (single) and fires onSelect with the Date', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <main>
        <Calendar today={TODAY} defaultMonth={MONTH} onSelect={onSelect} />
      </main>,
    );
    await user.click(dayCell('2026-07-15'));
    expect(dayCell('2026-07-15').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-15').getAttribute('data-selected')).toBe('true');
    const arg = onSelect.mock.calls[0]?.[0] as Date;
    expect(toISO(arg)).toBe('2026-07-15');
    await assertAxeClean(body());
  });

  it('arrow keys move focus and cross the month boundary', async () => {
    const user = userEvent.setup();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    dayCell('2026-07-31').focus();
    await user.keyboard('{ArrowRight}');
    expect(partElement(body(), 'heading')?.textContent).toBe('August 2026');
    expect(document.activeElement).toBe(dayCell('2026-08-01'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(dayCell('2026-08-08'));
  });

  it('Home/End and PageDown navigate within and across months', async () => {
    const user = userEvent.setup();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    dayCell('2026-07-20').focus();
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(dayCell('2026-07-01'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(dayCell('2026-07-31'));
    await user.keyboard('{PageUp}');
    expect(partElement(body(), 'heading')?.textContent).toBe('June 2026');
  });

  it('Enter on a focused day selects it', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar today={TODAY} defaultMonth={MONTH} onSelect={onSelect} />);
    dayCell('2026-07-09').focus();
    await user.keyboard('{Enter}');
    expect(dayCell('2026-07-09').getAttribute('aria-selected')).toBe('true');
    expect(onSelect).toHaveBeenCalled();
  });

  it('the header controls page the visible month', async () => {
    const user = userEvent.setup();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    await user.click(partElement(body(), 'prev')!);
    expect(partElement(body(), 'heading')?.textContent).toBe('June 2026');
    await user.click(partElement(body(), 'next')!);
    await user.click(partElement(body(), 'next')!);
    expect(partElement(body(), 'heading')?.textContent).toBe('August 2026');
  });

  it('Enter activates a focused header control (native button, not suppressed)', async () => {
    const user = userEvent.setup();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    partElement(body(), 'prev')!.focus();
    await user.keyboard('{Enter}');
    expect(partElement(body(), 'heading')?.textContent).toBe('June 2026');
  });

  it('an arrow on a header control does not steal focus into the grid', async () => {
    const user = userEvent.setup();
    render(<Calendar today={TODAY} defaultMonth={MONTH} />);
    const prev = partElement(body(), 'prev')!;
    prev.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(prev);
    expect(partElement(body(), 'heading')?.textContent).toBe('July 2026');
  });

  it('range mode selects an ordered pair over two clicks', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <Calendar mode="range" today={TODAY} defaultMonth={MONTH} />
      </main>,
    );
    await user.click(dayCell('2026-07-20'));
    await user.click(dayCell('2026-07-10'));
    expect(dayCell('2026-07-10').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-20').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-15').getAttribute('data-in-range')).toBe('true');
    expect(partElement(body(), 'grid')?.getAttribute('aria-multiselectable')).toBeNull();
    await assertAxeClean(body());
  });

  it('multiple mode toggles membership', async () => {
    const user = userEvent.setup();
    render(<Calendar mode="multiple" today={TODAY} defaultMonth={MONTH} />);
    expect(partElement(body(), 'grid')?.getAttribute('aria-multiselectable')).toBe('true');
    await user.click(dayCell('2026-07-05'));
    await user.click(dayCell('2026-07-12'));
    expect(dayCell('2026-07-05').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-12').getAttribute('aria-selected')).toBe('true');
    await user.click(dayCell('2026-07-05'));
    expect(dayCell('2026-07-05').getAttribute('aria-selected')).toBe('false');
  });

  it('a date outside [fromDate, toDate] is disabled and refuses selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Calendar
        today={TODAY}
        defaultMonth={MONTH}
        fromDate={new Date(2026, 6, 10)}
        toDate={new Date(2026, 6, 25)}
        onSelect={onSelect}
      />,
    );
    expect(dayCell('2026-07-05').getAttribute('aria-disabled')).toBe('true');
    await user.click(dayCell('2026-07-05'));
    expect(dayCell('2026-07-05').getAttribute('aria-selected')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('the React disabled predicate marks a day inert and refuses click + keyboard select', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Calendar
        today={TODAY}
        defaultMonth={MONTH}
        disabled={(date) => date.getDate() === 15}
        onSelect={onSelect}
      />,
    );
    expect(dayCell('2026-07-15').getAttribute('aria-disabled')).toBe('true');
    expect(dayCell('2026-07-15').getAttribute('data-disabled')).toBe('true');
    await user.click(dayCell('2026-07-15'));
    expect(dayCell('2026-07-15').getAttribute('aria-selected')).toBe('false');
    dayCell('2026-07-15').focus();
    await user.keyboard('{Enter}');
    expect(dayCell('2026-07-15').getAttribute('aria-selected')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();
    // A day the predicate allows still selects.
    await user.click(dayCell('2026-07-16'));
    expect(dayCell('2026-07-16').getAttribute('aria-selected')).toBe('true');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('controlled: state follows the prop, callback reports the value to set', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <Calendar
        today={TODAY}
        defaultMonth={MONTH}
        selected={new Date(2026, 6, 8)}
        onSelect={onSelect}
      />,
    );
    expect(dayCell('2026-07-08').getAttribute('aria-selected')).toBe('true');
    await user.click(dayCell('2026-07-16'));
    // Controlled: effective value does not move, but the callback reports it.
    expect(toISO(onSelect.mock.calls[0]?.[0] as Date)).toBe('2026-07-16');
    expect(dayCell('2026-07-08').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-16').getAttribute('aria-selected')).toBe('false');
    rerender(
      <Calendar
        today={TODAY}
        defaultMonth={MONTH}
        selected={new Date(2026, 6, 16)}
        onSelect={onSelect}
      />,
    );
    expect(dayCell('2026-07-16').getAttribute('aria-selected')).toBe('true');
    expect(dayCell('2026-07-08').getAttribute('aria-selected')).toBe('false');
  });
});
