/**
 * Shared class definitions for AlertDialog component
 */

export const alertDialogOverlayClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

export const alertDialogContainerClasses =
  'fixed inset-0 z-depth-modal flex items-center justify-center p-4';

export const alertDialogContentClasses =
  'relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg';

export const alertDialogHeaderClasses = 'flex flex-col space-y-2 text-center sm:text-left';

export const alertDialogFooterClasses =
  'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2';

export const alertDialogTitleClasses = 'text-lg font-semibold';

export const alertDialogDescriptionClasses = 'text-sm text-muted-foreground';

export const alertDialogActionClasses =
  'inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export const alertDialogCancelClasses =
  'mt-2 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0';
