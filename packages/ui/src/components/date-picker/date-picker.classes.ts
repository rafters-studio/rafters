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
// and the config, and NO class -- a behavior root never styles itself (operator
// ruling, 2026-08-02).

// The trigger is a form control that opens a popup and shows a value: select's
// trigger vocabulary (touch floor h-11 scaling down via the container query,
// input border, focus ring, disabled look off the projected attributes), minus
// its motion. NO MOTION is named in this file: date-picker's rows in
// motion.jsonl are owned by #2282, built after this port.
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
// oracle's `p-0`). Presence is the `hidden` toggle; no enter/exit keyframe yet.
const contentClasses =
  'z-depth-popover w-auto rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none';

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
