/**
 * Chart container and configuration surface for the rafters chart family
 *
 * @cognitive-load 2/10 - Low decision surface: config maps series to tokens,
 * the container provides a measured plot region. The consumer decides which
 * chart type and which compositional children (axes, grid, legend) to include.
 * @attention-economics Invisible scaffolding: the container is structural,
 * never visual. Attention stays on the chart content it frames.
 * @trust-building Consistent token-mapped colors across every chart type;
 * config is validated at the boundary, so an out-of-range token fails at
 * construction time, never as a silent wrong color at render.
 * @accessibility Provides the structural grouping and measured size the
 * chart family's accessible pattern builds on (figure + aria-hidden SVG +
 * sr-announcer, pinned in Bar #2225); this component's own projection is
 * empty -- neither the root nor the plot region carries semantics of its own.
 * @semantic-meaning The configuration bridge between shadcn's ChartConfig
 * shape and rafters' token vocabulary. One declared divergence: token NAMES
 * (chart-1..chart-5) replace shadcn's hex/var() color values.
 *
 * @usage-patterns
 * DO: Wrap every chart in ChartContainer with a ChartConfig
 * DO: Use token names (chart-1..chart-5) in ChartConfig, never hex or var()
 * DO: Compose XAxis/YAxis/CartesianGrid as children when a chart needs them
 * DO: Omit axis/grid children for axis-less charts (sparklines) -- omission,
 *     never a flag
 * NEVER: Pass hex colors, arbitrary values, or var() in config
 * NEVER: Add a categoryKey to config -- it belongs on <XAxis dataKey>
 *
 * @example
 * ```html
 * <rafters-chart-container data-part="root" data-config='{"desktop":{"label":"Desktop","token":"chart-1"}}'>
 *   <div data-part="plot"><!-- chart content --></div>
 * </rafters-chart-container>
 * ```
 */

/**
 * WC performance of the chart-container score: the thinnest wrapper. The
 * score AND the DOM-native binding (bindChart) live in chart.behavior.ts,
 * shared with the Astro performance -- deferring the bind one microtask
 * because `connectedCallback` can fire before the light-DOM `plot` part is
 * parsed (05-authoring WC bind timing rule).
 */
import { bindChart } from './chart.behavior';

export class RaftersChartContainer extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) this.teardown = bindChart(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-chart-container')) {
  customElements.define('rafters-chart-container', RaftersChartContainer);
}
