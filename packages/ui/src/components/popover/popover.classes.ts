import type { PopoverConfig, PopoverState } from './popover.behavior';

export interface PopoverClassSet {
  content: string;
  close: string;
  closeIcon: string;
}

// The panel sits on the popover depth token and fills with the popover surface
// tokens. Enter and exit run through the semantic motion layer: motion-dropdown-in
// on open, motion-dropdown-out on close. Those carry the tier and the curve, so no
// duration or easing is written here. Both handle prefers-reduced-motion inside
// their own definition -- a motion-reduce guard on this element would fight that
// rule rather than reinforce it, since the utility keeps a short opacity fade
// where the guard would remove motion outright.
//
// These are transitions, not animations, so both endpoints have to be stated.
// OPACITY ONLY, deliberately: positionPopover applies placement as an inline
// style.transform = translate(...), and an inline style outranks any
// class-declared transform, so scale- or translate-based endpoints cannot move
// this panel -- the utilities' transform entry is inert here. The old zoom and
// slide classes appeared to work only because CSS animations outrank inline
// styles for the properties they animate; a transition gets no such priority.
// Do not re-add a zoom or a directional slide without first moving placement
// onto a wrapper element so the panel's own transform is free.
// The enter needs one thing beyond the two endpoints. This panel MOUNTS on open
// (PopoverContent returns null while not present), so on the opening frame there
// is no previous computed opacity to interpolate away from and the transition has
// nothing to run -- it would paint straight to opacity-100. An animation would not
// care, which is why the old animate-in appeared to cover this. `starting:` emits
// @starting-style, giving the freshly-inserted element the from-value a transition
// requires. It is unconditional rather than state-scoped because the element only
// ever enters the DOM open.
const contentClasses =
  'z-depth-popover w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg outline-none ' +
  'data-[state=open]:motion-dropdown-in data-[state=closed]:motion-dropdown-out ' +
  'starting:opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0';

// The optional in-panel dismiss control. Sized to the touch floor, scaling
// down through the container query, echoing dialog's close affordance.
//
// The hover fade stays hand-rolled rather than semantic: motion-hover transitions
// colour, background-color and border-color, and this control moves opacity, which
// that utility does not carry. So it drops to the tier tokens instead -- the
// middle of the scale, not the fast tier the old raw 150ms sat on. Because no
// semantic utility owns this element, the motion-reduce guard is still required
// here; nothing else would disable the fade.
//
// The duration goes through arbitrary-value syntax on purpose. `--ease-*` is a
// Tailwind theme namespace, so `ease-standard` generates a real utility, but
// `--duration-*` is NOT one -- Tailwind's `duration-*` takes bare numbers, so a
// tidy-looking `duration-moderate` compiles to nothing at all. Do not "clean this
// up" to the bare form without first checking the emitted sheet; that swap is
// silent and reintroduces exactly the dead-class bug this file was fixed for.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-[var(--duration-moderate)] ease-standard ' +
  'motion-reduce:transition-none hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

export function popoverClasses(_config: PopoverConfig, _state: PopoverState): PopoverClassSet {
  return {
    content: contentClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
