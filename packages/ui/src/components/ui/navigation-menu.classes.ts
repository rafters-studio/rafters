/**
 * Shared class definitions for NavigationMenu component
 */

export const navigationMenuRootClasses =
  'relative z-10 flex max-w-max flex-1 items-center justify-center';

export const navigationMenuListClasses =
  'group flex flex-1 list-none items-center justify-center gap-1';

export const navigationMenuTriggerClasses =
  'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-label-medium transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export const navigationMenuTriggerChevronClasses =
  'ml-1 h-3 w-3 transition-transform duration-200 motion-reduce:transition-none';

export const navigationMenuContentClasses = 'left-0 top-0 w-full';

export const navigationMenuContentActiveClasses = 'animate-in fade-in-0 zoom-in-95';

export const navigationMenuLinkClasses =
  'block select-none space-y-1 rounded-md p-3 no-underline outline-none transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground active:bg-muted active:text-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const navigationMenuViewportClasses =
  'mt-1.5 h-min w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg origin-top-center';

export const navigationMenuViewportActiveClasses = 'animate-in fade-in-0 zoom-in-95';

export const navigationMenuIndicatorClasses =
  'bottom-0 z-10 flex h-2.5 items-end justify-center overflow-hidden transition-transform duration-200 motion-reduce:transition-none';

export const navigationMenuIndicatorActiveClasses = 'animate-in fade-in';

export const navigationMenuIndicatorArrowClasses =
  'top-full h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md';
