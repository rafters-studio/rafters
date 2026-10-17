/**
 * Layout of the React calendar in real chromium (#2637): the seven day cells of
 * a full week row share one offsetTop and run left to right. Existing tests
 * assert className equality and ARIA, which hold even when the class string
 * breaks table layout, so this measures geometry.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Calendar } from '../../../src/components/calendar/calendar';
import { calendarClasses } from '../../../src/components/calendar/calendar.classes';
import {
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import { dayLayoutCss, fullWeekGeometry, weekRowProblems } from './layout';

afterEach(cleanup);

describe('Calendar day cell layout', () => {
  it('lays a full week row on one line, left to right', () => {
    const config: CalendarConfig = {
      mode: 'single',
      showOutsideDays: true,
      fixedWeeks: false,
      weekStartsOn: 0,
      today: '2026-07-20',
      defaultMonth: '2026-07-01',
    };
    const dayClass = calendarClasses(config, calendarBehavior.initialState(config)).day;
    const style = document.createElement('style');
    style.textContent = dayLayoutCss(dayClass);
    document.head.appendChild(style);
    try {
      const { container } = render(
        <Calendar today={new Date(2026, 6, 20)} defaultMonth={new Date(2026, 6, 1)} />,
      );
      expect(weekRowProblems(fullWeekGeometry(container))).toEqual([]);
    } finally {
      style.remove();
    }
  });
});
