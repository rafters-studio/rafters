import type { AlertDialogConfig, AlertDialogState } from '@/components/ui/alert-dialog.behavior';

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

// THE CELL IS THE SPEC (#2017). Two rows of the motion matrix --
// alert-dialog / overlay / closed -> open (normal, enter) and
// alert-dialog / overlay / open -> closed (moderate, exit). Both rows carry
// provenance "proposed": a starting position, never reviewed.
//
// The overlay carries data-state from the behavior's aria projection
// (alert-dialog.behavior.ts), so the state selectors match in all three
// renderers.
//
// ROW AND BEHAVIOR DISAGREE ON THE EXIT. The open -> closed row assumes the
// scrim is held present while its keyframe runs; nothing holds it. React
// returns null the instant `effectiveOpen` flips false, Astro renders
// `hidden={!open}`, and the DOM binding sets `el.hidden = !open`. `usePresence`
// wraps the CONTENT only. The class is named as the row assigns it and will
// render its first frame the day the overlay gets a presence hold.
const overlayClasses =
  'fixed inset-0 z-depth-overlay bg-foreground/80 ' +
  'data-[state=open]:animate-fade-in-normal-enter data-[state=closed]:animate-fade-out-moderate-exit';

const containerClasses = 'fixed inset-0 z-depth-modal flex items-center justify-center p-4';

// data-[state=closed]:pointer-events-none -- the ratified motion ruling's taste
// residue: while a closing surface is held present through its exit window
// (usePresence defers the unmount), it must not swallow clicks.
//
// THE CELL IS THE SPEC (#2017). Two more matrix rows --
// alert-dialog / content / closed -> open (normal, enter, extent pop) and
// alert-dialog / content / open -> closed (moderate, exit, extent pop).
// Enter/exit is PRESENCE (#1996): the node MOUNTS with its keyframe attached
// and runs it, and usePresence holds the unmount until the exit keyframe ends.
//
// NO extent-pop CLASS. The extent rides with the SHAPE -- the scale-in and
// scale-out keyframes read the pop extent themselves -- so naming it here would
// be a second writer for one knob.
//
// NO motion-reduce:animate-none. Reduced motion is handled on the duration
// leaf, which the generated animation reads through it. animate-none here would
// reset the shorthand, discard the zeroed duration with it, and strand the
// element short of the keyframe's end state.
const contentClasses =
  'relative grid w-full max-w-lg gap-4 rounded-lg border border-card-border bg-card p-6 text-card-foreground shadow-lg ' +
  'data-[state=open]:animate-scale-in-normal-enter data-[state=closed]:animate-scale-out-moderate-exit ' +
  'data-[state=closed]:pointer-events-none';

const headerClasses = 'flex flex-col space-y-2 text-center @md:text-left';

const footerClasses = 'flex flex-col-reverse @md:flex-row @md:justify-end @md:space-x-2';

const titleClasses = 'text-title-medium ts-title-medium leading-none';

const descriptionClasses = 'text-body-small ts-body-small text-muted-foreground';

// A MOMENT WITH NO ROW. The action and cancel buttons change background and
// text on hover, and the motion matrix assigns nothing for
// alert-dialog / action or alert-dialog / cancel -- the only close-button hover
// rows in the modal-overlay section belong to dialog, sheet and drawer, and an
// alert dialog has no close button. The hover therefore stays instant: a tier
// and a curve nobody assigned would be a value nobody chose. Reported, not
// faked. Colour, ring and disabled states are token-based.
const actionClasses =
  'inline-flex h-11 items-center justify-center rounded-md bg-destructive px-4 py-2 ' +
  'text-label-medium ts-label-medium text-destructive-foreground ring-offset-background ' +
  'hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

const cancelClasses =
  'mt-2 inline-flex h-11 items-center justify-center rounded-md border border-input bg-card px-4 py-2 ' +
  'text-label-medium ts-label-medium ring-offset-background hover:bg-accent hover:text-accent-foreground ' +
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
