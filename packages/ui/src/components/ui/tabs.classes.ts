/**
 * Shared class definitions for Tabs component
 * Used by both tabs.tsx (React) and tabs.astro (Astro)
 */

export const tabsListClasses =
  'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground';

export const tabsTriggerBaseClasses = [
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
  'text-sm font-medium ring-offset-background transition-all duration-200 motion-reduce:transition-none cursor-pointer',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
].join(' ');

export const tabsTriggerActiveClasses =
  'bg-background text-foreground shadow-sm data-[state=active]:bg-background data-[state=active]:text-foreground';

export const tabsTriggerInactiveClasses =
  'text-muted-foreground hover:bg-muted hover:text-foreground';

export const tabsRootClasses = 'flex flex-col gap-2';

export const tabsContentClasses = [
  'ring-offset-background',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
].join(' ');
