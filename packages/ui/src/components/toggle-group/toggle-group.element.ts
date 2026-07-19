/**
 * WC performance for toggle-group: the thinnest wrapper. The score AND the
 * DOM-native binding (bindToggleGroup) live in toggle-group.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root" role="group">` with `<button data-part="item">`
 * children, so native focus and the roving-focus effect operate on real
 * document DOM -- the WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindToggleGroup } from './toggle-group.behavior';

export class RaftersToggleGroup extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindToggleGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-toggle-group')) {
  customElements.define('rafters-toggle-group', RaftersToggleGroup);
}
