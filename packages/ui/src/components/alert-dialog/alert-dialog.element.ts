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
