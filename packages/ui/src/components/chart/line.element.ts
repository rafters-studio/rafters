/**
 * One data series for a LineChart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - One required decision: which data key this series
 * plots. No visual surface of its own to reason about.
 * @attention-economics Invisible on its own; contributes to the existence
 * and ORDER of the lines LineChart renders -- the series list LineChart
 * derives from composed `<Line>` children follows their declaration order
 * exactly.
 * @trust-building A consumer always knows a chart's series (which, and in
 * what order) by reading the tree, not by hunting for an array prop or a
 * hidden z-order rule -- reordering `<Line>` children reorders the rendered
 * series deterministically.
 * @accessibility Structural marker only; the accessible line geometry,
 * color, and keyboard traversal all belong to the owning LineChart (#2226
 * pins the pattern, mirroring #2225's Bar/BarChart split), which is the one
 * thing this child feeds (its `dataKey`).
 * @semantic-meaning Ports shadcn's `<Line dataKey="desktop" />` call site
 * verbatim: LineChart derives its series list from composed `<Line>`
 * children, in declaration order, whenever at least one is present;
 * LineChart's own `series: string[]` config still works with no `<Line>`
 * children at all, and `<Line>` children take precedence outright when both
 * are given.
 *
 * @usage-patterns
 * DO: Compose one `<Line dataKey="..."/>` per series, in the order they should render
 * DO: Rely on `<Line>` children order for series order -- no separate index/z prop exists
 * NEVER: Pass BOTH `series` and `<Line>` children expecting them to merge -- children win outright
 * NEVER: Add a color, token, or other visual prop here -- ChartConfig's token map owns color
 *
 * @example
 * ```html
 * <rafters-line-chart data-part="root" data-config='{"data":[{"month":"Jan","desktop":100}]}'>
 *   <rafters-x-axis data-part="x-axis" data-key="month" hidden></rafters-x-axis>
 *   <rafters-line data-part="series" data-key="desktop" hidden></rafters-line>
 *   <rafters-line data-part="series" data-key="mobile" hidden></rafters-line>
 *   <svg data-part="plot"></svg>
 *   <table data-part="table"></table>
 * </rafters-line-chart>
 * ```
 */

/**
 * WC performance of the line score. Pure static with an empty projection
 * (like bar.element.ts): no bind, no controller -- the element is a
 * light-DOM marker the owning LineChart's bind later reads via
 * `querySelectorAll('[data-part="series"]')` and each element's `dataset.key`,
 * in DOM order. `hidden` is set by the decorator markup (React/Astro), not
 * computed here.
 */
export class RaftersLine extends HTMLElement {}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-line')) {
  customElements.define('rafters-line', RaftersLine);
}
