import {
  type DrawerConfig,
  type DrawerSide,
  type DrawerState,
  drawerSide,
} from './drawer.behavior';

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
// Motion is CSS the browser applies from the generics each matrix row assigns,
// the same way tooltip, hover-card and navigation-menu do it: the overlay and
// the content stay present, and the open axis (data-state) drives a transition.
// Visibility rides the transition, so a closing part stays visible until its
// exit ends and is then out of the accessibility tree and the tab order.
//
// drawer / overlay / closed -> open (normal, enter) and open -> closed
// (moderate, exit): a fade. Both rows carry provenance "proposed": a starting
// position, never reviewed.
const overlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 ' +
  'invisible pointer-events-none opacity-0 ' +
  'transition-[opacity,visibility] duration-moderate ease-exit ' +
  'data-[state=open]:visible data-[state=open]:pointer-events-auto data-[state=open]:opacity-100 ' +
  'data-[state=open]:duration-normal data-[state=open]:ease-enter';

// The panel is fixed to its anchoring edge (no centering container -- unlike a
// dialog).
//
// FOUR MATRIX ROWS NAME THIS PART.
//
//   drawer / content / closed -> open (normal, spring-smooth) and
//   drawer / content / open -> closed (moderate, exit): slide over
//   transform: translate. Closed, the panel sits one full panel off its
//   anchoring edge (the row extent is structural: 100% of its own size, set in
//   sideClasses); open, it translates to 0. The panel slides in from the edge
//   it is anchored to and back out to it, as the shadcn drawer does.
//
//   drawer / content / dragging is a pointer-rule row: a part tracking a
//   pointer moves exactly with it, and any nonzero duration would be the
//   defect. There is nothing to write.
//
//   drawer / content / settle on release (fast, spring-smooth, provenance
//   "proposed") is a travel transition. The moment does not exist: the
//   drag-to-dismiss gesture is deferred, the handle below is decorative, and
//   this panel never travels to a snap point.
const contentBaseClasses =
  'fixed z-depth-modal flex flex-col gap-4 bg-background p-6 text-foreground shadow-lg ' +
  'border-card-border invisible pointer-events-none ' +
  'transition-[translate,visibility] duration-moderate ease-exit ' +
  'data-[state=open]:visible data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:translate-x-0 data-[state=open]:translate-y-0 ' +
  'data-[state=open]:duration-normal data-[state=open]:ease-spring-smooth';

// Position + rounding + the border edge, keyed on the anchoring side, plus the
// closed offset: one full panel past that same edge.
const sideClasses: Record<DrawerSide, string> = {
  bottom: 'inset-x-0 bottom-0 border-t rounded-t-lg translate-y-full',
  top: 'inset-x-0 top-0 border-b rounded-b-lg -translate-y-full',
  left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r rounded-r-lg -translate-x-full',
  right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l rounded-l-lg translate-x-full',
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
  'transition-opacity duration-fast ease-standard hover:opacity-100 ' +
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
