/**
 * WC performance for color-picker: the thinnest wrapper. The score AND the
 * DOM-native binding (bindColorPicker) live in color-picker.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real container with
 * its canvases, thumbs, inputs, and preview so the interaction surface exists
 * before any JS. The bind is deferred one microtask because connectedCallback
 * can fire before the light-DOM children are parsed (upgrade order).
 */
import { bindColorPicker } from './color-picker.behavior';

export class RaftersColorPicker extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindColorPicker(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-color-picker')) {
  customElements.define('rafters-color-picker', RaftersColorPicker);
}
