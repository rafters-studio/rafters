/**
 * WC performance for resizable: the thinnest wrapper. The score AND the
 * DOM-native binding (bindResizable) live in resizable.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real group with its
 * panel/handle children -- each panel carrying its data-panel-min/max/default
 * and each handle its role=separator + aria-valuenow -- so the pointer surface
 * and the separators exist before any JS; the WC never renders a shadow tree of
 * its own. The bind is deferred one microtask because connectedCallback can fire
 * before the light-DOM children are parsed (upgrade order).
 */
import { bindResizable } from './resizable.behavior';

export class RaftersResizable extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindResizable(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-resizable')) {
  customElements.define('rafters-resizable', RaftersResizable);
}
