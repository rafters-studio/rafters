/**
 * Shared class definitions for Breadcrumb component
 * Used by both breadcrumb.tsx (React) and breadcrumb.astro (Astro)
 */

export const breadcrumbListClasses =
  'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground @sm:gap-2.5';

export const breadcrumbItemClasses = 'inline-flex items-center gap-1.5';

export const breadcrumbLinkClasses =
  'transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export const breadcrumbPageClasses = 'font-normal text-foreground';

export const breadcrumbSeparatorClasses = '[&>svg]:size-3.5';

export const breadcrumbEllipsisClasses = 'flex h-9 w-9 items-center justify-center';
