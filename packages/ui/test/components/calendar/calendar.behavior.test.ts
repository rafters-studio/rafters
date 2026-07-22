/**
 * Pure score tests for calendar -- no DOM. Date math, grid layout, selection
 * transitions, the keymap claim record, the aria/day projections, and the
 * reducers, all as total functions over injected config (today is a config
 * field, so every assertion is deterministic).
 */
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addYears,
  buildMonthGrid,
  calendarBehavior,
  dateForKey,
  dayAria,
  effectiveSelected,
  emptySelection,
  firstOfMonth,
  fromISO,
  isDateDisabled,
  isInRange,
  isSelected,
  nextSelection,
  serializeSelection,
  tabbableDate,
  toISO,
  weekdayHeaders,
  type CalendarConfig,
  type CalendarSelection,
  type CalendarState,
} from '../../../src/components/calendar/calendar.behavior';

function cfg(overrides: Partial<CalendarConfig> = {}): CalendarConfig {
  return {
    mode: 'single',
    showOutsideDays: true,
    fixedWeeks: false,
    weekStartsOn: 0,
    today: '2026-07-20',
    ...overrides,
  };
}

function state(overrides: Partial<CalendarState> = {}): CalendarState {
  return {
    currentMonth: '2026-07-01',
    focusedDate: null,
    selected: emptySelection('single'),
    ...overrides,
  };
}

describe('calendar date helpers', () => {
  it('toISO/fromISO round-trip a local date', () => {
    expect(toISO(fromISO('2026-07-04'))).toBe('2026-07-04');
    expect(toISO(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-07-15', 7)).toBe('2026-07-22');
  });

  it('addMonths clamps the day to the target month length', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-15', -1)).toBe('2026-02-15');
  });

  it('addYears clamps Feb 29 off a leap year', () => {
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
  });

  it('firstOfMonth normalizes to the first', () => {
    expect(firstOfMonth('2026-07-20')).toBe('2026-07-01');
  });

  it('weekdayHeaders rotates for the week start', () => {
    expect(weekdayHeaders(0)[0]).toBe('Su');
    expect(weekdayHeaders(1)[0]).toBe('Mo');
    expect(weekdayHeaders(1).at(-1)).toBe('Su');
  });
});

describe('buildMonthGrid', () => {
  it('lays out full weeks starting on the configured weekday', () => {
    const weeks = buildMonthGrid(cfg(), '2026-07-01');
    for (const week of weeks) expect(week).toHaveLength(7);
    // The first cell is always the configured week-start weekday.
    expect(fromISO(weeks[0]![0]!.iso).getDay()).toBe(0);
    const inMonth = weeks.flat().filter((d) => !d.outside);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0]!.day).toBe(1);
    expect(inMonth.at(-1)!.day).toBe(31);
  });

  it('respects a non-zero week start', () => {
    const weeks = buildMonthGrid(cfg({ weekStartsOn: 1 }), '2026-07-01');
    expect(fromISO(weeks[0]![0]!.iso).getDay()).toBe(1);
  });

  it('blanks outside days when showOutsideDays is false', () => {
    const weeks = buildMonthGrid(cfg({ showOutsideDays: false }), '2026-07-01');
    const outside = weeks.flat().filter((d) => d.outside);
    expect(outside.length).toBeGreaterThan(0);
    for (const cell of outside) expect(cell.day).toBe(0);
  });

  it('pads to six weeks with fixedWeeks', () => {
    const weeks = buildMonthGrid(cfg({ fixedWeeks: true }), '2026-02-01');
    expect(weeks).toHaveLength(6);
    expect(weeks.flat()).toHaveLength(42);
  });
});

