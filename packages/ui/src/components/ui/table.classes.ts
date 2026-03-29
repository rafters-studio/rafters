/**
 * Shared class definitions for Table component
 * Used by both table.tsx (React) and table.astro (Astro)
 */

export const tableRootClasses = 'w-full caption-bottom text-sm';

export const tableWrapperClasses = 'relative w-full overflow-auto';

export const tableHeaderClasses = '[&_tr]:border-b';

export const tableBodyClasses = '[&_tr:last-child]:border-0';

export const tableFooterClasses = 'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0';

export const tableRowClasses =
  'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted';

export const tableHeadClasses =
  'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5';

export const tableCellClasses =
  'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5';

export const tableCaptionClasses = 'text-sm text-muted-foreground';
