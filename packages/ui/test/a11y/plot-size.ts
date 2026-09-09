/**
 * A stylesheet pinning the chart plot box, for use in the a11y browser lane.
 *
 * No stylesheet loads there, so an unpinned plot has no size of its own. The
 * real ResizeObserver then reports a content-driven height that the chart's own
 * svg feeds back into on every frame, instead of the stable box the unit suite
 * stubs. Pinning it makes the scene settle before axe reads it.
 *
 * Height is a parameter because a chart and a tooltip want different boxes;
 * width does not vary, so it is not one.
 */
export function plotSize(height = 200): string {
  return `div[data-part="plot"]{width:300px;height:${height}px}`;
}
