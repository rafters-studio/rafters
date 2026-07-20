/**
 * WC performance for accordion: the thinnest wrapper. The score AND the
 * DOM-native binding (bindAccordion) live in accordion.behavior.ts, shared with
 * the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root">` with its section markup, so native focus and the
 * composed roving-focus primitive operate on real document DOM -- the WC never
 * renders a shadow tree of its own. The bind is deferred one microtask because
 * connectedCallback can fire before the light-DOM children are parsed (upgrade
 * order).
 */
import { bindAccordion } from './accordion.behavior';

export class RaftersAccordion extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindAccordion(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-accordion')) {
  customElements.define('rafters-accordion', RaftersAccordion);
}
