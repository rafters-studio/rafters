import type {
  NavigationMenuConfig,
  NavigationMenuState,
} from '@/components/ui/navigation-menu.behavior';

export interface NavigationMenuClassSet {
  root: string;
  list: string;
  item: string;
  trigger: string;
  triggerChevron: string;
  content: string;
  link: string;
  viewportWrapper: string;
  viewport: string;
  indicator: string;
  indicatorArrow: string;
}

const rootClasses = 'relative z-10 flex max-w-max flex-1 items-center justify-center';

const listClasses = 'group flex flex-1 list-none items-center justify-center gap-1';

const itemClasses = 'relative';

const triggerClasses =
  'group inline-flex h-11 @md:h-10 w-max items-center justify-center rounded-md ' +
  'bg-background px-4 py-2 text-label-medium ts-label-medium cursor-pointer ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'data-[state=open]:bg-accent-subtle';

const triggerChevronClasses =
  'ml-1 h-3 w-3 transition-transform duration-200 motion-reduce:transition-none ' +
  'group-data-[state=open]:rotate-180';

// Animated enter/exit awaits the motion-utility wiring (#7): the rafters
// sheet emits @keyframes + --ease/--duration vars but no ready animate-in
// utilities, and the panel toggles `hidden` (a display:none node cannot
// transition). Static until the presence-visible motion utilities land.
const contentClasses =
  'absolute left-0 top-full w-max rounded-md border bg-popover p-2 text-popover-foreground shadow-lg';

const linkClasses =
  'block select-none space-y-1 rounded-md p-3 no-underline outline-none ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'active:bg-muted active:text-foreground ' +
  'focus-visible:bg-accent focus-visible:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'data-[active]:bg-accent-subtle';

const viewportWrapperClasses = 'absolute left-0 top-full';

const viewportClasses =
  'h-min w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg';

const indicatorClasses =
  'absolute bottom-0 z-10 flex h-2.5 items-end justify-center overflow-hidden ' +
  'transition-transform duration-200 motion-reduce:transition-none';

const indicatorArrowClasses = 'top-full h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md';

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
    viewportWrapper: viewportWrapperClasses,
    viewport: viewportClasses,
    indicator: indicatorClasses,
    indicatorArrow: indicatorArrowClasses,
  };
}

/** shadcn-compatible export: the trigger's class string, for consumers who
 *  style a NavigationMenuLink as a trigger. */
export function navigationMenuTriggerStyle(): string {
  return triggerClasses;
}
