import type { DialogConfig, DialogState } from '@/components/ui/dialog.behavior';

export interface DialogClassSet {
  overlay: string;
  container: string;
  content: string;
  header: string;
  footer: string;
  title: string;
  description: string;
  close: string;
  closeIcon: string;
}

// THE CELL IS THE SPEC (#2017). Two rows of the motion matrix --
// dialog / overlay / closed -> open (normal, enter) and
// dialog / overlay / open -> closed (moderate, exit). Both rows carry
// provenance "proposed": a starting position, never reviewed.
//
// The overlay carries data-state from the behavior's aria projection
// (dialog.behavior.ts), so the state selectors match in all three renderers.
//
// ROW AND BEHAVIOR DISAGREE ON THE EXIT. The open -> closed row assumes the
// scrim is held present while its keyframe runs; nothing holds it. React
// returns null the instant `effectiveOpen` flips false (dialog.tsx), Astro
// renders `hidden={!open}`, and the DOM binding sets `el.hidden = !open`
// (dialog.behavior.ts). `usePresence` wraps the CONTENT only. So
// animate-fade-out-moderate-exit is named here as the row assigns it and will
// render its first frame the day the overlay gets a presence hold. Consuming
// the row does not, by itself, make the exit visible.
const overlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 ' +
  'data-[state=open]:animate-fade-in-normal-enter data-[state=closed]:animate-fade-out-moderate-exit';

const containerClasses = 'fixed inset-0 z-depth-modal flex items-center justify-center p-4';

// data-[state=closed]:pointer-events-none -- the ratified motion ruling's
// taste residue: while a closing overlay is held present through its exit
// window (usePresence defers the unmount), it must not swallow clicks.
// Enter/exit is PRESENCE (#1996): the node MOUNTS with its keyframe attached
// and runs it -- no @starting-style, which is a transitions-on-mount hack this
// system does not use -- and usePresence holds the unmount until the exit
// keyframe ends.
//
// THE CELL IS THE SPEC (#2017). These two utilities are the generated
// consumption of two rows of packages/ui/docs/spec/matrix/motion.jsonl --
// dialog / content / closed -> open (normal, enter, extent pop) and
// dialog / content / open -> closed (moderate, exit, extent pop). One reference
// per cell, exactly as every other generic is consumed: no raw var(), no
// literal, and no shared animation standing in for three distinct moments (the
// #2012 defect this replaces).
//
// NO motion-reduce:animate-none. Reduced motion is handled INSIDE the generated
// utility, which zeroes animation-duration under the media query. Adding
// animate-none here would win destructively -- `animation: none` resets the
// shorthand and discards the zeroed duration with it -- and would also drop the
// element short of the keyframe's end state, which a zeroed duration reaches
// instantly.
const contentClasses =
  'relative w-full max-w-lg rounded-lg border border-card-border bg-card p-6 text-card-foreground shadow-lg ' +
  'data-[state=open]:animate-scale-in-normal-enter data-[state=closed]:animate-scale-out-moderate-exit ' +
  'data-[state=closed]:pointer-events-none';

const headerClasses = 'flex flex-col space-y-1.5 text-center @md:text-left';

const footerClasses = 'flex flex-col-reverse @md:flex-row @md:justify-end @md:space-x-2';

const titleClasses = 'text-title-medium ts-title-medium leading-none';

const descriptionClasses = 'text-body-small ts-body-small text-muted-foreground';

// dialog / close button / hover (fast, standard). A hover on a button that
// stays put is a TRANSITION, so the row is consumed as composed generics --
// duration-fast plus the standard curve -- not as a keyframe.
//
// THE ROW'S COLOUR HALF HAS NO MOMENT HERE. It declares fade + color over
// ['opacity', 'background, text, border']; this button only raises opacity on
// hover, and it inherits no background, text or border change to transition.
// The fade half is consumed; the colour half is reported rather than invented,
// because a hover colour nobody chose is a value nobody chose.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-fast ease-standard hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

export function dialogClasses(_config: DialogConfig, _state: DialogState): DialogClassSet {
  return {
    overlay: overlayClasses,
    container: containerClasses,
    content: contentClasses,
    header: headerClasses,
    footer: footerClasses,
    title: titleClasses,
    description: descriptionClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
