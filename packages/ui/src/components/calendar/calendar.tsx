import * as React from 'react';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import { createBehavior, type PartIds } from '../../lib/contract';
import { createKeyboardHandler } from '../../primitives/keyboard-handler';
import {
  buildMonthGrid,
  calendarBehavior,
  dateForKey,
  dayAria,
  effectiveSelected,
  formatMonth,
  fromISO,
  isDateDisabled,
  nextSelection,
  tabbableDate,
  toISO,
  todayISO,
  weekdayHeaders,
  type CalendarConfig,
  type CalendarMode,
  type CalendarPart,
  type CalendarSelection,
} from './calendar.behavior';
import { calendarClasses } from './calendar.classes';

/**
 * Calendar: a month grid that selects dates. Grid-navigates with the arrow keys
 * (crossing month boundaries), Home/End (month ends), and PageUp/PageDown
 * (month, or year with Shift); Enter/Space select the focused date; the header
 * controls page the visible month. Single, multiple, and range selection.
 *
 * @cognitive-load 5/10 - decision 2, information 2, interaction 1, disruption 0,
 * learning 0. Two decisions can be live at once (which month, which date), and a
 * month is ~30 items to visually scan, but the grid is a universally learned
 * affordance and every date is a reversible, low-stakes choice with no workflow
 * disruption.
 * @attention-economics A month is a dense field; the today marker and the
 * selected fill are the two anchors that let the eye skip straight to "now" and
 * "chosen" instead of reading every cell. Navigation is chunked by month so the
 * user never scans more than one page of dates at a time.
 * @trust-building A single always-visible today marker, an unambiguous selected
 * state, disabled dates that are visibly and behaviourally inert, and a live
 * month heading that announces every page -- the user is never unsure which
 * month they are looking at or which date they picked.
 * @accessibility role="grid" with an aria-labelledby month heading, role=gridcell
 * days carrying aria-selected/aria-disabled/aria-current, and a single roving
 * tabstop owned by the score's focusedDate (not a roving primitive: arrow keys
 * cross month boundaries, which a clamping roving tabindex cannot express).
 * Full keyboard grid navigation per the WAI-ARIA date-grid pattern.
 */

export interface CalendarDateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CalendarBaseProps {
  /** Uncontrolled seed for the visible month. */
  defaultMonth?: Date;
  /** Dates before this are disabled. */
  fromDate?: Date;
  /** Dates after this are disabled. */
  toDate?: Date;
  /** Render adjacent-month filler days. Default true. */
  showOutsideDays?: boolean;
  /** Always render six weeks. Default false. */
  fixedWeeks?: boolean;
  /** First column's weekday (0 = Sunday). Default 0. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Today's date; injected for deterministic rendering. Default `new Date()`. */
  today?: Date;
  className?: string;
}

export type CalendarProps =
  | (CalendarBaseProps & {
      mode?: 'single';
      selected?: Date;
      onSelect?: (date: Date | undefined) => void;
    })
  | (CalendarBaseProps & {
      mode: 'multiple';
      selected?: Date[];
      onSelect?: (dates: Date[]) => void;
    })
  | (CalendarBaseProps & {
      mode: 'range';
      selected?: CalendarDateRange;
      onSelect?: (range: CalendarDateRange) => void;
    });

/** Read the mode-typed `selected` prop into the behavior's tagged selection. */
function readSelected(props: CalendarProps): CalendarSelection | undefined {
  switch (props.mode) {
    case 'multiple':
      return props.selected ? { mode: 'multiple', dates: props.selected.map(toISO) } : undefined;
    case 'range':
      return props.selected
        ? {
            mode: 'range',
            from: props.selected.from ? toISO(props.selected.from) : null,
            to: props.selected.to ? toISO(props.selected.to) : null,
          }
        : undefined;
    default:
      return props.selected ? { mode: 'single', date: toISO(props.selected) } : undefined;
  }
}

/** Report a committed selection through the mode-typed `onSelect` prop. */
function notifySelect(props: CalendarProps, selection: CalendarSelection): void {
  switch (props.mode) {
    case 'multiple':
      props.onSelect?.(selection.mode === 'multiple' ? selection.dates.map(fromISO) : []);
      return;
    case 'range':
      props.onSelect?.(
        selection.mode === 'range'
          ? {
              from: selection.from ? fromISO(selection.from) : undefined,
              to: selection.to ? fromISO(selection.to) : undefined,
            }
          : { from: undefined, to: undefined },
      );
      return;
    default:
      props.onSelect?.(
        selection.mode === 'single' && selection.date ? fromISO(selection.date) : undefined,
      );
  }
}

const MOVEMENT_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
] as const;

const DAY_SELECTOR = '[data-part="day"]';

