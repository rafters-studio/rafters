/**
 * DatePicker: a calendar in an anchored popup that selects a date for a form
 *
 * @cognitive-load 4/10 - decision 2, information 1, interaction 1, disruption 0,
 * learning 0. One decision (which date) plus the month to find it in; the closed
 * trigger shows a single value, the open popup is one month of dates; one click
 * opens and one click selects; the popup is non-modal and anchored, so the page
 * stays in view; the trigger-plus-calendar pattern is universally learned.
 * @attention-economics Closed, it costs what a text field costs: one line with the
 * committed date or a muted placeholder. Attention is spent only while the popup
 * is open, and the popup closes itself the moment the selection is complete.
 * @trust-building The trigger always shows what the form will submit; a single
 * date or a finished range closes the popup and returns focus to the trigger;
 * Escape and an outside click dismiss without changing the value.
 * @accessibility The trigger carries aria-haspopup="dialog", aria-expanded and
 * aria-controls; the popup is role="dialog" named by its trigger; focus moves to
 * the grid's single tabstop on open and back to the trigger on close; the grid
 * is calendar's role="grid" with full arrow/Home/End/PageUp/PageDown navigation;
 * the value submits through a hidden input.
 * @semantic-meaning Date entry for a form: scheduling, booking, filtering. Single
 * mode picks one date; range mode picks a start and an end.
 *
 * @usage-patterns
 * DO: Use for single date or date range selection inside a form
 * DO: Give the picker a name so the value submits with its form
 * DO: Provide a clear placeholder for the empty state
 * DO: Bound selectable dates with fromDate/toDate
 * NEVER: Use for time-only selection
 * NEVER: Require more than one click to select a single date
 * NEVER: Hide the selected value behind the popup
 *
 * @example
 * ```tsx
 * <DatePicker name="due" value={date} onValueChange={setDate} placeholder="Pick a date" />
 * ```
 */

/**
 * The React performance of the date-picker score. The score, its helpers and
 * the DOM-native binding (bindDatePicker) live in date-picker.behavior.ts. React
 * reads the projections via useMemory and runs the shared
 * `startDatePickerPopup` on the open edge; the grid is calendar's own React
 * performance, controlled by the picker's effective value.
 */
import * as React from 'react';
import { keyInputOf } from '../../hooks/key-input';
import { useMemory } from '../../hooks/use-memory';
import { createBehavior } from '../../lib/contract';
import { Calendar, type CalendarProps } from '../calendar/calendar';
import {
  DEFAULT_PLACEHOLDER,
  datePicker,
  datePickerIds,
  effectiveValue,
  formValueAttrs,
  formatValue,
  fromSelection,
  isComplete,
  isOpen,
  selectionProp,
  serializeValue,
  startDatePickerPopup,
  toSelection,
  type CalendarSelection,
  type DatePickerConfig,
  type DatePickerRange,
} from './date-picker.behavior';
import { datePickerClasses } from './date-picker.classes';

export type { DatePickerRange };

/** Calendar options the picker passes through to its grid. */
export interface DatePickerCalendarProps {
  defaultMonth?: Date | undefined;
  fromDate?: Date | undefined;
  toDate?: Date | undefined;
  /** React-only disabled-date predicate (calendar's). */
  disabled?: ((date: Date) => boolean) | undefined;
  showOutsideDays?: boolean | undefined;
  fixedWeeks?: boolean | undefined;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  today?: Date | undefined;
}

interface DatePickerBaseProps {
  /** Form field name; with it, the value submits through a hidden input. */
  name?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** React-only display formatter (a function is not serializable). */
  formatDate?: ((date: Date) => string) | undefined;
  calendarProps?: DatePickerCalendarProps | undefined;
}

export type DatePickerProps =
  | (DatePickerBaseProps & {
      mode?: 'single' | undefined;
      value?: Date | undefined;
      defaultValue?: Date | undefined;
      onValueChange?: ((date: Date | undefined) => void) | undefined;
    })
  | (DatePickerBaseProps & {
      mode: 'range';
      value?: DatePickerRange | undefined;
      defaultValue?: DatePickerRange | undefined;
      onValueChange?: ((range: DatePickerRange | undefined) => void) | undefined;
    });

