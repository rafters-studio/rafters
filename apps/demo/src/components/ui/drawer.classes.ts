import {
  type DrawerConfig,
  type DrawerSide,
  type DrawerState,
  drawerSide,
} from '@/components/ui/drawer.behavior';

export interface DrawerClassSet {
  overlay: string;
  content: string;
  handle: string;
  header: string;
  footer: string;
  title: string;
  description: string;
  close: string;
  closeIcon: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class -- a behavior root never styles itself; layout
// belongs to the consumer's Container/Grid (operator ruling, 2026-08-02).
// THE CELL IS THE SPEC (#2017). Two rows of the motion matrix --
// drawer / overlay / closed -> open (normal, enter) and
// drawer / overlay / open -> closed (moderate, exit). Both rows carry
// provenance "proposed": a starting position, never reviewed.
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

// The panel is fixed to its anchoring edge (no centering container -- unlike a
// dialog). data-[state=closed]:pointer-events-none keeps a closed panel from
// swallowing clicks while it is held present through any future exit window.
//
// FOUR MATRIX ROWS NAME THIS PART AND NONE OF THEM IS CONSUMED. Each is a
// different reason, and none of them is a missing transcription:
//
//   drawer / content / closed -> open (normal, spring-smooth) and
//   drawer / content / open -> closed (moderate, exit) both declare
//   `slide (y)` over `transform: translate`. No slide keyframe exists in the
//   vocabulary -- the shape was left out rather than approximated, because an
//   approximated shape is geometry nobody chose -- so there is no class to
//   name. Unlike sheet, these rows declare NO fade half, so there is not even a
//   partial consumption to make. This is a vocabulary gap, reported here.
//
//   drawer / content / dragging is a pointer-rule row: a part tracking a
//   pointer moves exactly with it, and any nonzero duration would be the
//   defect. There is nothing to write.
//
//   drawer / content / settle on release (fast, spring-smooth, provenance
//   "proposed") is a travel TRANSITION and would be nameable. The moment does
//   not exist: the drag-to-dismiss gesture is deferred, the handle below is
//   decorative, and this panel never travels to a snap point. A settle
//   transition on a panel that never settles would animate nothing.
const contentBaseClasses =
  'fixed z-depth-modal flex flex-col gap-4 bg-background p-6 text-foreground shadow-lg ' +
  'border-card-border data-[state=closed]:pointer-events-none';

// Position + rounding + the border edge, keyed on the anchoring side. The slide
// these positions imply stays undeclared for the reason given above: the
// keyframe vocabulary has no slide shape.
const sideClasses: Record<DrawerSide, string> = {
  bottom: 'inset-x-0 bottom-0 border-t rounded-t-lg',
  top: 'inset-x-0 top-0 border-b rounded-b-lg',
  left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r rounded-r-lg',
  right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l rounded-l-lg',
};

// Decorative drag affordance. Renders the vaul-style grabber; the drag-to-
// dismiss gesture it implies is deferred (see the doc), so it carries no
// behavior and stays out of the accessibility tree.
const handleClasses = 'mx-auto h-1.5 w-24 shrink-0 rounded-full bg-muted';

const headerClasses = 'flex flex-col gap-1.5 text-center @md:text-left';

const footerClasses = 'mt-auto flex flex-col gap-2 pt-4';

const titleClasses = 'text-title-medium ts-title-medium leading-none text-foreground';

const descriptionClasses = 'text-body-small ts-body-small text-muted-foreground';

// drawer / close button / hover (fast, standard). A hover on a button that
// stays put is a TRANSITION, so the row is consumed as composed generics.
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

export function drawerClasses(config: DrawerConfig, _state: DrawerState): DrawerClassSet {
  return {
    overlay: overlayClasses,
    content: `${contentBaseClasses} ${sideClasses[drawerSide(config)]}`,
    handle: handleClasses,
    header: headerClasses,
    footer: footerClasses,
    title: titleClasses,
    description: descriptionClasses,
    close: closeClasses,
    closeIcon: closeIconClasses,
  };
}
