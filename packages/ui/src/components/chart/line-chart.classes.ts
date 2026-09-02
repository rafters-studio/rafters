import type {
  LineChartBehaviorConfig,
  LineChartState,
  LineDot,
  LinePoint,
} from './line-chart.behavior';
import type { ChartConfig } from './chart.behavior';
import { resolveSeriesClass, resolveSeriesStrokeClass } from './chart.classes';

export interface LineChartClassSet {
  root: string;
  plot: string;
  line: string;
  table: string;
}

const rootClasses = 'relative block w-full h-full';

const plotClasses = 'block w-full h-full';

// THE CELL IS THE SPEC (#2017, same precedent bar-chart.classes.ts's own
// comment cites). This is the generated consumption of the ONE
// line-chart / line / enter row in
// packages/ui/docs/spec/matrix/motion.jsonl -- a single cell, unlike Bar's
// two (vertical/horizontal), because Line has no `layout` prop to branch
// on. One keyframe/cell/row, never one driven by an inline numeric or a
// runtime CSS variable computed here. `data-state` is projected by
// `lineAria` (line-chart.behavior.ts); every line reaches "visible" once
// mounted, so the keyframe plays once on mount and never replays on a later
// render.
const lineClasses = 'data-[state=visible]:animate-line-chart-line-enter';

/** Select the line-enter matrix cell's generated utility -- the single place
 *  that names it. Used by `lineChartClasses` below (React reads `.line` off
 *  its return value directly) and injected into the DOM-native client as
 *  `LineChartRuntimeClasses.lineEnterClass` (line-chart.element.ts /
 *  line-chart.astro's script) so line-chart.behavior.ts never imports this
 *  module itself (Spec 01 rule 1). A plain string, not a resolver function
 *  like `resolveBarEnterClass` -- there is no layout variant to select
 *  between. */
export function resolveLineEnterClass(): string {
  return lineClasses;
}

// Visually hidden but present and readable by assistive tech -- same
// disposition as bar-chart.classes.ts's own tableClasses.
const tableClasses = 'sr-only';

/**
 * LineChart classes: root/plot are pure layout and do not vary by state,
 * same disposition as chart.classes.ts and bar-chart.classes.ts. `line`
 * names the generated motion utility (`resolveLineEnterClass`, above) --
 * the per-series STROKE color (`stroke-chart-N`) and per-dot FILL color
 * (`fill-chart-N`) are resolved per-instance by `resolveLineStrokeClass`/
 * `resolveDotFillClass` (below, this file) at render time, never in
 * `computeLinePoints` (line-chart.behavior.ts never imports a classes
 * module, Spec 01 rule 1), and never a hex, `var()`, or arbitrary value.
 */
export function lineChartClasses(
  _config: Pick<LineChartBehaviorConfig, 'smooth' | 'dots'>,
  _state: LineChartState,
): LineChartClassSet {
  return {
    root: rootClasses,
    plot: plotClasses,
    line: resolveLineEnterClass(),
    table: tableClasses,
  };
}

/**
 * Resolve one series' `stroke-chart-N` literal at render time -- the
 * classes-side half of the Spec 01 rule 1 fix, same rationale
 * `resolveBarFillClass` (bar-chart.classes.ts) documents. Thin wrapper over
 * `resolveSeriesStrokeClass` (chart.classes.ts), anticipated there for
 * exactly this (Line #2226, Area #2227).
 */
export function resolveLineStrokeClass(
  chartConfig: ChartConfig,
  point: Pick<LinePoint, 'series' | 'seriesIndex'>,
): string {
  return resolveSeriesStrokeClass(chartConfig, point.series, point.seriesIndex);
}

/**
 * Resolve one dot's `fill-chart-N` literal at render time -- the SAME
 * literal a dot's owning line resolves for its stroke (a dot always agrees
 * with its line's color), via `resolveSeriesClass` (chart.classes.ts, the
 * fill channel).
 */
export function resolveDotFillClass(
  chartConfig: ChartConfig,
  dot: Pick<LineDot, 'series' | 'seriesIndex'>,
): string {
  return resolveSeriesClass(chartConfig, dot.series, dot.seriesIndex);
}
