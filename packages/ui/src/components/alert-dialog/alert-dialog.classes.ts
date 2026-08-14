import type { AlertDialogConfig, AlertDialogState } from './alert-dialog.behavior';

export interface AlertDialogClassSet {
  overlay: string;
  container: string;
  content: string;
  header: string;
  footer: string;
  title: string;
  description: string;
  action: string;
  cancel: string;
}

const overlayClasses = 'fixed inset-0 z-depth-overlay bg-foreground/80';

const containerClasses = 'fixed inset-0 z-depth-modal flex items-center justify-center p-4';

// data-[state=closed]:pointer-events-none -- the ratified motion ruling's taste
// residue: while a closing overlay is held present through its exit window
// (usePresence defers the unmount), it must not swallow clicks. Mirrors dialog;
// enter animation stays undeclared until the motion token layer (#1902) lands.
const contentClasses =
  'relative grid w-full max-w-lg gap-4 rounded-lg border border-card-border bg-card p-6 text-card-foreground shadow-lg ' +
  'data-[state=closed]:pointer-events-none';

const headerClasses = 'flex flex-col space-y-2 text-center @md:text-left';

const footerClasses = 'flex flex-col-reverse @md:flex-row @md:justify-end @md:space-x-2';

const titleClasses = 'ts-title-medium leading-none';

const descriptionClasses = 'ts-body-small text-muted-foreground';

// Interaction motion (hover/focus color transition) is deliberately undeclared:
// the semantic motion token for it does not exist yet (#1902) and a raw numeric
// duration is drift. Colour, ring and disabled states are token-based.
const actionClasses =
  'inline-flex h-11 items-center justify-center rounded-md bg-destructive px-4 py-2 ' +
  'ts-label-medium text-destructive-foreground ring-offset-background ' +
  'hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const cancelClasses =
  'mt-2 inline-flex h-11 items-center justify-center rounded-md border border-input bg-card px-4 py-2 ' +
  'ts-label-medium ring-offset-background hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 @md:mt-0';

export function alertDialogClasses(
  _config: AlertDialogConfig,
  _state: AlertDialogState,
): AlertDialogClassSet {
  return {
    overlay: overlayClasses,
    container: containerClasses,
    content: contentClasses,
    header: headerClasses,
    footer: footerClasses,
    title: titleClasses,
    description: descriptionClasses,
    action: actionClasses,
    cancel: cancelClasses,
  };
}
