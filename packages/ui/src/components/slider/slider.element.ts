/**
 * WC performance for slider: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSlider) live in slider.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real container with
 * its track/range/thumb children so the pointer surface and the role=slider
 * thumbs exist before any JS -- the WC never renders a shadow tree of its own.
 * The bind is deferred one microtask because connectedCallback can fire before
 * the light-DOM children are parsed (upgrade order).
 */
import { bindSlider } from './slider.behavior';

export class RaftersSlider extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindSlider(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-slider')) {
  customElements.define('rafters-slider', RaftersSlider);
}
