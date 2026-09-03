import type { PopoverConfig, PopoverState } from './popover.behavior';

export interface PopoverClassSet {
  content: string;
  close: string;
  closeIcon: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class -- a behavior root never styles itself; layout
// belongs to the consumer's Container/Grid (operator ruling, 2026-08-02).

// The panel sits on the popover depth token and fills with the popover surface
// tokens. Enter/exit is PRESENCE (#1996): the node arrives with its keyframe
// already attached and runs it, and usePresence holds the unmount until the
// exit keyframe ends. No @starting-style, no transition-behavior.
//
// THE CELL IS THE SPEC (#2017). These two utilities are the generated
// consumption of two rows of packages/ui/docs/spec/matrix/motion.jsonl --
// popover / content / closed -> open (moderate, enter, extent pop) and
// popover / content / open -> closed (fast, exit, extent pop). A popover is
// smaller and nearer than a dialog, so it arrives one tier quicker; that is the
// matrix's judgement, not this file's. This also replaces the tailwindcss-animate
// vocabulary (animate-in / fade-in-0 / zoom-in-95 / slide-in-from-*) that used to
// sit here -- the hand-rolled form dropdown-menu's own classes call prohibited,
// and it depended on a plugin this repo does not ship. Slide-on-enter goes with
// it: it is not part of the presence contract and no acceptance asks for it.
//
// NO motion-reduce:animate-none. The generated utility zeroes animation-duration
// under prefers-reduced-motion instead (mechanism B). That preserves the
// keyframe's end state, which animate-none never reaches -- it removes the
// animation rather than completing it instantly -- AND it still fires
// animationend, which is what presence releases the unmount on; animate-none
// fires nothing, so every reduced-motion close would fall through to the
// backstop timer. The two mechanisms never compose either: `animation: none`
// resets the shorthand and discards the zeroed duration wherever it wins.
const contentClasses =
  'z-depth-popover w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:animate-scale-in-moderate-enter data-[state=closed]:animate-scale-out-fast-exit ' +
  'data-[state=closed]:pointer-events-none';

// The optional in-panel dismiss control. Sized to the touch floor, scaling
// down through the container query, echoing dialog's close affordance.
//
// THE ROW: popover / close button / hover -- fade + color, duration-fast,
// ease-standard (motion.md:164). It is a TRANSITION, not a keyframe: the control
// stays put and only its appearance changes, so it is excluded from the cell
// vocabulary by name (`popover | close button | hover`, EXCLUDED_ROWS
// .notAPresenceChange in packages/design-tokens/test/motion-cells.test.ts) and
// consumes the generics directly. `ease-standard` is what this fix adds; the
// tier was already named and no literal was ever written here.
//
// THE COLOR HALF OF THE ROW HAS NO MOMENT ON THIS CONTROL, reported rather than
// faked: the hover changes opacity alone (opacity-70 -> opacity-100) and no
// background, text or border colour moves, so there is nothing for a
// `transition-colors` to drive. Inventing a hover colour to fill the row would
// be a design decision this issue does not carry. dialog, sheet and drawer carry
// the identical row on the identical control and have the identical gap.
//
// `motion-reduce:transition-none` is PRE-EXISTING and stays. It is the correct
// reduced-motion path for a transition (popover.classes.test.ts pins it), and
// unlike `animate-none` on a keyframe it discards nothing -- the keyframe
// mechanism is the one that must not carry an escape.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-fast ease-standard motion-reduce:transition-none hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

export function popoverClasses(_config: PopoverConfig, _state: PopoverState): PopoverClassSet {
  return {
    content: contentClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
