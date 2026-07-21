import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createKeyboardHandler } from '../../primitives/keyboard-handler';

/**
 * Calendar: a month grid that grid-navigates dates (arrows/page/home/end) and
 * selects single/multiple/range values. Extracted from old/ui/calendar.tsx --
 * every earned keyboard and selection semantic is preserved (see calendar.md
 * dispositions).
 *
 * Composition (Spec 05, "compose the primitive, never reimplement it"):
 * - keyboard nav rides `keyboard-handler` (`createKeyboardHandler`): the keymap
 *   projection is the pure claim record (Spec 01), the bind computes the target
 *   date via the exported `dateForKey` helper (reducers get no config, and the
 *   date math needs weekStartsOn/bounds).
 * - `roving-focus` is deliberately NOT composed. It owns a roving tabindex over a
 *   FIXED DOM item list and clamps at the edges (grid mode does not wrap); the
 *   calendar's arrow keys must instead CROSS the month boundary -- ArrowRight on
 *   the last day moves to the first day of the next month, re-rendering the grid
 *   (WAI-ARIA date-grid pattern, oracle lines 271-282). So `focusedDate` is
 *   genuine score state (it survives the re-render and drives which cell is
 *   tabbable), not ephemeral roving state -- the radio/tabs relationship inverts
 *   here. The bind owns the tabindex from state. See calendar.md.
 *
 * Selection is score state with a controlled shadow (slider's ownership-of-truth
 * boundary): `config.selected` shadows `state.selected`, effective =
 * `config.selected ?? state.selected`. WC and Astro have no reactive prop, so
 * their intrinsic state is seeded from the server markup and drives selection
 * without a consumer. The date math (grid layout, key -> date, selection
 * transitions) lives in exported pure helpers, never in a reducer.
 */

export type CalendarMode = 'single' | 'multiple' | 'range';

/** A calendar-day identity: a local `yyyy-mm-dd` string. Timezone-free by
 *  construction (all math is on local Y/M/D components), so it round-trips
 *  through a `data-*` attribute and compares by value. */
export type ISODate = string;

/**
 * The selection value, discriminated by mode so the shape is self-describing and
 * the transition helper can branch without config. `single` holds one date (or
 * none); `multiple` a set; `range` a `from`/`to` pair, incomplete until `to`.
 */
export type CalendarSelection =
  | { mode: 'single'; date: ISODate | null }
  | { mode: 'multiple'; dates: ISODate[] }
  | { mode: 'range'; from: ISODate | null; to: ISODate | null };

export interface CalendarConfig {
  /** Selection cardinality. Default 'single'. */
  mode: CalendarMode;
  /** Controlled selection: shadows the intrinsic state when present. */
  selected?: CalendarSelection | undefined;
  /** Uncontrolled seed for the intrinsic selection. */
  defaultSelected?: CalendarSelection | undefined;
  /** Visible-month seed (first of month). */
  defaultMonth?: ISODate | undefined;
  /** Serializable lower bound: dates before it are disabled. */
  fromDate?: ISODate | undefined;
  /** Serializable upper bound: dates after it are disabled. */
  toDate?: ISODate | undefined;
  /** Render the leading/trailing days of adjacent months. Default true. */
  showOutsideDays: boolean;
  /** Always render six weeks, so the grid height never jumps. Default false. */
  fixedWeeks: boolean;
  /** First column's weekday (0 = Sunday). Default 0. */
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Today's date, injected for determinism (the projection stays pure). */
  today: ISODate;
}

export interface CalendarState {
  /** The visible month (first of month). */
  currentMonth: ISODate;
  /** The keyboard-focused date, or null before the grid is entered. */
  focusedDate: ISODate | null;
  /** Intrinsic selection -- ignored while a controlled selection is present. */
  selected: CalendarSelection;
}

export type CalendarActions = {
  /** Move keyboard focus to a date; syncs the visible month to its month. */
  focusDate: ISODate;
  /** Shift the visible month by a whole-month delta (prev/next controls). */
  shiftMonth: number;
  /** Commit an already-computed selection (the transition helper owns the math).
   *  Wrapped in an object so the union payload does not distribute through the
   *  dispatch tuple type. */
  setSelected: { selection: CalendarSelection };
};

export type CalendarPart = 'root' | 'prev' | 'next' | 'heading' | 'grid' | 'day';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

