import type { DatePickerConfig, DatePickerState } from './date-picker.behavior';

export interface DatePickerClassSet {
  /** The button that opens the popup and shows the committed date. */
  trigger: string;
  /** The label span inside the trigger (date or placeholder). */
  value: string;
  /** The calendar glyph at the trailing edge of the trigger. */
  icon: string;
  /** The anchored popup holding the calendar. */
  content: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class. Current choice (2026-08-02): a behavior root
// never styles itself, because layout belongs to the consumer's Container/Grid;
// revisable.

// The trigger is a form control that opens a popup and shows a value: select's
// trigger vocabulary (touch floor h-11 scaling down via the container query,
// input border, focus ring, disabled look off the projected attributes), minus
// its motion.
//
// MOMENTS WITH NO ROW, reported rather than invented: the trigger's hover
// border colour (`hover:border-input-hover`) and its focus ring both change
// state, and motion.jsonl has no date-picker / trigger row for either. No row,
// no motion: both stay instant here. Designer: assign rows if they should move.
const triggerClasses =
  'flex h-11 @md:h-9 w-full items-center justify-between gap-2 rounded-md ' +
  'border border-input bg-background px-3 py-2 text-body-small ts-body-small shadow-sm ring-offset-background ' +
  'hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

// Placeholder look keys off data-empty, which the score projects when nothing is
// selected (select's convention).
const valueClasses = 'pointer-events-none truncate text-left data-[empty]:text-muted-foreground';

// The oracle's calendar glyph sizing and weight (select's chevron twin).
const iconClasses = 'size-4 shrink-0 opacity-50';

// The popup sits on the popover depth token and fills with the popover surface
// tokens; it hugs the calendar (shadcn's `w-auto p-0` on PopoverContent, the
// oracle's `p-0`).
//
// TWO MATRIX ROWS NAME THIS PART, both consumed here as a transition between
// two poses keyed off the projected open axis (data-state), the drawer way:
//
//   date-picker / content / closed -> open: fade + zoom over opacity and
//   transform: scale -- duration-moderate, ease-enter, extent-pop. This is the
//   open pose, so it owns the transition INTO it.
//
//   date-picker / content / open -> closed: fade + zoom -- duration-fast,
//   ease-exit, extent-pop. This is the base (closed) pose.
//
// The zoom rides `extent-pop`: the class picks the member (writing the
// `--rafters-consumed-extent` alias) and `scale-(--rafters-consumed-extent)`
// reads that alias back, as context-menu's subContent does. Closed the part
// rests at the pop extent and opacity 0; open it is scale-100 and opacity 100.
//
// The part stays present: closed, it is `inert` (set by the performance, not
// here) and `pointer-events-none`, never `hidden`, because `display: none`
// stops the transition. `fixed` keeps the always-present part out of flow;
// on open the performance places it against the trigger through popover's
// `positionPopover`, which writes `left`/`top` (`placeFloating`, #2403).
//
// The transition utility is the bare `transition`: it is the one named utility
// that covers both opacity and scale and leaves out `left`/`top`, so the
// placement never animates. `transition-all` would animate the placement;
// `transition-opacity` drops the zoom; an arbitrary property list is a
// bracketed value React's `classy()` drops (#2396).
const contentClasses =
  'fixed z-depth-popover w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none ' +
  'pointer-events-none opacity-0 extent-pop scale-(--rafters-consumed-extent) ' +
  'transition duration-fast ease-exit ' +
  'data-[state=open]:pointer-events-auto data-[state=open]:opacity-100 data-[state=open]:scale-100 ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter';

/** The view: class strings keyed by config/state. No logic. */
export function datePickerClasses(
  _config: DatePickerConfig,
  _state: DatePickerState,
): DatePickerClassSet {
  return {
    trigger: triggerClasses,
    value: valueClasses,
    icon: iconClasses,
    content: contentClasses,
  };
}
