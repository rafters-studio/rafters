/**
 * Alert dialog component for destructive or important confirmation actions
 *
 * @cognitive-load 7/10 - Requires immediate decision, interrupts workflow with high stakes
 * @attention-economics Full attention capture: blocks all other interactions until resolved
 * @trust-building Focus defaults to Cancel (safer choice), clear action consequences, escape allows safe exit
 * @accessibility role="alertdialog" for screen readers, focus trap, keyboard dismissal via Escape
 * @semantic-meaning Confirmation patterns: Action=proceed with consequence, Cancel=safe exit without changes
 *
 * @usage-patterns
 * DO: Use for destructive actions (delete, remove, discard)
 * DO: Use for irreversible operations requiring explicit confirmation
 * DO: Make consequences clear in description text
 * DO: Default focus to Cancel for safety
 * NEVER: Routine confirmations, non-destructive actions, information-only dialogs
 *
 * @example
 * ```tsx
 * // Minimal usage - Portal and Overlay are included automatically, no close X button
 * <AlertDialog>
 *   <AlertDialogTrigger>Delete</AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogHeader>
 *       <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 *       <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
 *     </AlertDialogHeader>
 *     <AlertDialogFooter>
 *       <AlertDialogCancel>Cancel</AlertDialogCancel>
 *       <AlertDialogAction>Delete</AlertDialogAction>
 *     </AlertDialogFooter>
 *   </AlertDialogContent>
 * </AlertDialog>
 *
 * // Or with namespace syntax
 * <AlertDialog>
 *   <AlertDialog.Trigger asChild>
 *     <Button variant="destructive">Delete</Button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Content>
 *     <AlertDialog.Header>
 *       <AlertDialog.Title>Are you sure?</AlertDialog.Title>
 *       <AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
 *     </AlertDialog.Header>
 *     <AlertDialog.Footer>
 *       <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
 *       <AlertDialog.Action>Delete</AlertDialog.Action>
 *     </AlertDialog.Footer>
 *   </AlertDialog.Content>
 * </AlertDialog>
 * ```
 */

/**
 * WC performance for alert-dialog: a decorator over the alert-dialog behavior.
 * It adds the view (alertDialogClasses) and the custom-element wiring, and calls
 * the same bindAlertDialog the Astro script calls. The parts are light DOM that
 * the author (or alert-dialog.astro) writes; ids are read, never generated.
 * connectedCallback can fire before the light-DOM children parse, so the bind
 * runs on the next microtask.
 */
import { bindAlertDialog } from './alert-dialog.behavior';
import { alertDialogClasses } from './alert-dialog.classes';

function part(root: HTMLElement, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

function applyView(root: HTMLElement): void {
  const content = part(root, 'content');
  const open = root.getAttribute('default-open') === 'true' || content?.dataset['state'] === 'open';
  const classes = alertDialogClasses({ defaultOpen: open }, { open });
  const cancel = part(root, 'cancel');
  const title = part(root, 'title');
  const description = part(root, 'description');
  const container = content?.parentElement;
  const targets: ReadonlyArray<readonly [HTMLElement | null | undefined, string]> = [
    [part(root, 'overlay'), classes.overlay],
    [container && container !== root ? container : null, classes.container],
    [content, classes.content],
    [(title ?? description)?.parentElement, classes.header],
    [title, classes.title],
    [description, classes.description],
    [cancel?.parentElement, classes.footer],
    [cancel, classes.cancel],
    [part(root, 'action'), classes.action],
  ];
  for (const [el, className] of targets) {
    if (el) el.className = className;
  }
}

export class RaftersAlertDialog extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      applyView(this);
      this.teardown = bindAlertDialog(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-alert-dialog')) {
  customElements.define('rafters-alert-dialog', RaftersAlertDialog);
}
