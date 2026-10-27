import type { InputConfig, InputState } from './input.behavior';

export interface InputClassSet {
  input: string;
  error: string;
  /** The row a field sits in when it has an icon: draws the chrome, lays out as a grid. */
  row: string;
  /** The field inside a row: the row draws the border and ring, so it draws none. */
  rowInput: string;
  /** InputGroup's affix parts, as the grid cells that hold the icon wrappers. */
  addonStart: string;
  addonEnd: string;
  startIcon: string;
  endIcon: string;
}

// bg-transparent, never a page-fill: the control inherits the surface it sits
// on. Validity is styled off the projected aria-invalid, so light-DOM markup,
// the WC, and React all pick up the destructive border with no extra class.
//
// Two rows, two properties, one element:
//   input / root / focus -- ring -- duration-micro, ease-linear
//   input / root / valid <-> invalid -- color -- fast, standard
//
// The ring rides `box-shadow` (Tailwind's `ring-*` is a shadow), validity rides
// `border-color`, so both are named in the transition list -- a shadow-only
// transition left the border snapping.
//
// PARTIAL ROW: the validity row assigns background, text and border, but only
// the border has a moment here -- `aria-invalid:border-destructive` is the whole
// invalid change. Background stays transparent and text stays foreground in both
// states, so the row's background/text half has nothing to time and is reported,
// not faked; neither property is in the transition list.
//
// HONEST LIMIT: Tailwind emits one `transition-duration` per rule, so the two
// rows cannot carry different tiers per property. The base rule takes focus's
// micro/linear and `aria-invalid:` lifts the whole element to the validity row's
// fast/standard while the field is invalid. The consequence is that the return to
// VALID runs at the focus tier: `aria-invalid` is already gone by the time that
// transition starts, so the rule that would have timed it no longer matches.
//
// NO TYPING ROW, and none is wanted -- the input rule says layout driven by the
// user's own keystrokes tracks instantly. Nothing here times a size change.
const inputClasses =
  'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-body-small ts-body-small ' +
  'text-foreground placeholder:text-muted-foreground ' +
  'ring-offset-background ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'transition-[box-shadow,border-color] duration-micro ease-linear ' +
  'aria-invalid:duration-fast aria-invalid:ease-standard ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'read-only:cursor-default ' +
  'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive-ring';

const errorClasses = 'text-body-small ts-body-small text-destructive';

// The row for a field with an icon. The row draws what the bare field draws --
// border, ring, validity, dim -- off the field inside it (has-*), and lays its
// columns out in reading order with Grid, so the icons swap sides on a
// dir="rtl" page with no direction class. One named track list per icon
// combination (classy skips arbitrary track lists), so an absent icon leaves no
// empty track and no stray gap. Padding tightens on the icon's side only.
const rowClasses =
  'grid grid-flow-col items-center gap-2 h-10 w-full rounded-md border border-input bg-transparent px-3 ' +
  'ring-offset-background ' +
  'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ' +
  'transition-[box-shadow,border-color] duration-micro ease-linear ' +
  'has-[[aria-invalid=true]]:duration-fast has-[[aria-invalid=true]]:ease-standard ' +
  'has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:focus-within:ring-destructive-ring ' +
  'has-disabled:cursor-not-allowed has-disabled:opacity-50 ' +
  'has-data-[icon=inline-start]:ps-2 has-data-[icon=inline-end]:pe-2';

const rowTracks = {
  start: 'grid-cols-affix-start',
  end: 'grid-cols-affix-end',
  both: 'grid-cols-affix-both',
} as const;

const rowInputClasses =
  'h-full w-full min-w-0 bg-transparent text-body-small ts-body-small ' +
  'text-foreground placeholder:text-muted-foreground border-0 ' +
  'focus:outline-none focus-visible:outline-none ' +
  'disabled:cursor-not-allowed read-only:cursor-default';

// The wrappers only place and hide: the brand brings its icons, sizing included.
const addonClasses = 'inline-grid place-items-center text-muted-foreground';
const iconClasses = 'inline-grid place-items-center';

export function inputClassSet(config: InputConfig, _state: InputState): InputClassSet {
  const track =
    config.startIcon && config.endIcon
      ? rowTracks.both
      : config.endIcon
        ? rowTracks.end
        : rowTracks.start;
  return {
    input: inputClasses,
    error: errorClasses,
    row: `${rowClasses} ${track}`,
    rowInput: rowInputClasses,
    addonStart: addonClasses,
    addonEnd: addonClasses,
    startIcon: iconClasses,
    endIcon: iconClasses,
  };
}
