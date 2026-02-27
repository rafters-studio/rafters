/**
 * DatePicker component combining popover trigger with calendar selection
 *
 * @cognitive-load 5/10 - Familiar pattern; click button, see calendar, pick date
 * @attention-economics Medium attention: viewing calendar grid, selecting date
 * @trust-building Clear date display, predictable calendar behavior, keyboard accessible
 * @accessibility Full keyboard navigation, ARIA expanded states, screen reader announcements
 * @semantic-meaning Date selection: scheduling, booking, form input
 *
 * @usage-patterns
 * DO: Use for single date or date range selection
 * DO: Display selected date clearly in trigger
 * DO: Support keyboard navigation in calendar
 * DO: Provide clear empty state placeholder
 * NEVER: Use for time-only selection (use TimePicker)
 * NEVER: Hide the calendar close affordance
 * NEVER: Require multiple clicks to select a date
 *
 * @example
 * ```tsx
 * <DatePicker
 *   value={date}
 *   onValueChange={setDate}
 *   placeholder="Pick a date"
 * />
 * ```
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import classy from '../../primitives/classy';
import { computePosition } from '../../primitives/collision-detector';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { onPointerDownOutside } from '../../primitives/outside-click';
import { getPortalContainer } from '../../primitives/portal';
import { Calendar, type CalendarProps } from './calendar';

// ==================== Types ====================

type DatePickerMode = 'single' | 'range';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// ==================== DatePicker ====================

export interface DatePickerProps<T extends DatePickerMode = 'single'>
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  mode?: T;
  value?: T extends 'single' ? Date | undefined : DateRange | undefined;
  onValueChange?: T extends 'single'
    ? (date: Date | undefined) => void
    : (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  calendarProps?: Omit<
    CalendarProps<T extends 'single' ? 'single' : 'range'>,
    'mode' | 'selected' | 'onSelect'
  >;
  formatDate?: (date: Date) => string;
  formatRange?: (range: DateRange) => string;
}

export function DatePicker<T extends DatePickerMode = 'single'>({
  mode = 'single' as T,
  value,
  onValueChange,
  placeholder = 'Pick a date',
  disabled = false,
  calendarProps,
  formatDate = defaultFormatDate,
  formatRange = defaultFormatRange,
  className,
  ...props
}: DatePickerProps<T>): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  // Capture date once at mount for defaultMonth fallback (React purity)
  const [defaultDate] = React.useState(() => new Date());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const id = React.useId();
  const contentId = `datepicker-content-${id}`;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Position the popover
  React.useEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const updatePosition = (): void => {
      const anchor = triggerRef.current;
      const floating = contentRef.current;

      if (!anchor || !floating) return;

      const result = computePosition(anchor, floating, {
        side: 'bottom',
        align: 'start',
        sideOffset: 4,
        avoidCollisions: true,
      });

      setPosition({ x: result.x, y: result.y });
    };

    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, { capture: true });
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Escape key handler
  React.useEffect(() => {
    if (!open) return;

    return onEscapeKeyDown((): void => {
      setOpen(false);
      triggerRef.current?.focus();
    });
  }, [open]);

  // Outside click handler
  React.useEffect(() => {
    if (!open || !contentRef.current) return;

    return onPointerDownOutside(contentRef.current, (event): void => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;

      setOpen(false);
    });
  }, [open]);

  // Handle date selection
  const handleSelect = React.useCallback(
    (selected: Date | DateRange | undefined): void => {
      if (mode === 'single') {
        (onValueChange as (date: Date | undefined) => void)?.(selected as Date | undefined);
        setOpen(false);
      } else {
        const range = selected as DateRange | undefined;
        (onValueChange as (range: DateRange | undefined) => void)?.(range);
        // Close when range is complete
        if (range?.from && range?.to) {
          setOpen(false);
        }
      }
    },
    [mode, onValueChange],
  );

  // Format display value
  const displayValue = React.useMemo((): string => {
    if (mode === 'single') {
      const date = value as Date | undefined;
      return date ? formatDate(date) : placeholder;
    } else {
      const range = value as DateRange | undefined;
      if (!range?.from) return placeholder;
      return formatRange(range);
    }
  }, [mode, value, placeholder, formatDate, formatRange]);

  const hasValue = mode === 'single' ? !!value : !!(value as DateRange)?.from;

  const portalContainer = mounted ? getPortalContainer({ enabled: true }) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(): void => setOpen(!open)}
        aria-expanded={open}
        aria-controls={contentId}
        aria-haspopup="dialog"
        data-state={open ? 'open' : 'closed'}
        data-datepicker-trigger=""
        className={classy(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm',
          'shadow-sm ring-offset-background',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !hasValue && 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        <span className="truncate">{displayValue}</span>
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
          className="ml-2 shrink-0 opacity-50"
          aria-hidden="true"
        >
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      </button>

      {open &&
        mounted &&
        portalContainer &&
        createPortal(
          <div
            ref={contentRef}
            id={contentId}
            role="dialog"
            aria-modal="true"
            data-state="open"
            data-datepicker-content=""
            className={classy(
              'z-depth-popover rounded-md border bg-popover p-0 text-popover-foreground shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            )}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
            }}
          >
            <Calendar
              mode={mode === 'single' ? 'single' : 'range'}
              selected={value as Date | DateRange | undefined}
              onSelect={handleSelect as NonNullable<CalendarProps['onSelect']>}
              defaultMonth={
                mode === 'single'
                  ? (value as Date) || defaultDate
                  : (value as DateRange)?.from || defaultDate
              }
              {...calendarProps}
            />
          </div>,
          portalContainer,
        )}
    </>
  );
}

// ==================== Date Formatting Utilities ====================

function defaultFormatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function defaultFormatRange(range: DateRange): string {
  if (!range.from) return '';
  if (!range.to) return defaultFormatDate(range.from);
  return `${defaultFormatDate(range.from)} - ${defaultFormatDate(range.to)}`;
}

// ==================== Display Name ====================

DatePicker.displayName = 'DatePicker';
