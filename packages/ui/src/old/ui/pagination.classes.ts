/**
 * Shared class definitions for Pagination component
 * Used by both pagination.tsx (React) and pagination.astro (Astro)
 */

export const paginationNavClasses = 'mx-auto flex w-full justify-center';

export const paginationContentClasses = 'flex flex-row items-center gap-1';

export const paginationLinkBaseClasses =
  'inline-flex items-center justify-center rounded-md text-label-medium ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:pointer-events-none';

export const paginationLinkSizeClasses: Record<string, string> = {
  default: 'h-10 min-w-10 px-4 py-2',
  sm: 'h-9 min-w-9 px-3',
  lg: 'h-11 min-w-11 px-8',
  icon: 'h-10 w-10',
};

export const paginationLinkActiveClasses =
  'bg-primary text-primary-foreground hover:bg-primary-hover aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground';

export const paginationLinkInactiveClasses =
  'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground';

export const paginationEllipsisClasses = 'flex h-9 w-9 items-center justify-center';
