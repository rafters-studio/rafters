import type { TextareaConfig, TextareaState } from './textarea.behavior';

export interface TextareaClassSet {
  textarea: string;
  error: string;
}

// bg-transparent, never a page-fill: the control inherits the surface it sits
// on. min-h-20 (not input's fixed h-10) gives the multi-line control room to
// start; the native <textarea> grows from there. Validity is styled off the
// projected aria-invalid, so light-DOM markup, the WC, and React all pick up
// the destructive border with no extra class.
// Two rows, two properties, one element -- the same pair input carries:
//   textarea / root / focus -- ring -- duration-micro, ease-linear
//   textarea / root / valid <-> invalid -- color -- duration-fast, ease-standard
//
// The ring rides `box-shadow` (Tailwind's `ring-*` is a shadow), validity rides
// `border-color`, so both are named in the transition list -- `transition-shadow`
// alone left the border snapping.
//
// HONEST LIMIT, identical to input's: one `transition-duration` per rule means the
// two rows cannot carry different tiers per property, so the return to VALID runs
// at the focus tier because `aria-invalid` no longer matches by then.
//
// THE INPUT RULE, and this is the component it was written for: textarea autosize
// -- the control growing as the user types -- tracks instantly. There is no height
// or size property in the transition list, and there was none before this change
// either, so nothing was removed here; the rule is upheld by the list staying
// narrow rather than by a deletion.
const textareaClasses =
  'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-body-small ts-body-small ' +
  'text-foreground placeholder:text-muted-foreground ' +
  'ring-offset-background ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'transition-[box-shadow,border-color] duration-micro ease-linear ' +
  'aria-invalid:duration-fast aria-invalid:ease-standard ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'read-only:cursor-default ' +
  'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive-ring';

const errorClasses = 'text-body-small ts-body-small text-destructive';

export function textareaClassSet(_config: TextareaConfig, _state: TextareaState): TextareaClassSet {
  return {
    textarea: textareaClasses,
    error: errorClasses,
  };
}