export function Calendar(props: CalendarProps) {
  const {
    mode = 'single',
    defaultMonth,
    fromDate,
    toDate,
    showOutsideDays = true,
    fixedWeeks = false,
    weekStartsOn = 0,
    today,
    className,
  } = props;

  // Compute a stable "today" once so render stays pure (React 19); a `today`
  // prop overrides it for deterministic tests.
  const [defaultToday] = React.useState(() => todayISO());
  const resolvedMode: CalendarMode = mode;

  const config: CalendarConfig = {
    mode: resolvedMode,
    selected: readSelected(props),
    defaultMonth: defaultMonth ? toISO(defaultMonth) : undefined,
    fromDate: fromDate ? toISO(fromDate) : undefined,
    toDate: toDate ? toISO(toDate) : undefined,
    showOutsideDays,
    fixedWeeks,
    weekStartsOn,
    today: today ? toISO(today) : defaultToday,
  };

  // createBehavior is the model (created once); useMemory subscribes React to it;
  // dispatch takes the CURRENT config each call, so a controlled `selected`
  // shadows intrinsic state without re-creating the instance.
  const { memory, dispatch } = React.useMemo(() => createBehavior(calendarBehavior, config), []);
  const state = useMemory(memory);

  const uid = React.useId();
  const ids = React.useMemo(() => {
    const out = {} as PartIds<CalendarPart>;
    for (const part of Object.keys(calendarBehavior.parts) as CalendarPart[]) {
      out[part] = `${uid}-${part}`;
    }
    return out;
  }, [uid]);

  const rootRef = React.useRef<HTMLDivElement>(null);

  // Gotcha #1: the controlled callback reports the value to SET even when the
  // effective (controlled) value does not move. A disabled date is refused
  // before dispatch, so no callback fires for an edit the calendar rejects.
  const latest = React.useRef({ props, config });
  latest.current = { props, config };
  const request = React.useCallback(
    (iso: string): void => {
      const { props: p, config: c } = latest.current;
      if (isDateDisabled(iso, c)) return;
      const before = effectiveSelected(memory.get(), c);
      const next = nextSelection(before, iso);
      dispatch('setSelected', c, { selection: next });
      notifySelect(p, next);
    },
    [memory, dispatch],
  );

  // Keyboard grid navigation rides the keyboard-handler primitive, composed
  // against the root (a focused gridcell's keydown bubbles up) -- the same shape
  // the DOM-native bind uses. focusDate updates state; the focus effect below
  // then moves DOM focus to the newly focused cell.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // preventDefault is scoped INSIDE each handler (only when a day cell owns
    // focus) so a keydown bubbling from the focused prev/next button keeps its
    // native action: Enter still activates the month controls (WCAG 2.1.1) and
    // an arrow on a button does not yank focus into the grid.
    const focusedDayCell = (): HTMLElement | null => {
      const active = document.activeElement as HTMLElement | null;
      const cell = active?.closest<HTMLElement>(DAY_SELECTOR) ?? null;
      return cell && root.contains(cell) ? cell : null;
    };
    const stopMovement = createKeyboardHandler(root, {
      key: [...MOVEMENT_KEYS],
      preventDefault: false,
      handler: (event) => {
        const cell = focusedDayCell();
        const from = cell?.dataset['value'];
        if (!from) return;
        const target = dateForKey(event.key, from, event.shiftKey);
        if (!target) return;
        event.preventDefault();
        dispatch('focusDate', latest.current.config, target);
      },
    });
    const stopActivate = createKeyboardHandler(root, {
      key: ['Enter', 'Space'],
      preventDefault: false,
      handler: (event) => {
        const cell = focusedDayCell();
        const iso = cell?.dataset['value'];
        if (iso && cell?.getAttribute('data-outside') !== 'true') {
          event.preventDefault();
          request(iso);
        }
      },
    });
    return () => {
      stopMovement();
      stopActivate();
    };
  }, [dispatch, request]);

  // Move DOM focus to the focused cell after a keyboard navigation re-render.
  // focusedDate is only set by the keyboard handler (which requires focus to be
  // in the grid), so this never steals focus on mount or a click.
  React.useEffect(() => {
    const iso = state.focusedDate;
    if (!iso) return;
    const cell = rootRef.current?.querySelector<HTMLElement>(
      `${DAY_SELECTOR}[data-value="${iso}"]`,
    );
    cell?.focus();
  }, [state.focusedDate, state.currentMonth]);

  const classes = calendarClasses(config, state);
  const aria = calendarBehavior.aria(state, config, ids);
  const weeks = buildMonthGrid(config, state.currentMonth);
  const tabbable = tabbableDate(state, config);
  const headers = weekdayHeaders(weekStartsOn);

  return (
    <div ref={rootRef} data-part="root" id={ids.root} className={classy(classes.root, className)}>
      <div data-part="header" className={classes.header}>
        <button
          type="button"
          data-part="prev"
          id={ids.prev}
          className={classes.nav}
          {...aria.prev}
          onClick={() => dispatch('shiftMonth', latest.current.config, -1)}
        >
          <span aria-hidden="true">&#8249;</span>
        </button>
        <div data-part="heading" id={ids.heading} className={classes.heading} {...aria.heading}>
          {formatMonth(state.currentMonth)}
        </div>
        <button
          type="button"
          data-part="next"
          id={ids.next}
          className={classes.nav}
          {...aria.next}
          onClick={() => dispatch('shiftMonth', latest.current.config, 1)}
        >
          <span aria-hidden="true">&#8250;</span>
        </button>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: role="grid" on a table is the WAI-ARIA date-grid pattern for interactive date selection */}
      <table data-part="grid" id={ids.grid} role="grid" className={classes.grid} {...aria.grid}>
        <thead>
          <tr>
            {headers.map((weekday) => (
              <th key={weekday} scope="col" className={classes.weekday}>
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.iso} data-part="week" className={classes.week}>
              {week.map((cell) =>
                cell.day === 0 ? (
                  <td key={cell.iso} role="gridcell" data-part="day" />
                ) : (
                  <td
                    key={cell.iso}
                    role="gridcell"
                    data-part="day"
                    data-value={cell.iso}
                    data-outside={cell.outside || undefined}
                    tabIndex={cell.iso === tabbable && !cell.outside ? 0 : -1}
                    className={classes.day}
                    onClick={() => {
                      if (!cell.outside) request(cell.iso);
                    }}
                    {...dayAria(cell.iso, state, config)}
                  >
                    {cell.day}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Calendar.displayName = 'Calendar';

export default Calendar;
