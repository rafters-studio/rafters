/**
 * WC performance for textarea: the thinnest wrapper. The score AND the
 * DOM-native binding (bindTextarea) live in textarea.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM <textarea> is parsed.
 */
import { bindTextarea } from './textarea.behavior';

export class RaftersTextarea extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindTextarea(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-textarea')) {
  customElements.define('rafters-textarea', RaftersTextarea);
}
