/**
 * WC performance for dropdown-menu: the thinnest wrapper. The score AND the
 * DOM-native binding (bindDropdownMenu) live in dropdown-menu.behavior.ts,
 * shared with the Astro performance. This file only adapts that binding to the
 * custom-element lifecycle -- deferring the bind one microtask because
 * connectedCallback can fire before the light-DOM parts are parsed.
 */
import { bindDropdownMenu } from './dropdown-menu.behavior';

export class RaftersDropdownMenu extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindDropdownMenu(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-dropdown-menu')) {
  customElements.define('rafters-dropdown-menu', RaftersDropdownMenu);
}
