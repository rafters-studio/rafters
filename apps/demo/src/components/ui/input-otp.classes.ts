import type { InputOtpConfig, InputOtpState } from '@/components/ui/input-otp.behavior';

export interface InputOtpClassSet {
  root: string;
  input: string;
  group: string;
  slot: string;
  char: string;
  caret: string;
  caretBar: string;
  separator: string;
}

// `group` is load-bearing, not decoration: the slots read the ROOT's projected
// data-disabled through group-data-*, so disabled presentation needs no second
// state channel and no per-slot class recomposition in any framework.
const rootClasses = 'group flex items-center gap-2';

// The real field is present to AT and to autofill (it keeps its accessible
// name, its value and its focus ring obligations) but never painted -- the
// slots are its visible surface. sr-only, never display:none.
const inputClasses = 'sr-only';

const groupClasses = 'flex items-center';

// Every state rides a projected data-attribute, so light-DOM markup, the WC and
// React all reach the same presentation with no class recomposition anywhere:
// active from data-active, filled from data-filled, disabled from the root.
const slotClasses =
  'relative flex h-9 w-9 items-center justify-center ' +
  'border-y border-r border-input text-body-small shadow-sm ' +
  'transition-all duration-150 motion-reduce:transition-none ' +
  'first:rounded-l-md first:border-l last:rounded-r-md ' +
  'data-[active=true]:z-10 data-[active=true]:ring-1 data-[active=true]:ring-ring ' +
  'data-[filled=true]:text-foreground ' +
  'group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50';

const charClasses = 'pointer-events-none';

const caretClasses = 'pointer-events-none absolute inset-0 flex items-center justify-center';

// The caret-blink feedback loop. Duration and easing come from the token-backed
// animate-pulse utility; reduced motion stills it rather than hiding it, so the
// caret still marks the slot for a user who asked for less movement.
const caretBarClasses = 'h-4 w-px animate-pulse bg-foreground motion-reduce:animate-none';

const separatorClasses = 'flex items-center justify-center text-muted-foreground';

export function inputOtpClassSet(_config: InputOtpConfig, _state: InputOtpState): InputOtpClassSet {
  return {
    root: rootClasses,
    input: inputClasses,
    group: groupClasses,
    slot: slotClasses,
    char: charClasses,
    caret: caretClasses,
    caretBar: caretBarClasses,
    separator: separatorClasses,
  };
}
