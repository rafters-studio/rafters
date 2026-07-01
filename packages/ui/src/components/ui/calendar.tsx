/**
 * Calendar component for date selection with month/year navigation
 *
 * @cognitive-load 5/10 - Familiar calendar grid pattern; requires spatial reasoning for date selection
 * @attention-economics Medium attention cost: visual scanning of date grid, navigation between months
 * @trust-building Clear today indicator, disabled date styling, keyboard navigation
 * @accessibility Full keyboard navigation, ARIA grid pattern, screen reader announcements
 * @semantic-meaning Date selection: scheduling, booking, date range picking
 *
 * @usage-patterns
 * DO: Use for single date or date range selection
 * DO: Clearly indicate today, selected dates, and disabled dates
 * DO: Support keyboard navigation (arrows, home, end, page up/down)
 * DO: Provide month/year navigation controls
 * DO: Disable dates outside valid range
 * NEVER: Use for time selection (use TimePicker)
 * NEVER: Hide navigation controls
 * NEVER: Allow selection of disabled dates
 *
 * @example
 * ```tsx
 * <Calendar
 *   mode="single"
 *   selected={date}
 *   onSelect={setDate}
 *   disabled={(date) => date < new Date()}
 * />
 * ```
 */

import * as React from 'react';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createMemory } from '../../primitives/memory';

// ==================== Types ====================

type CalendarMode = 'single' | 'multiple' | 'range';

/**
 * Reactive navigation state for a calendar instance.
 *
 * `currentMonth` is the visible month (navigation); `focusedDate` is the keyboard
 * focus within the grid. Selection is NOT here -- the calendar is selection-controlled
 * (the consumer owns `selected`/`onSelect`).
 */
