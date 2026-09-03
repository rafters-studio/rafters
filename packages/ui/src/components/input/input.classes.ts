import type { InputConfig, InputState } from './input.behavior';

export interface InputClassSet {
  input: string;
  error: string;
}

// bg-transparent, never a page-fill: the control inherits the surface it sits
// on. Validity is styled off the projected aria-invalid, so light-DOM markup,
// the WC, and React all pick up the destructive border with no extra class.
//
// Two rows, two properties, one element:
//   input / root / focus -- ring -- duration-micro, ease-linear
//   input / root / valid <-> invalid -- color -- duration-fast, ease-standard
//
// The ring rides `box-shadow` (Tailwind's `ring-*` is a shadow), validity rides
// `border-color`, so both are named in the transition list -- `transition-shadow`
// alone left the border snapping.
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

export function inputClassSet(_config: InputConfig, _state: InputState): InputClassSet {
  return {
    input: inputClasses,
    error: errorClasses,
  };
}