// ==================== Pure date helpers (no config) ====================

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a local Date as `yyyy-mm-dd`. */
export function toISO(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse a `yyyy-mm-dd` string into a local Date at midnight. */
export function fromISO(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Today's date as an ISO string (the only impure helper -- injected via config). */
export function todayISO(): ISODate {
  return toISO(new Date());
}

/** The first-of-month ISO for the month containing `iso`. */
export function firstOfMonth(iso: ISODate): ISODate {
  const date = fromISO(iso);
  return toISO(new Date(date.getFullYear(), date.getMonth(), 1));
}

/** Add `days` to `iso` (may cross month/year boundaries). */
export function addDays(iso: ISODate, days: number): ISODate {
  const date = fromISO(iso);
  return toISO(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** Add `months` to `iso`, clamping the day to the target month's length. */
export function addMonths(iso: ISODate, months: number): ISODate {
  const date = fromISO(iso);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return toISO(target);
}

/** Add `years` to `iso`, clamping the day (Feb 29 -> Feb 28 off a leap year). */
export function addYears(iso: ISODate, years: number): ISODate {
  return addMonths(iso, years * 12);
}

/** Human month label, e.g. "July 2026". */
export function formatMonth(iso: ISODate): string {
  return fromISO(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** The weekday header labels rotated for the configured week start. */
export function weekdayHeaders(weekStartsOn: number): string[] {
  return [...WEEKDAYS.slice(weekStartsOn), ...WEEKDAYS.slice(0, weekStartsOn)];
}

// ==================== Grid layout (pure over config) ====================

export interface CalendarDay {
  iso: ISODate;
  /** Day-of-month number (1-31), or 0 for a blanked outside day. */
  day: number;
  /** Whether the day belongs to an adjacent month (a leading/trailing filler). */
  outside: boolean;
}

/**
 * Build the visible month grid as weeks of seven days. Leading/trailing days of
 * the adjacent months fill the first and last weeks; `showOutsideDays=false`
 * blanks them (their `day` is 0), and `fixedWeeks` pads to six rows. Pure over
 * config -- the same layout the three decorators render and the bind rebuilds.
 */
export function buildMonthGrid(config: CalendarConfig, month: ISODate): CalendarDay[][] {
  const first = fromISO(firstOfMonth(month));
  const year = first.getFullYear();
  const monthIndex = first.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = first.getDay();
  const leadCount = (firstWeekday - config.weekStartsOn + 7) % 7;

  const days: CalendarDay[] = [];

  for (let i = leadCount - 1; i >= 0; i--) {
    const date = new Date(year, monthIndex, -i);
    days.push({
      iso: toISO(date),
      day: config.showOutsideDays ? date.getDate() : 0,
      outside: true,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ iso: toISO(new Date(year, monthIndex, d)), day: d, outside: false });
  }

  const filled = config.fixedWeeks ? 42 : Math.ceil(days.length / 7) * 7;
  let trailing = 1;
  while (days.length < filled) {
    const date = new Date(year, monthIndex + 1, trailing);
    days.push({
      iso: toISO(date),
      day: config.showOutsideDays ? date.getDate() : 0,
      outside: true,
    });
    trailing++;
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// ==================== Selection (pure over mode) ====================

/** The effective selection: a controlled `config.selected` shadows intrinsic state. */
export function effectiveSelected(state: CalendarState, config: CalendarConfig): CalendarSelection {
  return config.selected ?? state.selected;
}

/** The empty selection for a mode -- the initial intrinsic value. */
export function emptySelection(mode: CalendarMode): CalendarSelection {
  if (mode === 'single') return { mode: 'single', date: null };
  if (mode === 'multiple') return { mode: 'multiple', dates: [] };
  return { mode: 'range', from: null, to: null };
}

/** Stable string form of a selection -- the change-detection currency. */
export function serializeSelection(selection: CalendarSelection): string {
  if (selection.mode === 'single') return `single:${selection.date ?? ''}`;
  if (selection.mode === 'multiple') return `multiple:${[...selection.dates].sort().join(',')}`;
  return `range:${selection.from ?? ''}..${selection.to ?? ''}`;
}

/** Whether `iso` is a selected endpoint/member (a range interior is not). */
export function isSelected(selection: CalendarSelection, iso: ISODate): boolean {
  if (selection.mode === 'single') return selection.date === iso;
  if (selection.mode === 'multiple') return selection.dates.includes(iso);
  return selection.from === iso || selection.to === iso;
}

/** Whether `iso` falls strictly inside a completed range (endpoints excluded). */
export function isInRange(selection: CalendarSelection, iso: ISODate): boolean {
  if (selection.mode !== 'range') return false;
  const { from, to } = selection;
  if (!from || !to) return false;
  return iso > from && iso < to;
}

/**
 * The selection after activating `iso`, from the current selection. Single sets
 * the date; multiple toggles membership; range starts a new range on the first
 * click (or after a completed one) and completes it on the second, ordering the
 * endpoints so `from <= to` (oracle lines 209-221).
 */
export function nextSelection(current: CalendarSelection, iso: ISODate): CalendarSelection {
  if (current.mode === 'single') return { mode: 'single', date: iso };
  if (current.mode === 'multiple') {
    const exists = current.dates.includes(iso);
    const dates = exists ? current.dates.filter((d) => d !== iso) : [...current.dates, iso];
    return { mode: 'multiple', dates };
  }
  const { from, to } = current;
  if (!from || (from && to)) return { mode: 'range', from: iso, to: null };
  if (iso < from) return { mode: 'range', from: iso, to: from };
  return { mode: 'range', from, to: iso };
}

// ==================== Disabled bounds (serializable) ====================

/** Whether `iso` is outside the serializable [fromDate, toDate] bounds. */
export function isDateDisabled(iso: ISODate, config: CalendarConfig): boolean {
  if (config.fromDate && iso < config.fromDate) return true;
  if (config.toDate && iso > config.toDate) return true;
  return false;
}

// ==================== Keyboard (pure over config) ====================

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

/**
 * The date a movement key targets from `focused`, or `null` when the key does
 * not navigate. Arrows step a day/week; Home/End jump to the first/last of the
 * month; Page keys step a month, or a year with Shift (oracle lines 229-263).
 */
export function dateForKey(key: string, focused: ISODate, shiftKey: boolean): ISODate | null {
  switch (key) {
    case 'ArrowLeft':
      return addDays(focused, -1);
    case 'ArrowRight':
      return addDays(focused, 1);
    case 'ArrowUp':
      return addDays(focused, -7);
    case 'ArrowDown':
      return addDays(focused, 7);
    case 'Home': {
      const date = fromISO(focused);
      return toISO(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    case 'End': {
      const date = fromISO(focused);
      return toISO(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    }
    case 'PageUp':
      return shiftKey ? addYears(focused, -1) : addMonths(focused, -1);
    case 'PageDown':
      return shiftKey ? addYears(focused, 1) : addMonths(focused, 1);
    default:
      return null;
  }
}

/**
 * The date that owns the grid's single tabstop: the focused date, else the
 * selected date visible in the month, else today if visible, else the first of
 * the month. Guarantees the grid is always reachable by Tab (the oracle left it
 * unreachable when nothing was focused or selected -- corrected here).
 */
export function tabbableDate(state: CalendarState, config: CalendarConfig): ISODate {
  const month = firstOfMonth(state.currentMonth);
  const inMonth = (iso: ISODate | null): iso is ISODate =>
    iso !== null && firstOfMonth(iso) === month;
  if (inMonth(state.focusedDate)) return state.focusedDate;
  const selection = effectiveSelected(state, config);
  if (selection.mode === 'single' && inMonth(selection.date)) return selection.date;
  if (selection.mode === 'range' && inMonth(selection.from)) return selection.from;
  if (selection.mode === 'multiple') {
    const first = selection.dates.find(inMonth);
    if (first) return first;
  }
  if (inMonth(config.today)) return config.today;
  return month;
}

// ==================== Score ====================

/** The month implied by a seed selection, when no explicit defaultMonth is set. */
function seededMonth(config: CalendarConfig): ISODate | null {
  const selection = config.selected ?? config.defaultSelected;
  if (!selection) return null;
  if (selection.mode === 'single') return selection.date;
  if (selection.mode === 'range') return selection.from;
  return selection.dates[0] ?? null;
}

const calendar: Slice<CalendarConfig, CalendarState, CalendarActions, CalendarPart> = {
  name: 'calendar',
  parts: {
    root: {},
    prev: {},
    next: {},
    heading: {},
    grid: { role: 'grid' },
    day: { role: 'gridcell', many: true },
  },
  initialState: (config) => ({
    currentMonth: firstOfMonth(config.defaultMonth ?? seededMonth(config) ?? config.today),
    focusedDate: null,
    selected: config.selected ?? config.defaultSelected ?? emptySelection(config.mode),
  }),
  actions: {
    focusDate: (state, iso) => ({
      ...state,
      focusedDate: iso,
      currentMonth: firstOfMonth(iso),
    }),
    shiftMonth: (state, delta) => ({
      ...state,
      currentMonth: firstOfMonth(addMonths(state.currentMonth, delta)),
    }),
    // The value arrives already computed (nextSelection owns the transition,
    // since a reducer gets no config/mode). Return the same ref when unchanged
    // so a controlled consumer's memory does not notify needlessly.
    setSelected: (state, { selection }) =>
      serializeSelection(state.selected) === serializeSelection(selection)
        ? state
        : { ...state, selected: selection },
  },
  canDispatch: () => true,
  aria: (_state, config, ids) => ({
    grid: {
      'aria-labelledby': ids.heading || undefined,
      'aria-multiselectable': config.mode === 'multiple' ? 'true' : undefined,
    },
    heading: { 'aria-live': 'polite', 'aria-atomic': 'true' },
    prev: { 'aria-label': 'Go to previous month' },
    next: { 'aria-label': 'Go to next month' },
  }),
  // The pure claim record (Spec 01): movement keys navigate the grid (the bind
  // computes the target date via dateForKey and dispatches focusDate);
  // Enter/Space select the focused date (the bind computes the selection via
  // nextSelection). Claimed only on a day part.
  keymap: (event, _state, part) => {
    if (part !== 'day') return null;
    if ((MOVEMENT_KEYS as ReadonlyArray<string>).includes(event.key)) return 'focusDate';
    if (event.key === 'Enter' || event.key === ' ') return 'setSelected';
    return null;
  },
};

export const calendarBehavior: BehaviorSpec<
  CalendarConfig,
  CalendarState,
  CalendarActions,
  CalendarPart
> = {
  ...compose('calendar', calendar),
  instanceAria: (part, value, state, config) =>
    part === 'day' ? dayAria(value, state, config) : {},
};

/**
 * Per-instance projection for the `day` many-part. `aria()` projects one
 * AriaAttrs per part NAME; days occur once per date, so their projection takes
 * the instance date (mirroring radio-group's radioItemAria). tabindex is
 * deliberately absent: the bind owns the single tabstop as ephemeral DOM state
 * (like roving's tabindex), so it must not appear in a projection the harness
 * asserts against.
 */
export function dayAria(iso: ISODate, state: CalendarState, config: CalendarConfig): AriaAttrs {
  const selection = effectiveSelected(state, config);
  const selected = isSelected(selection, iso);
  const disabled = isDateDisabled(iso, config);
  const inRange = isInRange(selection, iso);
  const today = iso === config.today;
  return {
    'aria-selected': selected ? 'true' : 'false',
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-current': today ? 'date' : undefined,
    'data-today': today ? 'true' : undefined,
    'data-selected': selected ? 'true' : undefined,
    'data-in-range': inRange ? 'true' : undefined,
    'data-disabled': disabled ? 'true' : undefined,
  };
}

// ==================== bindCalendar (WC + Astro share it) ====================

const DAY_SELECTOR = '[data-part="day"]';

/** Parse a serialized selection off the root markup (`data-mode`/`data-selected`). */
export function parseSelection(mode: CalendarMode, raw: string | null): CalendarSelection {
  if (!raw) return emptySelection(mode);
  if (mode === 'single') return { mode: 'single', date: raw };
  if (mode === 'multiple') {
    return { mode: 'multiple', dates: raw.split(',').filter(Boolean) };
  }
  const [from, to] = raw.split('..');
  return { mode: 'range', from: from || null, to: to || null };
}

function coerceWeekStart(raw: string | null): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Number(raw ?? 0);
  return (Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function readConfig(root: HTMLElement): CalendarConfig {
  const attr = (name: string): string | null => root.getAttribute(name);
  const mode = (attr('data-mode') as CalendarMode | null) ?? 'single';
  return {
    mode,
    defaultSelected: parseSelection(mode, attr('data-selected')),
    defaultMonth: attr('data-month') ?? undefined,
    fromDate: attr('data-from-date') ?? undefined,
    toDate: attr('data-to-date') ?? undefined,
    showOutsideDays: attr('data-show-outside-days') !== 'false',
    fixedWeeks: attr('data-fixed-weeks') === 'true',
    weekStartsOn: coerceWeekStart(attr('data-week-starts-on')),
    today: attr('data-today') ?? todayISO(),
  };
}

/**
 * The DOM-native binding of the calendar score -- the client the Web Component
 * and the Astro <script> both import. React (retained-mode) reads the
 * projections declaratively instead, but shares the same score and helpers.
 *
 * Unlike radio-group (a fixed item set), the calendar's day cells CHANGE when
 * the month changes, so the bind OWNS grid construction: `renderDays` rebuilds
 * the `[data-part="grid"] tbody` from `buildMonthGrid` on every render. The
 * server markup is the pre-JS first paint; after bind the bind is the single
 * source of the visible cells. Keyboard rides `createKeyboardHandler`; the
 * single tabstop is set from `tabbableDate` (the calendar's own state, not a
 * roving primitive -- see the module header).
 *
 * Three-gotcha ledger: (1) uncontrolled here (no reactive prop), so the
 * controlled-callback compare is a no-op; (2) the projection is resolved, so it
 * is applied with `{ validate: false }`; (3) the WC defers bind one microtask
 * (see calendar.element.ts).
 */
export function bindCalendar(root: HTMLElement): () => void {
  const config = readConfig(root);
  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(calendarBehavior, config);

  const ids = {} as PartIds<CalendarPart>;
  for (const part of Object.keys(calendarBehavior.parts) as CalendarPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const grid = getPart('grid');
  const heading = getPart('heading');

  // The day cell's class string is authored in calendar.classes.ts (the view)
  // and handed to the bind as a data attribute on the grid, so behavior.ts never
  // imports the view yet the bind-built cells paint identically to React's.
  const dayClass = grid?.getAttribute('data-day-class') ?? '';

  const renderDays = () => {
    const body = grid?.querySelector('tbody');
    if (!body) return;
    const state = memory.get();
    const tabbable = tabbableDate(state, config);
    const weeks = buildMonthGrid(config, state.currentMonth);
    body.replaceChildren();
    for (const week of weeks) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-part', 'week');
      for (const cell of week) {
        const td = document.createElement('td');
        td.setAttribute('data-part', 'day');
        td.setAttribute('role', 'gridcell');
        // Blanked cells (showOutsideDays=false) are inert structure: a gridcell
        // for the grid's required-children, but no data-value/tabindex/aria, so
        // assertInstanceAriaFulfillment skips them (it keys off data-value).
        if (cell.day === 0) {
          tr.appendChild(td);
          continue;
        }
        td.dataset['value'] = cell.iso;
        if (cell.outside) td.setAttribute('data-outside', 'true');
        if (dayClass) td.className = dayClass;
        td.textContent = String(cell.day);
        td.setAttribute('tabindex', cell.iso === tabbable && !cell.outside ? '0' : '-1');
        applyProjection(td, dayAria(cell.iso, state, config));
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = calendarBehavior.aria(state, config, ids);
    for (const part of ['grid', 'heading', 'prev', 'next'] as const) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    if (heading) heading.textContent = formatMonth(state.currentMonth);
    renderDays();
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const focusedCell = (): HTMLElement | null => {
    const active = (root.getRootNode() as Document | ShadowRoot)
      .activeElement as HTMLElement | null;
    const cell = active?.closest<HTMLElement>(DAY_SELECTOR) ?? null;
    return cell && root.contains(cell) ? cell : null;
  };

  const activate = (iso: ISODate) => {
    if (isDateDisabled(iso, config)) return;
    const before = effectiveSelected(memory.get(), config);
    dispatch('setSelected', config, { selection: nextSelection(before, iso) });
    root.dispatchEvent(new CustomEvent('calendarselect', { bubbles: true, detail: { date: iso } }));
  };

  const onClick = (event: Event) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(DAY_SELECTOR);
    const iso = cell?.dataset['value'];
    if (iso && root.contains(cell) && cell?.getAttribute('data-outside') !== 'true') activate(iso);
  };
  root.addEventListener('click', onClick);

  const prev = getPart('prev');
  const next = getPart('next');
  const onPrev = () => dispatch('shiftMonth', config, -1);
  const onNext = () => dispatch('shiftMonth', config, 1);
  prev?.addEventListener('click', onPrev);
  next?.addEventListener('click', onNext);

  const focusFocusedCell = () => {
    const state = memory.get();
    if (!state.focusedDate) return;
    const cell = grid?.querySelector<HTMLElement>(
      `${DAY_SELECTOR}[data-value="${state.focusedDate}"]`,
    );
    cell?.focus();
  };

  const stopMovement = createKeyboardHandler(root, {
    key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'],
    preventDefault: true,
    handler: (event) => {
      const cell = focusedCell();
      const from = cell?.dataset['value'] ?? tabbableDate(memory.get(), config);
      const target = dateForKey(event.key, from, event.shiftKey);
      if (!target) return;
      dispatch('focusDate', config, target);
      focusFocusedCell();
    },
  });

  const stopActivate = createKeyboardHandler(root, {
    key: ['Enter', 'Space'],
    preventDefault: true,
    handler: () => {
      const cell = focusedCell();
      const iso = cell?.dataset['value'];
      if (iso && cell?.getAttribute('data-outside') !== 'true') activate(iso);
    },
  });

  return () => {
    unsubscribe();
    stopMovement();
    stopActivate();
    root.removeEventListener('click', onClick);
    prev?.removeEventListener('click', onPrev);
    next?.removeEventListener('click', onNext);
  };
}
