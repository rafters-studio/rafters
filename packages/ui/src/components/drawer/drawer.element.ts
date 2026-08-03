/**
 * WC performance for drawer: the thinnest wrapper. The score AND the DOM-native
 * binding (bindDrawer) live in drawer.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindDrawer } from './drawer.behavior';

export class RaftersDrawer extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    // Target parity: the Astro/React root is an unclassed <div> (block), but a
    // custom element defaults to display:inline. Pin block so the WC host lays
    // out identically to the other two performances (#2004).
    this.style.display = 'block';
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindDrawer(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-drawer')) {
  customElements.define('rafters-drawer', RaftersDrawer);
}
