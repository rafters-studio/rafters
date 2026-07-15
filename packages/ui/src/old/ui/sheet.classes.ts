/**
 * Shared class definitions for Sheet component
 */

export const sheetOverlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0';

export const sheetContentClasses =
  'fixed z-depth-modal gap-4 bg-background p-6 shadow-lg transition-transform duration-500 motion-reduce:transition-none ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-500 data-[state=closed]:duration-300';

export const sheetCloseButtonClasses =
  'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity duration-150 motion-reduce:transition-none hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary';

export const sheetCloseIconClasses = 'h-4 w-4';

export const sheetHeaderClasses = 'flex flex-col space-y-2 text-center sm:text-left';

export const sheetFooterClasses = 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2';

export const sheetTitleClasses = 'text-title-medium text-foreground';

export const sheetDescriptionClasses = 'text-body-small text-muted-foreground';
