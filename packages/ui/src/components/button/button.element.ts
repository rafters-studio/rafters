/**
 * WC performance for button: the thinnest wrapper. The score AND the DOM-native
 * binding (bindButton) live in button.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button data-part="root"> so native Enter/Space activation is preserved --
 * the WC never renders a shadow tree of its own. The bind is deferred one
 * microtask because connectedCallback can fire before the light-DOM children
 * are parsed (upgrade order).
 */
import { bindButton } from './button.behavior';

export class RaftersButton extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindButton(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-button')) {
  customElements.define('rafters-button', RaftersButton);
}