interface CalendarState {
  currentMonth: Date;
  focusedDate: Date | null;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

type SelectHandler<T extends CalendarMode> = T extends 'single'
  ? (date: Date | undefined) => void
  : T extends 'multiple'
    ? (dates: Date[] | undefined) => void
    : (range: DateRange | undefined) => void;

type SelectedValue<T extends CalendarMode> = T extends 'single'
  ? Date | undefined
  : T extends 'multiple'
    ? Date[] | undefined
    : DateRange | undefined;

// ==================== Utilities ====================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isInRange(date: Date, from: Date | undefined, to: Date | undefined): boolean {
  if (!from || !to) return false;
  return date >= from && date <= to;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ==================== Calendar ====================

export interface CalendarProps<T extends CalendarMode = 'single'> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  mode?: T;
  selected?: SelectedValue<T>;
  onSelect?: SelectHandler<T>;
  defaultMonth?: Date;
  disabled?: (date: Date) => boolean;
  fromDate?: Date;
  toDate?: Date;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
  fixedWeeks?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function Calendar<T extends CalendarMode = 'single'>({
  mode = 'single' as T,
  selected,
  onSelect,
  defaultMonth,
  disabled,
  fromDate,
  toDate,
  numberOfMonths = 1,
  showOutsideDays = true,
  fixedWeeks = false,
  weekStartsOn = 0,
  className,
  ...props
}: CalendarProps<T>) {
  // Navigation/transient state lives in one reactive cell per instance, created once
  // with a stable initializer. Selection is intentionally absent: it stays controlled.
  const [memory] = React.useState(() =>
    createMemory<CalendarState>(() => ({
      currentMonth: (() => {
        if (defaultMonth) return defaultMonth;
        if (mode === 'single' && selected instanceof Date) return selected;
        if (mode === 'range' && (selected as DateRange)?.from) {
          const rangeFrom = (selected as DateRange).from;
          if (rangeFrom) return rangeFrom;
        }
        return new Date();
      })(),
      focusedDate: null,
    })),
  );
  const { currentMonth, focusedDate } = useMemory(memory);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Navigation handlers
  const goToPreviousMonth = () => {
    memory.patch({ currentMonth: new Date(year, month - 1, 1) });
  };

  const goToNextMonth = () => {
    memory.patch({ currentMonth: new Date(year, month + 1, 1) });
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (disabled?.(date)) return true;
    if (fromDate && date < fromDate) return true;
    if (toDate && date > toDate) return true;
    return false;
  };

  // Check if date is selected
  const isDateSelected = (date: Date): boolean => {
    if (mode === 'single') {
      return selected instanceof Date && isSameDay(date, selected);
    }
    if (mode === 'multiple') {
      return Array.isArray(selected) && selected.some((d) => isSameDay(date, d));
    }
    if (mode === 'range') {
      const range = selected as DateRange;
      if (range?.from && isSameDay(date, range.from)) return true;
      if (range?.to && isSameDay(date, range.to)) return true;
      return false;
    }
    return false;
  };

  // Check if date is in range (for range mode)
  const isDateInRange = (date: Date): boolean => {
    if (mode !== 'range') return false;
    const range = selected as DateRange;
    return isInRange(date, range?.from, range?.to);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (mode === 'single') {
      (onSelect as SelectHandler<'single'>)?.(date);
    } else if (mode === 'multiple') {
      const current = (selected as Date[]) || [];
      const exists = current.some((d) => isSameDay(date, d));
      const newSelection = exists ? current.filter((d) => !isSameDay(date, d)) : [...current, date];
      (onSelect as SelectHandler<'multiple'>)?.(newSelection.length > 0 ? newSelection : undefined);
    } else if (mode === 'range') {
      const range = (selected as DateRange) || { from: undefined, to: undefined };
      if (!range.from || (range.from && range.to)) {
        // Start new range
        (onSelect as SelectHandler<'range'>)?.({ from: date, to: undefined });
      } else {
        // Complete range
        if (date < range.from) {
          (onSelect as SelectHandler<'range'>)?.({ from: date, to: range.from });
        } else {
          (onSelect as SelectHandler<'range'>)?.({ from: range.from, to: date });
        }
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, date: Date) => {
    let newDate: Date | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
        break;
      case 'ArrowRight':
        newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        break;
      case 'ArrowUp':
        newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
        break;
      case 'ArrowDown':
        newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
        break;
      case 'Home':
        newDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      case 'End':
        newDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        break;
      case 'PageUp':
        e.preventDefault();
        if (e.shiftKey) {
          newDate = new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
        } else {
          newDate = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
        }
        break;
      case 'PageDown':
        e.preventDefault();
        if (e.shiftKey) {
          newDate = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
        } else {
          newDate = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleDateSelect(date);
        return;
    }

    if (newDate) {
      e.preventDefault();
      // Update month alongside focus in one patch when navigation crosses a boundary.
      if (newDate.getMonth() !== month || newDate.getFullYear() !== year) {
        memory.patch({
          focusedDate: newDate,
          currentMonth: new Date(newDate.getFullYear(), newDate.getMonth(), 1),
        });
      } else {
        memory.patch({ focusedDate: newDate });
      }
    }
  };

  // Generate calendar grid
  const generateDays = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: Array<{ date: Date; isOutside: boolean }> = [];

    // Adjust for week start
    const adjustedFirstDay = (firstDay - weekStartsOn + 7) % 7;

    // Previous month days
    if (showOutsideDays) {
      const prevMonthDays = getDaysInMonth(year, month - 1);
      for (let i = adjustedFirstDay - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, prevMonthDays - i),
          isOutside: true,
        });
      }
    } else {
      for (let i = 0; i < adjustedFirstDay; i++) {
        days.push({ date: new Date(0), isOutside: true });
      }
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isOutside: false,
      });
    }

    // Next month days
    const remainingDays = fixedWeeks ? 42 - days.length : (7 - (days.length % 7)) % 7;
    if (showOutsideDays) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isOutside: true,
        });
      }
    } else {
      for (let i = 0; i < remainingDays; i++) {
        days.push({ date: new Date(0), isOutside: true });
      }
    }

    return days;
  };

  const days = generateDays();

  // Generate weekday headers adjusted for week start
  const weekdayHeaders = [...WEEKDAYS.slice(weekStartsOn), ...WEEKDAYS.slice(0, weekStartsOn)];

  return (
    <div
      data-calendar=""
      className={classy('p-3', className)}
      role="application"
      aria-label="Calendar"
      {...props}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className={classy(
            'inline-flex items-center justify-center size-7 rounded-md',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label="Previous month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="text-sm font-medium" aria-live="polite">
          {formatMonth(currentMonth)}
        </div>

        <button
          type="button"
          onClick={goToNextMonth}
          className={classy(
            'inline-flex items-center justify-center size-7 rounded-md',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label="Next month"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      {/* biome-ignore lint/a11y/useSemanticElements: role="grid" on table is the WAI-ARIA calendar pattern for interactive date selection */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: Calendar cells ARE interactive (selectable dates), grid role is required */}
      <table role="grid" className="w-full border-collapse">
        <thead>
          <tr className="flex">
            {weekdayHeaders.map((day) => (
              <th
                key={day}
                scope="col"
                className="text-muted-foreground rounded-md w-8 font-normal text-xs"
                aria-label={day}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
            <tr key={weekIndex} className="flex mt-2">
              {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                const isDisabled = day.isOutside || isDateDisabled(day.date);
                const isSelected = !day.isOutside && isDateSelected(day.date);
                const isInRangeDay = !day.isOutside && isDateInRange(day.date);
                const isTodayDay = !day.isOutside && isToday(day.date);
                const isFocused = focusedDate && !day.isOutside && isSameDay(day.date, focusedDate);

                return (
                  <td key={dayIndex} className="relative p-0 text-center">
                    {day.date.getTime() === 0 ? (
                      <div className="size-8" />
                    ) : (
                      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-selected on calendar day buttons is a common pattern for screen reader announcement of selected dates
                      <button
                        type="button"
                        tabIndex={isFocused || (!focusedDate && isSelected) ? 0 : -1}
                        disabled={isDisabled}
                        onClick={() => handleDateSelect(day.date)}
                        onKeyDown={(e) => handleKeyDown(e, day.date)}
                        onFocus={() => memory.patch({ focusedDate: day.date })}
                        className={classy(
                          'inline-flex items-center justify-center size-8 rounded-md text-sm',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          day.isOutside && 'text-muted-foreground opacity-50',
                          isDisabled && 'opacity-50 cursor-not-allowed',
                          !isDisabled &&
                            !isSelected &&
                            'hover:bg-accent hover:text-accent-foreground',
                          isSelected && 'bg-primary text-primary-foreground',
                          isInRangeDay && !isSelected && 'bg-accent',
                          isTodayDay && !isSelected && 'bg-accent text-accent-foreground',
                        )}
                        aria-selected={isSelected}
                        aria-disabled={isDisabled}
                        data-today={isTodayDay || undefined}
                        data-selected={isSelected || undefined}
                        data-outside={day.isOutside || undefined}
                        data-in-range={isInRangeDay || undefined}
                      >
                        {day.date.getDate()}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== Namespaced Export ====================

Calendar.displayName = 'Calendar';
