/**
 * ChartLegend -- one entry per configured series, display-only (#2228)
 *
 * @cognitive-load 1/10 - No decisions: renders one swatch+label per series in
 * config order.
 * @attention-economics Always visible while its chart is visible; a fixed,
 * low-attention reference the eye returns to, never something that competes
 * for attention on its own.
 * @trust-building The swatch color always traces to the SAME `ChartConfig`
 * the tooltip and marks read -- a legend entry can never disagree with the
 * chart about what a color means.
 * @accessibility `role="list"`/`role="listitem"` with `roving-focus` keyboard
 * traversal across entries; focus is visible. Default is DISPLAY-ONLY: no
 * action dispatches on activation (shadcn parity).
 * @semantic-meaning Ports shadcn's `<ChartLegend content={<ChartLegendContent />} />`
 * call site -- entries are rendered server/build-side (Astro) or by a script
 * reading `data-config` (this WC performance); roving-focus is the only
 * client behavior.
 *
 * @usage-patterns
 * DO: Set `data-config` to a JSON-serialized `ChartConfig` before connection
 * NEVER: Add a click handler that hides a series
 *
 * @example
 * ```html
 * <rafters-chart-legend data-part="root" data-config='{"desktop":{"label":"Desktop","token":"chart-1"}}'>
 *   <span data-part="entry" data-roving-item tabindex="0">...</span>
 * </rafters-chart-legend>
 * ```
 */
import { bindChartLegend } from './chart-legend.behavior';

export class RaftersChartLegend extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindChartLegend(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-chart-legend')) {
  customElements.define('rafters-chart-legend', RaftersChartLegend);
}
