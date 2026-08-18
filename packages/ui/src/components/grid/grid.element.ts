/**
 * Intelligent layout grid with semantic presets and embedded design reasoning
 *
 * @cognitive-load 4/10 - Layout container with intelligent presets that respect Miller's Law
 * @attention-economics Preset hierarchy: linear=democratic attention, golden=hierarchical flow, bento=complex attention patterns
 * @trust-building Mathematical spacing, Miller's Law cognitive load limits, consistent preset behavior
 * @accessibility WCAG AAA compliance with optional ARIA grid role for interactive layouts
 * @semantic-meaning Layout intelligence: linear=equal-priority content, golden=natural hierarchy, bento=content showcases with semantic asymmetry
 *
 * @usage-patterns
 * DO: Linear - Product catalogs, image galleries, equal-priority content
 * DO: Golden - Editorial layouts, feature showcases, natural hierarchy
 * DO: Bento - Dashboards, content showcases (use sparingly, high cognitive load)
 * DO: Limit items to 8 max on wide screens (Miller's Law)
 * NEVER: Decorative asymmetry without semantic meaning
 * NEVER: Exceed cognitive load limits
 *
 * @example
 * ```tsx
 * // Equal-priority grid
 * <Grid preset="linear" columns={3} gap="4">
 *   <Grid.Item>Card 1</Grid.Item>
 *   <Grid.Item>Card 2</Grid.Item>
 *   <Grid.Item>Card 3</Grid.Item>
 * </Grid>
 *
 * // Bento dashboard layout
 * <Grid preset="bento" pattern="dashboard">
 *   <Grid.Item priority="primary">Main Metric</Grid.Item>
 *   <Grid.Item priority="secondary">Chart</Grid.Item>
 * </Grid>
 * ```
 */

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