type ValueCallback = (value: Date | DatePickerRange | undefined) => void;

function CalendarGlyph({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function DatePicker(props: DatePickerProps) {
  const {
    mode = 'single',
    name,
    placeholder = DEFAULT_PLACEHOLDER,
    disabled = false,
    open,
    defaultOpen = false,
    formatDate,
    calendarProps,
  } = props;

  const config: DatePickerConfig = {
    mode,
    value: selectionProp(mode, props.value),
    defaultValue: selectionProp(mode, props.defaultValue),
    open,
    defaultOpen,
    disabled,
  };

  const { memory, dispatch } = React.useMemo(() => createBehavior(datePicker, config), []);
  const state = useMemory(memory);
  const effectiveOpen = isOpen(state, config);
  const value = effectiveValue(state, config);

  const uid = React.useId();
  const ids = React.useMemo(() => datePickerIds(uid), [uid]);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const latest = React.useRef({ config, props });
  latest.current = { config, props };

  const request = React.useCallback(
    (action: 'open' | 'close'): boolean => {
      const { config: c, props: p } = latest.current;
      if (!dispatch(action, c)) return false;
      p.onOpenChange?.(action === 'open');
      return true;
    },
    [dispatch],
  );

  // Gotcha #1: report against the EFFECTIVE value before, so a controlled
  // consumer still hears the value to set and the close to apply.
  const commit = React.useCallback(
    (selection: CalendarSelection): void => {
      const { config: c, props: p } = latest.current;
      const before = memory.get();
      const wasOpen = isOpen(before, c);
      const valueBefore = serializeValue(effectiveValue(before, c));
      if (!dispatch('commit', c, { selection })) return;
      if (serializeValue(selection) !== valueBefore) {
        (p.onValueChange as ValueCallback | undefined)?.(fromSelection(selection));
      }
      if (wasOpen && isComplete(selection)) p.onOpenChange?.(false);
    },
    [memory, dispatch],
  );

  React.useEffect(() => {
    if (!effectiveOpen) return;
    return startDatePickerPopup({
      trigger: triggerRef.current,
      content: contentRef.current,
      onDismiss: () => request('close'),
    });
  }, [effectiveOpen, request]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const action = datePicker.keymap(keyInputOf(event), state, 'content', config);
    if (action !== 'close') return;
    event.preventDefault();
    request(action);
  };

  const classes = datePickerClasses(config, state);
  const aria = datePicker.aria(state, config, ids);
  const hiddenInput = formValueAttrs({ name, value: serializeValue(value) });

  // The grid is calendar's performance, controlled by the picker's value. The
  // assertion only re-types the mode-discriminated props the helpers produce.
  const calendar = {
    ...calendarProps,
    mode,
    selected: fromSelection(value),
    onSelect: (next: Date | DatePickerRange | undefined) => commit(toSelection(mode, next)),
  } as CalendarProps;

  return (
    <div data-part="root">
      <button
        ref={triggerRef}
        type="button"
        data-part="trigger"
        id={ids.trigger}
        disabled={disabled}
        className={classes.trigger}
        {...aria.trigger}
        onClick={() => request(effectiveOpen ? 'close' : 'open')}
      >
        <span data-part="value" id={ids.value} className={classes.value} {...aria.value}>
          {formatValue(value, formatDate) || placeholder}
        </span>
        <CalendarGlyph className={classes.icon} />
      </button>
      <div
        ref={contentRef}
        data-part="content"
        id={ids.content}
        tabIndex={-1}
        hidden={!effectiveOpen}
        className={classes.content}
        {...aria.content}
        onKeyDown={handleKeyDown}
      >
        <Calendar {...calendar} />
      </div>
      {hiddenInput && <input data-part="hidden-input" {...hiddenInput} readOnly />}
    </div>
  );
}

DatePicker.displayName = 'DatePicker';

export default DatePicker;
