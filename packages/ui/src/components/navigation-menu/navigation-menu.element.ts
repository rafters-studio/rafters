/**
 * WC performance for navigation-menu: the thinnest wrapper. All behavior --
 * including the DOM binding -- lives in navigation-menu.behavior.ts, shared
 * with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle.
 */
import { bindNavigationMenu } from './navigation-menu.behavior';

export class RaftersNavigationMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'navigation');
    // connectedCallback can fire before the light-DOM children are parsed
    // (upgrade order), so bind on the next microtask when the parts exist.
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindNavigationMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-navigation-menu')) {
  customElements.define('rafters-navigation-menu', RaftersNavigationMenu);
}
