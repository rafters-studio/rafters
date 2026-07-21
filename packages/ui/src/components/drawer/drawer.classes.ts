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

const overlayClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

// The panel is fixed to its anchoring edge (no centering container -- unlike a
// dialog). data-[state=closed]:pointer-events-none keeps a closed panel from
// swallowing clicks while it is held present through any future exit window.
const contentBaseClasses =
  'fixed z-depth-modal flex flex-col gap-4 bg-background p-6 text-foreground shadow-lg ' +
  'border-card-border data-[state=closed]:pointer-events-none';

// Position + rounding + the border edge, keyed on the anchoring side. The
// slide motion these positions imply is left UNDECLARED -- see the component
// doc's motion dispositions (motion-sheet-in pending #1899/#1902-1904).
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

const titleClasses = 'text-title-medium leading-none text-foreground';

const descriptionClasses = 'text-body-small text-muted-foreground';

const closeClasses =
  'absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center ' +
  '@md:right-4 @md:top-4 @md:h-8 @md:w-8 ' +
  'rounded-sm opacity-70 ring-offset-background cursor-pointer ' +
  'transition-opacity duration-150 motion-reduce:transition-none hover:opacity-100 ' +
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
