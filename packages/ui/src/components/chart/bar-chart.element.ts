/**
 * Bar chart -- grouped/stacked bar marks for the rafters chart family
 *
 * @cognitive-load 3/10 - One structural decision (layout vertical/horizontal)
 * plus an optional grouped/stacked toggle; series and colors flow from
 * ChartConfig, categories from the composed XAxis child. Low because the
 * shape is fully determined by data plus two booleans, not open
 * configuration.
 * @attention-economics The bars ARE the content -- unlike ChartContainer's
 * invisible scaffolding, this component draws the primary visual a chart
 * exists for. The bar-enter motion draws the eye to a newly-arrived value on
 * mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale primitives every chart in the
 * family shares, so a Bar and a future Line agree on where a category sits.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label; its
 * SVG is aria-hidden; arrow keys (and Home/End) move an active-datum cursor
 * announced via sr-announcer, focus staying on the figure rather than
 * entering the SVG; a visually-hidden data table carries the same data in
 * fully accessible tabular form, always present in the DOM. axe passes for
 * the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<BarChart data={data}><Bar dataKey=/></BarChart>`
 * call site: `series` names the data keys to plot (shadcn expresses the same
 * thing as `<Bar dataKey="desktop" />` children); categoryKey moves to the
 * composed <XAxis dataKey> child rather than a chart-level prop (veneer's
 * compositional-children amendment, bullpen 01a058ec).
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose <XAxis dataKey="..."/> as a BarChart child for the category axis
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```html
 * <rafters-chart-container data-part="root" data-config='{"desktop":{"token":"chart-1"}}'>
 *   <div data-part="plot">
 *     <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
 *     <rafters-bar-chart data-part="root" data-config='{"data":[{"month":"Jan","desktop":100}],"series":["desktop"]}'>
 *       <svg data-part="plot"></svg>
 *       <table data-part="table"></table>
 *     </rafters-bar-chart>
 *   </div>
 * </rafters-chart-container>
 * ```
 */

/**
 * WC performance of the bar-chart score: a light-DOM enhancer, same shape as
 * `RaftersDialog`. The score AND the DOM-native binding (`bindBarChart`) live
 * in bar-chart.behavior.ts, shared with the Astro performance; this file only
 * adapts that binding to the custom-element lifecycle, deferring the bind one
 * microtask because `connectedCallback` can fire before the light-DOM `plot`/
 * `table` parts are parsed (05-authoring WC bind timing rule). Unlike the
 * static XAxis/YAxis/CartesianGrid elements, `bindBarChart` itself creates the
 * `<rect>` bar elements inside `[data-part="plot"]` -- bar geometry is
 * data-driven, so there is no fixed markup for this element to merely enhance.
 */
import { bindBarChart } from './bar-chart.behavior';
import { barChartClasses, resolveBarFillClass } from './bar-chart.classes';

export class RaftersBarChart extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (this.isConnected && !this.teardown) {
        // `barChartClasses` ignores both arguments (root/plot/bar/table are
        // constant regardless of layout/state) -- placeholder values, same
        // as bar-chart.astro's server-render call.
        const classes = barChartClasses(
          { layout: 'vertical' },
          { bars: [], valueTicks: [], activeIndex: null },
        );
        this.teardown = bindBarChart(this, {
          bar: classes.bar,
          resolveFillClass: resolveBarFillClass,
        });
      }
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-bar-chart')) {
  customElements.define('rafters-bar-chart', RaftersBarChart);
}
