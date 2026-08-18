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
 * WC performance for alert-dialog: the thinnest wrapper. The score AND the
 * DOM-native binding (bindAlertDialog) live in alert-dialog.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 */
import { bindAlertDialog } from './alert-dialog.behavior';

export class RaftersAlertDialog extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindAlertDialog(this);
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
