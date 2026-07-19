/**
 * WC performance for toggle: the thinnest wrapper. The score AND the DOM-native
 * binding (bindToggle) live in toggle.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * A light-DOM enhancer: the author (or Astro) provides a real inner
 * <button data-part="root"> so native Enter/Space activation is preserved --
 * the WC never renders a shadow tree of its own. The bind is deferred one
 * microtask because connectedCallback can fire before the light-DOM children
 * are parsed (upgrade order).
 *
 * The old-tree <rafters-toggle> was a form-associated shadow element
 * (ElementInternals, setFormValue). The behavior-layer WC drops form
 * association: like every ported enhancer (button, input) it wraps a native
 * light-DOM control, so form participation -- where needed -- comes from that
 * native element, not from ElementInternals on the host.
 */
import { bindToggle } from './toggle.behavior';

export class RaftersToggle extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>('[data-part="root"]');
      if (root) this.teardown = bindToggle(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-toggle')) {
  customElements.define('rafters-toggle', RaftersToggle);
}
