/**
 * WC performance for collapsible: the thinnest wrapper. The score AND the
 * DOM-native binding (bindCollapsible) live in collapsible.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<rafters-collapsible data-part="root">` with a `<button data-part="trigger">`
 * and a `<div data-part="content">`, so native focus and click operate on real
 * document DOM -- the WC never renders a shadow tree of its own.
 */
import { bindCollapsible } from './collapsible.behavior';

export class RaftersCollapsible extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindCollapsible(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-collapsible')) {
  customElements.define('rafters-collapsible', RaftersCollapsible);
}
