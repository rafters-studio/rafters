/**
 * Line chart -- one path per series for the rafters chart family
 *
 * @cognitive-load 3/10 - Two independent booleans (smooth curve, dot
 * markers) plus whichever axis children are composed or omitted; series and
 * colors flow from ChartConfig, categories from the composed XAxis child
 * when present. Low because the shape is fully determined by data plus two
 * booleans and composition, not open configuration.
 * @attention-economics The line IS the content -- unlike ChartContainer's
 * invisible scaffolding, this component draws the primary visual a chart
 * exists for. The line-enter motion draws the eye to a newly-arrived series
 * on mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale primitives Bar (#2225) already
 * proved, so a Bar and a Line agree on where a category sits. A monotone
 * curve (`smooth`) never overshoots the data -- it stays within each pair of
 * points' own value range, so a reader never sees a peak or trough the data
 * does not have.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label; its
 * SVG is aria-hidden; arrow keys (and Home/End) move an active-datum cursor
 * announced via sr-announcer, focus staying on the figure rather than
 * entering the SVG; a visually-hidden data table carries the same data in
 * fully accessible tabular form, always present in the DOM. axe passes for
 * the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<LineChart data={data}><Line
 * dataKey="desktop"/></LineChart>` call site directly: composed `<Line
 * dataKey>` children (line.tsx, #2226) register a chart's series, in
 * declaration order, and take precedence outright over the `series:
 * string[]` config prop when both are present; `series` alone still fully
 * works with no `<Line>` children composed at all. categoryKey moves to the
 * composed <XAxis dataKey> child rather than a chart-level prop (veneer's
 * compositional-children amendment, bullpen 01a058ec). A LineChart with NO
 * XAxis/YAxis/CartesianGrid/legend children composed renders axis-less BY
 * OMISSION -- the #2230 StatTile sparkline shape -- never via a
 * `minimal`/`axisless` prop.
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose one <Line dataKey="..."/> per series for the shadcn-parity call site
 * DO: Compose <XAxis dataKey="..."/> as a LineChart child for the category axis
 * DO: Omit XAxis/YAxis/CartesianGrid entirely for a sparkline -- omission, never a flag
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Pass BOTH series and <Line> children expecting them to merge -- children win outright
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```html
 * <rafters-chart-container data-part="root" data-config='{"desktop":{"token":"chart-1"}}'>
 *   <div data-part="plot">
 *     <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
 *     <rafters-line-chart data-part="root" data-config='{"data":[{"month":"Jan","desktop":100}]}'>
 *       <rafters-line data-part="series" data-key="desktop" hidden></rafters-line>
 *       <svg data-part="plot"></svg>
 *       <table data-part="table"></table>
 *     </rafters-line-chart>
 *   </div>
 * </rafters-chart-container>
 * ```
 */

/**
 * WC performance of the line-chart score: a light-DOM enhancer, same shape
 * as `RaftersBarChart`. The score AND the DOM-native binding
 * (`bindLineChart`) live in line-chart.behavior.ts, shared with the Astro
 * performance; this file only adapts that binding to the custom-element
 * lifecycle, deferring the bind one microtask because `connectedCallback`
 * can fire before the light-DOM `plot`/`table` parts are parsed (05-authoring
 * WC bind timing rule). Unlike the static XAxis/YAxis/CartesianGrid
 * elements, `bindLineChart` itself creates the `<path>`/`<circle>` elements
 * inside `[data-part="plot"]` -- line/point geometry is data-driven, so
 * there is no fixed markup for this element to merely enhance.
 */
import { bindLineChart } from './line-chart.behavior';
import {
  resolveDotFillClass,
  resolveLineEnterClass,
  resolveLineStrokeClass,
} from './line-chart.classes';

export class RaftersLineChart extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) {
        this.teardown = bindLineChart(this, {
          lineEnterClass: resolveLineEnterClass(),
          resolveStrokeClass: resolveLineStrokeClass,
          resolveDotFillClass: resolveDotFillClass,
        });
      }
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-line-chart')) {
  customElements.define('rafters-line-chart', RaftersLineChart);
}
