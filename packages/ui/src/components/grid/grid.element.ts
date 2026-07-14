/**
 * WC performance for grid: the thinnest wrapper. The score AND the DOM-native
 * binding (bindGrid) live in grid.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle.
 *
 * Gotcha 3: connectedCallback can fire before the light-DOM children are
 * parsed (upgrade order), so bind on the next microtask when the parts
 * (row/gridcell cells the grid-roving effect enumerates) exist. Deferring
 * also means the honest role="grid" the binding projects lands only once the
 * row/gridcell descendants are present -- never a bare role on empty markup.
 */
import { bindGrid } from './grid.behavior';

export class RaftersGrid extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindGrid(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-grid')) {
  customElements.define('rafters-grid', RaftersGrid);
}