describe('dateForKey (keyboard navigation)', () => {
  const from = '2026-07-15';
  it('steps by day and week', () => {
    expect(dateForKey('ArrowLeft', from, false)).toBe('2026-07-14');
    expect(dateForKey('ArrowRight', from, false)).toBe('2026-07-16');
    expect(dateForKey('ArrowUp', from, false)).toBe('2026-07-08');
    expect(dateForKey('ArrowDown', from, false)).toBe('2026-07-22');
  });

  it('jumps to the month ends with Home/End', () => {
    expect(dateForKey('Home', from, false)).toBe('2026-07-01');
    expect(dateForKey('End', from, false)).toBe('2026-07-31');
  });

  it('pages by month, or year with Shift', () => {
    expect(dateForKey('PageUp', from, false)).toBe('2026-06-15');
    expect(dateForKey('PageDown', from, false)).toBe('2026-08-15');
    expect(dateForKey('PageUp', from, true)).toBe('2025-07-15');
    expect(dateForKey('PageDown', from, true)).toBe('2027-07-15');
  });

  it('crosses the month boundary on an arrow past the edge', () => {
    expect(dateForKey('ArrowRight', '2026-07-31', false)).toBe('2026-08-01');
    expect(dateForKey('ArrowLeft', '2026-07-01', false)).toBe('2026-06-30');
  });

  it('returns null for a non-navigation key', () => {
    expect(dateForKey('Enter', from, false)).toBeNull();
  });
});

describe('selection transitions', () => {
  it('single sets the date', () => {
    const next = nextSelection({ mode: 'single', date: null }, '2026-07-04');
    expect(next).toEqual({ mode: 'single', date: '2026-07-04' });
  });

  it('multiple toggles membership', () => {
    const one = nextSelection({ mode: 'multiple', dates: [] }, '2026-07-04');
    expect(one).toEqual({ mode: 'multiple', dates: ['2026-07-04'] });
    const off = nextSelection(one, '2026-07-04');
    expect(off).toEqual({ mode: 'multiple', dates: [] });
  });

  it('range starts, completes, and orders endpoints', () => {
    const start = nextSelection({ mode: 'range', from: null, to: null }, '2026-07-10');
    expect(start).toEqual({ mode: 'range', from: '2026-07-10', to: null });
    const complete = nextSelection(start, '2026-07-20');
    expect(complete).toEqual({ mode: 'range', from: '2026-07-10', to: '2026-07-20' });
    const reordered = nextSelection(start, '2026-07-05');
    expect(reordered).toEqual({ mode: 'range', from: '2026-07-05', to: '2026-07-10' });
    // A third click after a completed range starts fresh.
    expect(nextSelection(complete, '2026-07-25')).toEqual({
      mode: 'range',
      from: '2026-07-25',
      to: null,
    });
  });

  it('isSelected marks endpoints/members but not a range interior', () => {
    const range: CalendarSelection = { mode: 'range', from: '2026-07-10', to: '2026-07-20' };
    expect(isSelected(range, '2026-07-10')).toBe(true);
    expect(isSelected(range, '2026-07-20')).toBe(true);
    expect(isSelected(range, '2026-07-15')).toBe(false);
    expect(isInRange(range, '2026-07-15')).toBe(true);
    expect(isInRange(range, '2026-07-10')).toBe(false);
  });
});

describe('disabled bounds', () => {
  it('disables dates outside [fromDate, toDate]', () => {
    const c = cfg({ fromDate: '2026-07-10', toDate: '2026-07-20' });
    expect(isDateDisabled('2026-07-09', c)).toBe(true);
    expect(isDateDisabled('2026-07-21', c)).toBe(true);
    expect(isDateDisabled('2026-07-15', c)).toBe(false);
  });
});

describe('tabbableDate', () => {
  it('prefers focus, then selection, then today, then the first', () => {
    expect(tabbableDate(state({ focusedDate: '2026-07-09' }), cfg())).toBe('2026-07-09');
    expect(tabbableDate(state({ selected: { mode: 'single', date: '2026-07-12' } }), cfg())).toBe(
      '2026-07-12',
    );
    expect(tabbableDate(state(), cfg())).toBe('2026-07-20'); // today, visible in July
    expect(tabbableDate(state(), cfg({ today: '2026-09-01' }))).toBe('2026-07-01'); // first
  });
});

describe('reducers', () => {
  it('focusDate moves focus and syncs the visible month', () => {
    const next = calendarBehavior.actions.focusDate(state(), '2026-08-03');
    expect(next.focusedDate).toBe('2026-08-03');
    expect(next.currentMonth).toBe('2026-08-01');
  });

  it('shiftMonth pages the visible month', () => {
    expect(calendarBehavior.actions.shiftMonth(state(), 1).currentMonth).toBe('2026-08-01');
    expect(calendarBehavior.actions.shiftMonth(state(), -1).currentMonth).toBe('2026-06-01');
  });

  it('setSelected returns the same ref when unchanged (no needless notify)', () => {
    const base = state({ selected: { mode: 'single', date: '2026-07-04' } });
    const same = calendarBehavior.actions.setSelected(base, {
      selection: { mode: 'single', date: '2026-07-04' },
    });
    expect(same).toBe(base);
    const changed = calendarBehavior.actions.setSelected(base, {
      selection: { mode: 'single', date: '2026-07-05' },
    });
    expect(changed).not.toBe(base);
    expect(changed.selected).toEqual({ mode: 'single', date: '2026-07-05' });
  });
});

