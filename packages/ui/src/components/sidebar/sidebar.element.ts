/**
 * WC performance for sidebar: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSidebar) live in sidebar.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts (trigger, panel, overlay, nav content) are
 * parsed.
 */
import { bindSidebar } from './sidebar.behavior';

export class RaftersSidebar extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindSidebar(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-sidebar')) {
  customElements.define('rafters-sidebar', RaftersSidebar);
}
