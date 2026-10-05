import { compose, type GlueSlice, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type KeyInput,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { formValueAttrs } from '../../primitives/form-value';
import { onPointerDownOutside } from '../../primitives/outside-click';
import {
  bindCalendar,
  emptySelection,
  fromISO,
  nextSelection,
  parseSelection,
  serializeSelection,
  toISO,
  type CalendarSelection,
  type ISODate,
} from '../calendar/calendar.behavior';
import {
  focusFirst,
  isOpen,
  popover,
  positionPopover,
  type PopoverActions,
  type PopoverPart,
  type PopoverPositionOptions,
  type PopoverState,
} from '../popover/popover.behavior';

/**
 * Date picker: a calendar in an anchored popup. A trigger opens it, grid
 * navigation selects a date, and the selected date submits with its form.
 *
 * Nothing here is a new popover or a new calendar (Spec 02):
 *
 * - `popover` (the score) is folded in whole as the first slice: the
 *   disclosable open/close axis, the trigger/content/anchor/close parts,
 *   `aria-haspopup="dialog"`, `role="dialog"`, and Escape on the content.
 * - `date-picker-value` is the committed value: the selection the trigger
 *   shows and the form submits. It uses calendar's own selection type and
 *   helpers; it adds no date math.
 * - The glue is the only new behavior: `commit` sets the value AND closes the
 *   popup when the selection is complete (a single date, or a range with both
 *   ends), the disabled gate, and the dialog's accessible name.
 *
 * The grid itself is calendar's performance, nested inside the content: React
 * renders `<Calendar>` controlled by the picker's effective value; the WC and
 * Astro performances nest calendar's own markup and `bindCalendar` drives it,
 * reporting each activation through the `calendarselect` event the glue
 * listens for. `calendarBehavior` is NOT folded into this score -- that would
 * move the grid onto the picker's cell and force a second calendar binding.
 */

export type DatePickerMode = 'single' | 'range';

export interface DatePickerConfig {
  /** Selection cardinality. Default 'single'. */
  mode: DatePickerMode;
  /** Controlled committed value: shadows the intrinsic state when present. */
  value?: CalendarSelection | undefined;
  /** Uncontrolled seed for the committed value. */
  defaultValue?: CalendarSelection | undefined;
  /** Controlled open (popover's axis). */
  open?: boolean | undefined;
  /** Uncontrolled open seed. */
  defaultOpen?: boolean | undefined;
  /** Refuses opening and committing. */
  disabled?: boolean | undefined;
}

export interface DatePickerValueState {
  /** Intrinsic committed value -- ignored while a controlled value is present. */
  value: CalendarSelection;
}

export type DatePickerState = PopoverState & DatePickerValueState;

export type DatePickerActions = PopoverActions & {
  /** Commit an already-computed selection (calendar's `nextSelection` owns the
   *  transition). Wrapped so the union payload does not distribute. */
  commit: { selection: CalendarSelection };
};

/** `value` is the trigger's label span -- the part that shows the committed
 *  date or the placeholder. */
export type DatePickerValuePart = 'value';
export type DatePickerPart = PopoverPart | DatePickerValuePart;

export { isOpen };

/** The oracle's placeholder (the old date-picker). */
export const DEFAULT_PLACEHOLDER = 'Pick a date';

/** The oracle's placement: below the trigger, start-aligned, 4px off. */
export const DATE_PICKER_POSITION: PopoverPositionOptions = {
  side: 'bottom',
  align: 'start',
  sideOffset: 4,
};

// ==================== Pure value helpers ====================

/** The effective committed value: a controlled `config.value` shadows state. */
export function effectiveValue(
  state: DatePickerValueState,
  config: DatePickerConfig,
): CalendarSelection {
  return config.value ?? state.value;
}

/** Whether a selection is finished: a single date is set, or a range has both
 *  ends. A partial range keeps the popup open for its second click. */
export function isComplete(selection: CalendarSelection): boolean {
  if (selection.mode === 'single') return selection.date !== null;
  if (selection.mode === 'range') return selection.from !== null && selection.to !== null;
  return false;
}

/** Whether nothing is selected (the trigger shows the placeholder). */
export function isEmpty(selection: CalendarSelection): boolean {
  if (selection.mode === 'single') return selection.date === null;
  if (selection.mode === 'range') return selection.from === null;
  return selection.dates.length === 0;
}

/** The oracle's display format: `Jul 8, 2026`. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * The trigger label for a selection, or '' when empty. A range shows its start
 * alone until the end is picked, then `start - end` (the oracle's format).
 * `format` is the React-only formatter override; WC and Astro use the default.
 */
export function formatValue(
  selection: CalendarSelection,
  format: (date: Date) => string = formatDate,
): string {
  if (selection.mode === 'single') return selection.date ? format(fromISO(selection.date)) : '';
  if (selection.mode === 'range') {
    if (!selection.from) return '';
    if (!selection.to) return format(fromISO(selection.from));
    return `${format(fromISO(selection.from))} - ${format(fromISO(selection.to))}`;
  }
  return selection.dates.map((iso) => format(fromISO(iso))).join(', ');
}

/**
 * The form value: `yyyy-mm-dd` for a single date, `from..to` for a range, ''
 * when empty. The same serialization calendar's `data-selected` and
 * `parseSelection` use, so one string seeds the picker, the nested calendar and
 * the hidden input.
 */
export function serializeValue(selection: CalendarSelection): string {
  if (selection.mode === 'single') return selection.date ?? '';
  if (selection.mode === 'range') {
    return selection.from ? `${selection.from}..${selection.to ?? ''}` : '';
  }
  return selection.dates.join(',');
}

/** A `{ from, to }` pair of optional Dates -- the React range value shape. */
export interface DatePickerRange {
  from: Date | undefined;
  to: Date | undefined;
}

/** A React value (a Date or a range) as the behavior's tagged selection. */
export function toSelection(
  mode: DatePickerMode,
  value: Date | DatePickerRange | undefined,
): CalendarSelection {
  if (mode === 'range') {
    const range = value instanceof Date ? undefined : value;
    return {
      mode: 'range',
      from: range?.from ? toISO(range.from) : null,
      to: range?.to ? toISO(range.to) : null,
    };
  }
  return { mode: 'single', date: value instanceof Date ? toISO(value) : null };
}

/** A React prop value as config: `undefined` stays `undefined` (uncontrolled /
 *  no seed), anything else becomes the tagged selection. */
export function selectionProp(
  mode: DatePickerMode,
  value: Date | DatePickerRange | undefined,
): CalendarSelection | undefined {
  return value === undefined ? undefined : toSelection(mode, value);
}

/**
 * The React controlled value. Controlled is decided by the prop's PRESENCE,
 * not its definedness: `value={date}` with `date` undefined is a controlled
 * empty picker (the shadcn `useState<Date>()` shape), so a reset to undefined
 * clears the picker instead of falling back to a stale intrinsic value.
 */
export function controlledSelection(
  mode: DatePickerMode,
  props: { value?: Date | DatePickerRange | undefined },
): CalendarSelection | undefined {
  return 'value' in props ? toSelection(mode, props.value) : undefined;
}

/**
 * The `selected` prop for calendar's React performance. An empty range is
 * passed as `{ from: undefined, to: undefined }` so the grid stays controlled
 * (calendar reads `undefined` as uncontrolled).
 */
export function calendarSelected(selection: CalendarSelection): Date | DatePickerRange | undefined {
  if (selection.mode === 'range' && !selection.from) return { from: undefined, to: undefined };
  return fromSelection(selection);
}

/**
 * A remount key for calendar's React performance. Single mode has no
 * controlled-empty value (calendar reads `selected={undefined}` as
 * uncontrolled), so an emptied single picker remounts its grid to drop the
 * grid's own stale selection. A range never needs it (see calendarSelected).
 */
export function calendarKey(selection: CalendarSelection): string {
  return selection.mode === 'single' && isEmpty(selection) ? 'empty' : 'set';
}

/** A selection as the React value shape: a Date (or undefined) for single, a
 *  `{ from, to }` range (or undefined when empty) for range. */
export function fromSelection(selection: CalendarSelection): Date | DatePickerRange | undefined {
  if (selection.mode === 'single') return selection.date ? fromISO(selection.date) : undefined;
  if (selection.mode === 'range') {
    if (!selection.from) return undefined;
    return {
      from: fromISO(selection.from),
      to: selection.to ? fromISO(selection.to) : undefined,
    };
  }
  return undefined;
}

// ==================== Score ====================

/** Popover's score folded as a slice over the picker's config (a superset of
 *  popover's, so its functions accept it unchanged). */
const popoverSlice: Slice<DatePickerConfig, PopoverState, PopoverActions, PopoverPart> = popover;

const datePickerValue: Slice<
  DatePickerConfig,
  DatePickerValueState,
  Record<never, never>,
  DatePickerValuePart
> = {
  name: 'date-picker-value',
  parts: { value: {} },
  initialState: (config) => ({
    value: config.value ?? config.defaultValue ?? emptySelection(config.mode),
  }),
  aria: (state, config) => ({
    // Placeholder look keys off data-empty (select's convention).
    value: { 'data-empty': isEmpty(effectiveValue(state, config)) ? '' : undefined },
  }),
};

const datePickerGlue: GlueSlice<
  DatePickerConfig,
  DatePickerState,
  { commit: { selection: CalendarSelection } },
  DatePickerPart
> = {
  kind: 'glue',
  name: 'date-picker',
  actions: {
    // The cross-slice coordination: selecting a date sets the value and closes
    // the popup once the selection is complete. Same-value commits keep the
    // value ref so a controlled consumer's memory does not notify needlessly.
    commit: (state, { selection }) => {
      const value =
        serializeSelection(state.value) === serializeSelection(selection) ? state.value : selection;
      const open = isComplete(selection) ? false : state.open;
      return value === state.value && open === state.open ? state : { ...state, value, open };
    },
  },
  // compose ANDs every contributor's gate over EVERY action, so the glue sees
  // popover's `open` too; its declared action type names only `commit`.
  canDispatch: (_state, action, config) => {
    const name: string = action;
    return !(config.disabled && (name === 'open' || name === 'commit'));
  },
  aria: (_state, config, ids) => ({
    // The dialog is named by its trigger (the committed date or the
    // placeholder): no invented label copy, and never an unnamed dialog.
    content: { 'aria-labelledby': ids.trigger || undefined },
    trigger: { 'data-disabled': config.disabled ? '' : undefined },
  }),
};

export const datePicker: BehaviorSpec<
  DatePickerConfig,
  DatePickerState,
  DatePickerActions,
  DatePickerPart
> = compose('date-picker', popoverSlice, datePickerValue, datePickerGlue);

/**
 * The part ids every performance renders, derived from one base: trigger,
 * content and value are real; anchor and close are popover parts the picker
 * never renders, so they carry the empty-id sentinel.
 */
export function datePickerIds(base: string): PartIds<DatePickerPart> {
  return {
    trigger: `${base}-trigger`,
    content: `${base}-content`,
    value: `${base}-value`,
    anchor: '',
    close: '',
  };
}

// ==================== Composition function (bind + React share it) ====================

const DAY_TABSTOP = '[data-part="day"][tabindex="0"]';

/** Move focus into the grid on open: the calendar's single tabstop (the
 *  selected date, else today, else the first of the month), falling back to
 *  the first focusable in the content. */
export function focusGrid(content: HTMLElement | null): void {
  const cell = content?.querySelector<HTMLElement>(DAY_TABSTOP);
  if (cell) {
    cell.focus();
    return;
  }
  focusFirst(content);
}

export interface DatePickerPopupOptions {
  trigger: HTMLElement | null;
  content: HTMLElement | null;
  /** Called on an outside pointerdown (the light dismiss). */
  onDismiss: (event: Event) => void;
}

/**
 * The popup's impure work, started on the open edge and torn down on close:
 * position against the trigger (popover's `positionPopover` over
 * `collision-detector`) and follow scroll/resize, move focus to the grid, and
 * light-dismiss on an outside pointerdown (`outside-click`), sparing the trigger
 * so a toggle gesture does not dismiss then re-open. The teardown returns focus
 * to the trigger when focus was inside the popup (or dropped to the body when
 * the popup hid), so closing never strands keyboard focus.
 */
export function startDatePickerPopup({
  trigger,
  content,
  onDismiss,
}: DatePickerPopupOptions): () => void {
  if (!content) return () => undefined;
  const reposition = () => positionPopover(trigger, content, DATE_PICKER_POSITION);
  reposition();
  focusGrid(content);
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  const stopDismiss = onPointerDownOutside(content, (event) => {
    if (trigger?.contains(event.target as Node)) return;
    onDismiss(event);
  });
  return () => {
    window.removeEventListener('scroll', reposition, { capture: true } as EventListenerOptions);
    window.removeEventListener('resize', reposition);
    stopDismiss();
    const active = content.ownerDocument.activeElement;
    if (!active || active === content.ownerDocument.body || content.contains(active)) {
      trigger?.focus();
    }
  };
}

/** The score keymap for a keydown, with the part resolved by containment: any
 *  key inside the popup belongs to `content` (a focused day cell carries its
 *  own data-part, so `closest('[data-part]')` would miss Escape there). */
export function datePickerKeyAction(
  event: KeyInput,
  target: Node,
  trigger: HTMLElement | null,
  content: HTMLElement | null,
  state: DatePickerState,
  config: DatePickerConfig,
): keyof DatePickerActions | null {
  const part: DatePickerPart | null = content?.contains(target)
    ? 'content'
    : trigger?.contains(target)
      ? 'trigger'
      : null;
  return part ? datePicker.keymap(event, state, part, config) : null;
}

export { formValueAttrs, nextSelection, parseSelection };
export type { CalendarSelection, ISODate };

// ==================== bindDatePicker (WC + Astro share it) ====================

function readConfig(root: HTMLElement): DatePickerConfig {
  const data = root.dataset;
  const mode: DatePickerMode = data['pickerMode'] === 'range' ? 'range' : 'single';
  return {
    mode,
    defaultValue: parseSelection(mode, data['value'] ?? null),
    defaultOpen: data['defaultOpen'] === 'true',
    disabled: data['disabled'] === 'true',
  };
}

/**
 * The DOM-native binding of the date-picker score -- the client the Web
 * Component and the Astro <script> both import. React reads the projections
 * declaratively instead and runs the same `startDatePickerPopup`.
 *
 * Structure it reads (never generates): `[data-part="trigger"]` with its
 * `[data-part="value"]` label, `[data-part="content"]` holding a calendar root
 * (`[data-part="root"][data-mode]`), and an optional
 * `input[data-part="hidden-input"]`. The nested calendar is bound here unless
 * its own script already did (`data-bound`), and only what this bind bound is
 * torn down. Each `calendarselect` from the grid is committed through the glue,
 * which sets the value and closes a complete selection; render then writes the
 * label, the hidden input, and presence (`inert` while closed).
 *
 * Three-gotcha ledger: (1) uncontrolled here, so no callback compare; (2) the
 * projection is resolved and applied with `{ validate: false }`; (3) the WC
 * defers this bind one microtask (see date-picker.element.ts).
 */
export function bindDatePicker(root: HTMLElement): () => void {
  const config = readConfig(root);
  const placeholder = root.dataset['placeholder'] ?? DEFAULT_PLACEHOLDER;
  const getPart = (part: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  const trigger = getPart('trigger');
  const content = getPart('content');
  const valueEl = getPart('value');
  const hiddenInput = root.querySelector<HTMLInputElement>('input[data-part="hidden-input"]');

  const { memory, dispatch } = createBehavior(datePicker, config);

  const ids = {} as PartIds<DatePickerPart>;
  for (const part of Object.keys(datePicker.parts) as DatePickerPart[]) {
    ids[part] = getPart(part)?.id ?? '';
  }

  const calendarRoot = content?.querySelector<HTMLElement>('[data-part="root"][data-mode]') ?? null;
  let calendarCleanup: (() => void) | null = null;
  if (calendarRoot && calendarRoot.dataset['bound'] !== 'true') {
    calendarRoot.dataset['bound'] = 'true';
    calendarCleanup = bindCalendar(calendarRoot);
  }

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let popupCleanup: (() => void) | null = null;
  let wasOpen = false;
  const render = () => {
    const state = memory.get();
    const open = isOpen(state, config);
    const projection = datePicker.aria(state, config, ids);
    for (const part of Object.keys(projection) as DatePickerPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    const value = effectiveValue(state, config);
    if (valueEl) valueEl.textContent = formatValue(value) || placeholder;
    if (hiddenInput) hiddenInput.value = serializeValue(value);
    // Presence is `inert`, never `hidden`: `display: none` would stop the
    // row's transition (date-picker.classes.ts).
    if (content) content.inert = !open;
    if (open && !wasOpen) {
      popupCleanup = startDatePickerPopup({
        trigger,
        content,
        onDismiss: () => dispatch('close', config),
      });
    } else if (!open && wasOpen) {
      popupCleanup?.();
      popupCleanup = null;
    }
    wasOpen = open;
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  const onTriggerClick = () => {
    dispatch(isOpen(memory.get(), config) ? 'close' : 'open', config);
  };
  trigger?.addEventListener('click', onTriggerClick);

  const onKeydown = (event: KeyboardEvent) => {
    const action = datePickerKeyAction(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      event.target as Node,
      trigger,
      content,
      memory.get(),
      config,
    );
    if (action !== 'open' && action !== 'close') return;
    event.preventDefault();
    dispatch(action, config);
  };
  root.addEventListener('keydown', onKeydown);

  const onCalendarSelect = (event: Event) => {
    const detail = (event as CustomEvent<{ date?: unknown }>).detail;
    const iso = typeof detail?.date === 'string' ? detail.date : null;
    if (!iso) return;
    const before = effectiveValue(memory.get(), config);
    dispatch('commit', config, { selection: nextSelection(before, iso) });
  };
  root.addEventListener('calendarselect', onCalendarSelect);

  return () => {
    unsubscribe();
    popupCleanup?.();
    popupCleanup = null;
    calendarCleanup?.();
    if (calendarCleanup && calendarRoot) delete calendarRoot.dataset['bound'];
    trigger?.removeEventListener('click', onTriggerClick);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('calendarselect', onCalendarSelect);
  };
}