describe('keymap claim record', () => {
  const key = (k: string) => ({ key: k });
  it('claims movement keys and Enter/Space on a day part', () => {
    expect(calendarBehavior.keymap(key('ArrowRight'), state(), 'day', cfg())).toBe('focusDate');
    expect(calendarBehavior.keymap(key('PageDown'), state(), 'day', cfg())).toBe('focusDate');
    expect(calendarBehavior.keymap(key('Enter'), state(), 'day', cfg())).toBe('setSelected');
    expect(calendarBehavior.keymap(key(' '), state(), 'day', cfg())).toBe('setSelected');
  });

  it('claims nothing on a non-day part or an unrelated key', () => {
    expect(calendarBehavior.keymap(key('ArrowRight'), state(), 'grid', cfg())).toBeNull();
    expect(calendarBehavior.keymap(key('a'), state(), 'day', cfg())).toBeNull();
  });
});

describe('aria projections', () => {
  const ids = {
    root: 'c-root',
    prev: 'c-prev',
    next: 'c-next',
    heading: 'c-heading',
    grid: 'c-grid',
    day: '',
  };

  it('projects the grid, heading, and nav controls', () => {
    const aria = calendarBehavior.aria(state(), cfg(), ids);
    expect(aria.grid?.['aria-labelledby']).toBe('c-heading');
    expect(aria.grid?.['aria-multiselectable']).toBeUndefined();
    expect(aria.heading?.['aria-live']).toBe('polite');
    expect(aria.prev?.['aria-label']).toBe('Go to previous month');
    expect(aria.next?.['aria-label']).toBe('Go to next month');
  });

  it('advertises multiselectable only in multiple mode', () => {
    const aria = calendarBehavior.aria(state(), cfg({ mode: 'multiple' }), ids);
    expect(aria.grid?.['aria-multiselectable']).toBe('true');
  });

  it('dayAria reflects selected, today, disabled, and in-range', () => {
    const c = cfg({ fromDate: '2026-07-10', toDate: '2026-07-25' });
    const s = state({ selected: { mode: 'range', from: '2026-07-12', to: '2026-07-18' } });
    expect(dayAria('2026-07-12', s, c)).toMatchObject({
      'aria-selected': 'true',
      'data-selected': 'true',
    });
    expect(dayAria('2026-07-15', s, c)).toMatchObject({ 'data-in-range': 'true' });
    expect(dayAria('2026-07-20', s, c)).toMatchObject({
      'data-today': 'true',
      'aria-current': 'date',
    });
    expect(dayAria('2026-07-09', s, c)).toMatchObject({
      'aria-disabled': 'true',
      'data-disabled': 'true',
    });
    expect(dayAria('2026-07-15', s, c)['aria-selected']).toBe('false');
  });
});

describe('initialState and effective selection', () => {
  it('seeds the visible month from defaultMonth, then a seed selection, then today', () => {
    expect(calendarBehavior.initialState(cfg({ defaultMonth: '2026-03-15' })).currentMonth).toBe(
      '2026-03-01',
    );
    expect(
      calendarBehavior.initialState(
        cfg({ defaultSelected: { mode: 'single', date: '2026-05-09' } }),
      ).currentMonth,
    ).toBe('2026-05-01');
    expect(calendarBehavior.initialState(cfg()).currentMonth).toBe('2026-07-01');
  });

  it('a controlled selection shadows intrinsic state', () => {
    const c = cfg({ selected: { mode: 'single', date: '2026-07-04' } });
    const s = state({ selected: { mode: 'single', date: '2026-07-09' } });
    expect(effectiveSelected(s, c)).toEqual({ mode: 'single', date: '2026-07-04' });
    expect(serializeSelection(effectiveSelected(s, c))).toBe('single:2026-07-04');
  });
});
