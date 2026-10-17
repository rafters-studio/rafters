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
import { bindGrid } from './grid.behavior';

/**
 * <rafters-grid>: light-DOM host that is the grid root part. It attaches no
 * shadow root and binds one microtask after connect, because the row/gridcell
 * children may not be parsed when connectedCallback fires. Opt in to the ARIA
 * grid with the `grid-role="grid"` attribute; bindGrid projects the honest
 * `role="grid"` and engages the 2D roving keyboard.
 */
export class RaftersGrid extends HTMLElement {
  #teardown: (() => void) | undefined;
  #generation = 0;

  connectedCallback(): void {
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation !== this.#generation || !this.isConnected) return;
      this.#teardown?.();
      this.#teardown = bindGrid(this);
    });
  }

  disconnectedCallback(): void {
    this.#generation++;
    this.#teardown?.();
    this.#teardown = undefined;
  }
}

if (!customElements.get('rafters-grid')) {
  customElements.define('rafters-grid', RaftersGrid);
}
