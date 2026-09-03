/**
 * Area chart -- overlaid/stacked area marks for the rafters chart family
 *
 * @cognitive-load 3/10 - One structural decision (overlaid vs stacked) plus
 * an optional smooth toggle; series and colors flow from ChartConfig,
 * categories from the composed XAxis child. Low because the shape is fully
 * determined by data plus two booleans, not open configuration -- same
 * budget as BarChart (#2225), which this component mirrors structurally.
 * @attention-economics The filled areas ARE the content -- unlike
 * ChartContainer's invisible scaffolding, this component draws the primary
 * visual a chart exists for. The area-enter fade draws the eye to newly-
 * arrived values on mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale/areaPath primitives every chart
 * in the family shares, so an Area and a Bar agree on where a category
 * sits. Stacked baselines are literal running sums, assertable against a
 * fixture -- never an approximation.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label;
 * its SVG is aria-hidden; arrow keys (and Home/End) move an active-datum
 * cursor announced via sr-announcer, focus staying on the figure rather
 * than entering the SVG; a visually-hidden data table carries the same
 * data in fully accessible tabular form, always present in the DOM. axe
 * passes for the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<AreaChart data={data}><Area
 * dataKey="desktop"/></AreaChart>` call site directly: composed `<Area
 * dataKey>` children (area.tsx, #2227) register a chart's series, in
 * declaration order (also the stack order), and take precedence outright
 * over the `series: string[]` config prop when both are present; `series`
 * alone still fully works with no `<Area>` children composed at all.
 * categoryKey moves to the composed <XAxis dataKey> child rather than a
 * chart-level prop (veneer's compositional-children amendment, bullpen
 * 01a058ec).
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose one <Area dataKey="..."/> per series for the shadcn-parity call site
 * DO: Compose <XAxis dataKey="..."/> as an AreaChart child for the category axis
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Pass BOTH series and <Area> children expecting them to merge -- children win outright
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```html
 * <rafters-chart-container data-part="root" data-config='{"desktop":{"token":"chart-1"}}'>
 *   <div data-part="plot">
 *     <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
 *     <rafters-area-chart data-part="root" data-config='{"data":[{"month":"Jan","desktop":100}]}'>
 *       <rafters-area data-part="series" data-key="desktop" hidden></rafters-area>
 *       <svg data-part="plot"></svg>
 *       <table data-part="table"></table>
 *     </rafters-area-chart>
 *   </div>
 * </rafters-chart-container>
 * ```
 */

/**
 * WC performance of the area-chart score: a light-DOM enhancer, same shape
 * as `RaftersBarChart`. The score AND the DOM-native binding
 * (`bindAreaChart`) live in area-chart.behavior.ts, shared with the Astro
 * performance; this file only adapts that binding to the custom-element
 * lifecycle, deferring the bind one microtask because `connectedCallback`
 * can fire before the light-DOM `plot`/`table` parts are parsed (05-
 * authoring WC bind timing rule). Unlike the static XAxis/YAxis/
 * CartesianGrid elements, `bindAreaChart` itself creates the `<path>` area/
 * line elements inside `[data-part="plot"]` -- area geometry is
 * data-driven, so there is no fixed markup for this element to merely
 * enhance.
 */
import { bindAreaChart } from './area-chart.behavior';
import {
  resolveAreaEnterClass,
  resolveAreaFillClass,
  resolveAreaLineClass,
  resolveAreaStrokeClass,
} from './area-chart.classes';

export class RaftersAreaChart extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) {
        // The generated motion utility and the (empty) line class are
        // constant across every instance -- AreaChart has no layout axis to
        // select between, unlike BarChart's barByLayout -- so both are
        // resolved once per mount via a zero-argument function rather than
        // a per-mount `areaChartClasses({}, state)` call: root/plot/table
        // are already applied at server-render/decorator-markup time
        // (area-chart.astro), never by this client script.
        this.teardown = bindAreaChart(this, {
          areaClassName: resolveAreaEnterClass(),
          lineClassName: resolveAreaLineClass(),
          resolveFillClass: resolveAreaFillClass,
          resolveStrokeClass: resolveAreaStrokeClass,
        });
      }
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-area-chart')) {
  customElements.define('rafters-area-chart', RaftersAreaChart);
}
