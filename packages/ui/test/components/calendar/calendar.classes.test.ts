/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts the day cell carries its sizing, focus ring, and the data-* state
 * variants the score projects (today, selected, in-range, outside, disabled) --
 * the same class contract all three performances paint, including the bind-built
 * cells that read the day class off data-day-class.
 */
import { describe, expect, it } from 'vitest';
import {
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import { calendarClasses } from '../../../src/components/calendar/calendar.classes';

function classesFor(overrides: Partial<CalendarConfig> = {}) {
  const config: CalendarConfig = {
    mode: 'single',
    showOutsideDays: true,
    fixedWeeks: false,
    weekStartsOn: 0,
    today: '2026-07-20',
    ...overrides,
  };
  return calendarClasses(config, calendarBehavior.initialState(config));
}

describe('calendar classes', () => {
  it('exposes the full part class set', () => {
    const classes = classesFor();
    for (const key of ['root', 'header', 'nav', 'heading', 'grid', 'weekday', 'week', 'day']) {
      expect(classes).toHaveProperty(key);
    }
  });

  it('the nav control is a focusable icon button', () => {
    const nav = classesFor().nav;
    expect(nav).toContain('rounded-md');
    expect(nav).toContain('hover:bg-accent');
    expect(nav).toContain('focus-visible:ring-ring');
  });

  it('the grid stretches and collapses its borders', () => {
    expect(classesFor().grid).toContain('border-collapse');
    expect(classesFor().grid).toContain('w-full');
  });

  it('the day cell sizes, focuses, and carries every state variant', () => {
    const day = classesFor().day;
    expect(day).toContain('size-8');
    expect(day).toContain('rounded-md');
    expect(day).toContain('focus-visible:ring-ring');
    expect(day).toContain('data-[selected=true]:bg-primary');
    expect(day).toContain('data-[today=true]:bg-accent');
    expect(day).toContain('data-[in-range=true]:bg-accent');
    expect(day).toContain('data-[outside=true]:opacity-50');
    expect(day).toContain('data-[disabled=true]:cursor-not-allowed');
  });

  it('declares no raw transition duration (motion is undeclared)', () => {
    // No semantic motion token fits a calendar day yet; motion stays undeclared
    // rather than hardcoding a numeric duration (see calendar.md).
    const day = classesFor().day;
    expect(day).not.toMatch(/duration-\d/);
    expect(day).not.toContain('transition-');
  });
});
