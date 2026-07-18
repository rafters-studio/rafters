/**
 * WC performance for tooltip: the thinnest wrapper. The score AND the DOM-native
 * binding (bindTooltip) live in tooltip.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindTooltip } from './tooltip.behavior';

export class RaftersTooltip extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindTooltip(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-tooltip')) {
  customElements.define('rafters-tooltip', RaftersTooltip);
}
