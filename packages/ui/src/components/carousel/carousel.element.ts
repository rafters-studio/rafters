/**
 * WC performance for carousel: the thinnest wrapper. All behavior -- including
 * the DOM binding -- lives in carousel.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 */
import { bindCarousel } from './carousel.behavior';

export class RaftersCarousel extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'region');
    // The custom element IS the root part -- mark it so the DOM-native binding
    // and the conformance harness resolve it without a wrapper element.
    if (!this.hasAttribute('data-part')) this.setAttribute('data-part', 'root');
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCarousel(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-carousel')) {
  customElements.define('rafters-carousel', RaftersCarousel);
}
