import type { InputOtpConfig, InputOtpState } from './input-otp.behavior';

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
//
// Two rows land on the slot, at the same tier with different curves:
//   input-otp / slot / focus -- ring -- duration-micro, ease-linear
//   input-otp / active slot / advance -- swap -- duration-micro, ease-standard
//     (the advance row is `proposed` in the matrix: consumed as written, unreviewed)
//
// UNRESOLVED ROW CONFLICT -- reported, not resolved. The active slot's ring IS
// the advance marker: `data-[active=true]:ring-1` is both the focus indication
// and the "the caret moved here" signal, and no DOM state distinguishes plain
// focus from advance. Both rows are transcribed -- the base rule carries the
// focus row's `ease-linear`, `data-[active=true]:` carries the advance row's
// `ease-standard` -- but a CSS transition takes its timing function from the
// after-change style, so:
//   - the ring ARRIVING (data-active -> true) always runs ease-standard, the
//     advance row's curve, including on plain focus;
//   - the focus row's ease-linear only ever governs the ring LEAVING (blur, or
//     the caret moving off the slot).
// The tier agrees (micro on both rows); the curve does not. The focus row's
// curve is unreachable for the moment it names until the matrix either merges
// these rows or the component grows a signal that separates focus from advance.
//
// `transition-all` is narrowed to the ring (`box-shadow`), the slot border, and
// the filled-state text colour.
//
// Moment with no row: `data-[filled=true]:text-foreground` (a slot receiving a
// character) is a colour change the matrix has no input-otp row for. It rides
// the slot's transition above rather than a tier of its own; it is not claimed
// as consuming either row.
const slotClasses =
  'relative flex h-9 w-9 items-center justify-center ' +
  'border-y border-r border-input text-body-small ts-body-small shadow-sm ' +
  'transition-[box-shadow,border-color,color] duration-micro ease-linear ' +
  'data-[active=true]:ease-standard ' +
  'first:rounded-l-md first:border-l last:rounded-r-md ' +
  'data-[active=true]:z-10 data-[active=true]:ring-1 data-[active=true]:ring-ring ' +
  'data-[filled=true]:text-foreground ' +
  'group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50';

const charClasses = 'pointer-events-none';

const caretClasses = 'pointer-events-none absolute inset-0 flex items-center justify-center';

// The caret-blink feedback loop.
//
// THE CELL IS THE SPEC (#2017, #2154). `animate-caret-blink-blink` is the
// generated consumption of `input-otp / caret / idle` in
// `packages/ui/docs/spec/matrix/motion.jsonl` (period `blink`) -- one
// reference, not the stock `animate-pulse` this used before #2155's audit
// migrated it onto the caret's own cell.
//
// NO motion-reduce:animate-none. A period-kind cell is exempt from the
// reduced-motion zeroing law by design (#2155): the utility carries no
// `@media (prefers-reduced-motion: reduce)` block at all, so the caret keeps
// blinking at the same period regardless of the user's preference -- see
// `packages/ui/src/primitives/intelligence-integration.ts:106-121` and
// `REDUCED_MOTION_ZEROED` in `packages/design-tokens/src/exporters/tailwind.ts`
// for the ruling this follows. This is a behavior change from the previous
// `motion-reduce:animate-none`, which stilled the caret under reduced motion.
const caretBarClasses = 'h-4 w-px animate-caret-blink-blink bg-foreground';

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
