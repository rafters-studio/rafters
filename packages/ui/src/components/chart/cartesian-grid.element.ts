/**
 * Background grid lines for a cartesian chart -- a compositional child, never a prop
 *
 * @cognitive-load 1/10 - Two optional booleans, both defaulting to shadcn's
 * "on". No visual output of its own.
 * @attention-economics Invisible until a chart-type component (Bar/Line/Area)
 * reads it; never competes for attention on its own.
 * @trust-building Its presence or absence is the whole signal -- a consumer
 * always knows whether a chart has background grid lines by reading the
 * tree, not by hunting for a boolean prop on the chart itself.
 * @accessibility Decorative only, once real lines are drawn by the owning
 * chart type -- never announced to assistive tech.
 * @semantic-meaning Ports shadcn's `<CartesianGrid vertical={false} />` call
 * site verbatim.
 *
 * @usage-patterns
 * DO: Compose as a child of a cartesian chart when it needs background lines
 * DO: Set horizontal/vertical to false to suppress one axis of lines
 * NEVER: Render line coordinates here -- the owning chart type does, from
 *        its own plot rectangle and data domain (graph.ts gridLines/ticks)
 *
 * @example
 * ```html
 * <rafters-cartesian-grid data-part="grid" data-horizontal="true" data-vertical="true"></rafters-cartesian-grid>
 * ```
 */

/**
 * WC performance of the cartesian-grid score. Pure static with an empty
 * projection: no `bindX`, no controller -- a light-DOM marker a parent
 * chart-type bind later reads via `querySelector('[data-part="grid"]')` and
 * `dataset.horizontal`/`dataset.vertical`.
 */
export class RaftersCartesianGrid extends HTMLElement {}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-cartesian-grid')) {
  customElements.define('rafters-cartesian-grid', RaftersCartesianGrid);
}
