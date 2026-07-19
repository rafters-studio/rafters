/**
 * WC performance for hover-card: the thinnest wrapper. The score AND the
 * DOM-native binding (bindHoverCard) live in hover-card.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindHoverCard } from './hover-card.behavior';

export class RaftersHoverCard extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindHoverCard(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-hover-card')) {
  customElements.define('rafters-hover-card', RaftersHoverCard);
}
