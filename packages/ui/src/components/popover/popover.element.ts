/**
 * WC performance for popover: the thinnest wrapper. The score AND the
 * DOM-native binding (bindPopover) live in popover.behavior.ts, shared with the
 * Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindPopover } from './popover.behavior';

export class RaftersPopover extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindPopover(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-popover')) {
  customElements.define('rafters-popover', RaftersPopover);
}
