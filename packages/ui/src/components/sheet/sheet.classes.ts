import type { SheetConfig, SheetSide, SheetState } from './sheet.behavior';

export interface SheetClassSet {
  overlay: string;
  header: string;
  footer: string;
  title: string;
  description: string;
  close: string;
  closeIcon: string;
}

// THE CELL IS THE SPEC (#2017). Two rows of the motion matrix --
// sheet / overlay / closed -> open (normal, enter) and
// sheet / overlay / open -> closed (moderate, exit). Both rows carry provenance
// "proposed": a starting position, never reviewed.
//
// ROW AND BEHAVIOR DISAGREE ON THE EXIT. The open -> closed row assumes the
// scrim is held present while its keyframe runs; nothing holds it. React
// returns null the instant `effectiveOpen` flips false, Astro renders
// `hidden={!open}`, and the DOM binding sets `el.hidden = !open`. `usePresence`
// wraps the CONTENT only. The class is named as the row assigns it and will
// render its first frame the day the overlay gets a presence hold.
const overlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 ' +
  'data-[state=open]:animate-fade-in-normal-enter data-[state=closed]:animate-fade-out-moderate-exit';

// Base content signature shared across sides. The per-side anchor, size and
// border edge come from `sheetSideClasses`.
//
// THE CELL IS THE SPEC (#2017). Two matrix rows --
// sheet / content / closed -> open (normal, spring-smooth) and
// sheet / content / open -> closed (moderate, exit). Enter/exit is PRESENCE
// (#1996): the node mounts with its keyframe attached, and usePresence holds
// the unmount until the exit keyframe ends.
//
// ONLY THE FADE HALF IS CONSUMED, and the missing half is a vocabulary gap, not
// an omission. Both rows declare `slide (per side) + fade`. The keyframe
// vocabulary has no side-agnostic slide shape and the matrix calls a physical
// side a defect, so no slide keyframe exists to name -- an approximated one
// would be geometry nobody chose. The fade runs on the tier and curve the row
// assigns; the slide is reported. The classes are side-independent, so they sit
// here rather than in `sheetSideClasses`.
//
// NO motion-reduce:animate-none. Reduced motion is handled on the duration
// leaf, which the generated animation reads through it. animate-none here would
// reset the shorthand and discard the zeroed duration with it.
const contentBaseClasses =
  'fixed z-depth-modal flex flex-col gap-4 bg-background p-6 shadow-lg ' +
  'data-[state=open]:animate-fade-in-normal-spring-smooth data-[state=closed]:animate-fade-out-moderate-exit ' +
  'data-[state=closed]:pointer-events-none';

// Per-side placement: one axis, one edge. Left/right run full height and cap
// their width through a container query (the CQ system rule -- viewport
// breakpoints moved to container context, cf. dialog); top/bottom span the
// inline axis and hug the block edge.
const sheetSideClasses: Record<SheetSide, string> = {
  top: 'inset-x-0 top-0 border-b border-card-border',
  bottom: 'inset-x-0 bottom-0 border-t border-card-border',
  left: 'inset-y-0 left-0 h-full w-3/4 @sm:max-w-sm border-r border-card-border',
  right: 'inset-y-0 right-0 h-full w-3/4 @sm:max-w-sm border-l border-card-border',
};

const headerClasses = 'flex flex-col space-y-2 text-center @md:text-left';

const footerClasses = 'flex flex-col-reverse @md:flex-row @md:justify-end @md:space-x-2';

const titleClasses = 'text-title-medium ts-title-medium leading-none text-foreground';

const descriptionClasses = 'text-body-small ts-body-small text-muted-foreground';

// sheet / close button / hover (fast, standard). A hover on a button that stays
// put is a TRANSITION, so the row is consumed as composed generics.
//
// THE ROW'S COLOUR HALF HAS NO MOMENT HERE. It declares fade + color over
// ['opacity', 'background, text, border']; this button only raises opacity on
// hover, with no background, text or border change to transition. The fade half
// is consumed; the colour half is reported rather than invented.
const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-fast ease-standard motion-reduce:transition-none hover:opacity-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const closeIconClasses = 'h-5 w-5 @md:h-4 @md:w-4';

/** The content class: the side-independent base signature plus the anchored
 *  placement for `side`. The ONLY source of the content class -- every
 *  performance calls this, so the side (a Content-level decoration prop
 *  mirroring shadcn) is the single argument the base does not already fix. */
export function sheetContentClasses(side: SheetSide): string {
  return `${contentBaseClasses} ${sheetSideClasses[side]}`;
}

/** The side-independent class set. The content class is NOT here: it depends on
 *  `side`, so it is produced by `sheetContentClasses(side)` by whoever knows the
 *  side. Everything below is invariant across sides and open state. */
export function sheetClasses(_config: SheetConfig, _state: SheetState): SheetClassSet {
  return {
    overlay: overlayClasses,
    header: headerClasses,
    footer: footerClasses,
    title: titleClasses,
    description: descriptionClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}

export { sheetSideClasses };
