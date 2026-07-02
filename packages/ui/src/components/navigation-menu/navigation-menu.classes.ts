import type { NavigationMenuConfig, NavigationMenuState } from './navigation-menu.behavior';

export interface NavigationMenuClassSet {
  root: string;
  list: string;
  item: string;
  trigger: string;
  triggerChevron: string;
  content: string;
  link: string;
}

const rootClasses = 'relative z-10 flex max-w-max flex-1 items-center justify-center';

const listClasses = 'group flex flex-1 list-none items-center justify-center gap-1';

const itemClasses = 'relative';

const triggerClasses =
  'group inline-flex h-11 @md:h-10 w-max items-center justify-center rounded-md ' +
  'bg-background px-4 py-2 text-label-medium cursor-pointer ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'data-[state=open]:bg-accent-subtle';

const triggerChevronClasses =
  'ml-1 h-3 w-3 transition-transform duration-200 motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

const contentClasses =
  'absolute left-0 top-full w-max rounded-md border bg-popover p-2 text-popover-foreground shadow-lg ' +
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95';

const linkClasses =
  'block select-none space-y-1 rounded-md p-3 no-underline outline-none ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'active:bg-muted active:text-foreground ' +
  'focus-visible:bg-accent focus-visible:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'data-[active]:bg-accent-subtle';

export function navigationMenuClasses(
  _config: NavigationMenuConfig,
  _state: NavigationMenuState,
): NavigationMenuClassSet {
  return {
    root: rootClasses,
    list: listClasses,
    item: itemClasses,
    trigger: triggerClasses,
    triggerChevron: triggerChevronClasses,
    content: contentClasses,
    link: linkClasses,
  };
}
