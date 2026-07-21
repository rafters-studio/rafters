/**
 * WC performance for combobox: the thinnest wrapper. The score AND the
 * DOM-native binding (bindCombobox) live in combobox.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 */
import { bindCombobox } from './combobox.behavior';

export class RaftersCombobox extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCombobox(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-combobox')) {
  customElements.define('rafters-combobox', RaftersCombobox);
}
