/**
 * WC performance for radio-group: the thinnest wrapper. The score AND the
 * DOM-native binding (bindRadioGroup) live in radio-group.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides the real
 * `<div data-part="root" role="radiogroup">` with `<button data-part="item">`
 * children, so native focus and the roving-focus effect operate on real
 * document DOM -- the WC never renders a shadow tree of its own. The bind is
 * deferred one microtask because connectedCallback can fire before the
 * light-DOM children are parsed (upgrade order).
 */
import { bindRadioGroup } from './radio-group.behavior';

export class RaftersRadioGroup extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindRadioGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-radio-group')) {
  customElements.define('rafters-radio-group', RaftersRadioGroup);
}
