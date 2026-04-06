/**
 * Shared class definitions for Dialog component
 */

export const dialogOverlayClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

export const dialogCloseButtonClasses =
  'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity duration-150 motion-reduce:transition-none hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground';

export const dialogCloseIconClasses = 'h-4 w-4';

export const dialogContainerClasses =
  'fixed inset-0 z-depth-modal flex items-center justify-center p-4';

export const dialogContentClasses =
  'relative w-full max-w-lg rounded-lg border border-card-border bg-card p-6 text-card-foreground shadow-lg';

export const dialogHeaderClasses = 'flex flex-col space-y-1.5 text-center sm:text-left';

export const dialogFooterClasses = 'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2';

export const dialogTitleClasses = 'text-title-medium leading-none';

export const dialogDescriptionClasses = 'text-body-small text-muted-foreground';
