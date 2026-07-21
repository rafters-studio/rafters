/**
 * WC performance for context-menu: the thinnest wrapper. All behavior --
 * including the DOM binding -- lives in context-menu.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle. The host is a light-DOM enhancer: the bind reads
 * real document DOM (trigger, content, items) for the primitives it composes.
 */
import { bindContextMenu } from './context-menu.behavior';

export class RaftersContextMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindContextMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-context-menu')) {
  customElements.define('rafters-context-menu', RaftersContextMenu);
}
