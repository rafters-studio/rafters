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
// keyframe's end state AND still fires animationend, which is what presence
// releases the unmount on -- animate-none fires nothing, so every reduced-motion
// close would fall through to the backstop timer. The two mechanisms never
// compose: `animation: none` resets the shorthand and discards the zeroed
// duration wherever it wins.
const contentClasses =
  'z-depth-popover w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:animate-popover-content-open data-[state=closed]:animate-popover-content-close ' +
  'data-[state=closed]:pointer-events-none';

// The optional in-panel dismiss control. Sized to the touch floor, scaling
// down through the container query, echoing dialog's close affordance.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-150 motion-reduce:transition-none hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

export function popoverClasses(_config: PopoverConfig, _state: PopoverState): PopoverClassSet {
  return {
    content: contentClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
