import type { AreaChartState, AreaSeriesGeometry } from './area-chart.behavior';
import type { ChartConfig } from './chart.behavior';
import { resolveSeriesClass, resolveSeriesStrokeClass } from './chart.classes';

export interface AreaChartClassSet {
  root: string;
  plot: string;
  area: string;
  line: string;
  table: string;
}

const rootClasses = 'relative block w-full h-full';

const plotClasses = 'block w-full h-full';

// THE CELL IS THE SPEC (#2017, matched to Dialog's precedent, same
// discipline bar-chart.classes.ts follows). This is the generated
// consumption of the ONE (area-chart, area, enter) row in
// packages/ui/docs/spec/matrix/motion.jsonl -- a fade, not a scale (unlike
// bar-chart's grow-from-baseline pair), because a stacked series has no
// single baseline edge to grow from (its baseline is the series below it's
// own top curve, area-chart.behavior.ts's computeAreas). One keyframe/cell/
// row, never a numeric duration or a runtime CSS variable. `data-state` is
// projected by `areaAria` (area-chart.behavior.ts); every area reaches
// "visible" once mounted, so the keyframe plays once and never replays on a
// later render.
const areaClasses = 'data-[state=visible]:animate-fade-in-moderate-enter';

// The optional top-edge stroke (line part) carries no motion of its own --
// the issue names ONE motion moment (the area's reveal); the line is a
// static decoration over it. No class beyond its resolved stroke color, so
// this is an empty string, not an unused-but-present utility.
const lineClasses = '';

/**
 * Select the area-enter matrix cell's generated utility -- the single place
 * that names it, so area-chart.element.ts / area-chart.astro's script (the
 * DOM-native `AreaChartRuntimeClasses` callers, area-chart.behavior.ts)
 * import this rather than each hardcoding the literal, same role
 * `resolveBarEnterClass` plays for BarChart. Takes no argument: unlike
 * BarChart's vertical/horizontal split, AreaChart has no layout axis to
 * select between.
 */
export function resolveAreaEnterClass(): string {
  return areaClasses;
}

/** The (currently empty) line-part class, named the same way for the same
 *  reason -- see `resolveAreaEnterClass`. */
export function resolveAreaLineClass(): string {
  return lineClasses;
}

// Visually hidden but present and readable by assistive tech (the pinned
// accessible structure's data-table fallback, same as bar-chart.classes.ts)
// -- `sr-only`, not `hidden`/`display:none`.
const tableClasses = 'sr-only';

/**
 * AreaChart classes: root/plot are pure layout (Container/Grid own
 * spacing, this family owns none) and do not vary by state. `area` names
 * the generated motion utility (above); the per-series FILL/STROKE color
 * (`fill-chart-N`/`stroke-chart-N`) is resolved per-instance by
 * `resolveAreaFillClass`/`resolveAreaStrokeClass` (below) at render time,
 * never in `computeAreas` (area-chart.behavior.ts never imports a classes
 * module, Spec 01 rule 1), and never a hex, `var()`, or arbitrary value.
 *
 * The issue's Color section names an optional extra: "the token layer's
 * fill treatment for overlap legibility if the token provides one" --
 * verified against packages/design-tokens/src/generators/types.ts's
 * `SEMANTIC_INTENTS`: only the five flat `chart-1..chart-5` color tokens
 * exist, no opacity/overlap companion. Recorded as a spec gap here (and in
 * the PR) rather than inventing an arbitrary fill-opacity utility, which
 * would fail this file's own no-hex/no-arbitrary discipline (AC3).
 */
export function areaChartClasses(
  _config: Record<never, never>,
  _state: AreaChartState,
): AreaChartClassSet {
  return {
    root: rootClasses,
    plot: plotClasses,
    area: areaClasses,
    line: lineClasses,
    table: tableClasses,
  };
}

/**
 * Resolve one series' `fill-chart-N` literal at render time -- the
 * classes-side half of the Spec 01 rule 1 fix, same role
 * `resolveBarFillClass` plays for BarChart. `computeAreas`
 * (area-chart.behavior.ts) only returns `key`/`seriesIndex`, never a class
 * string, so every performance (React, WC, Astro) calls this instead.
 */
export function resolveAreaFillClass(
  chartConfig: ChartConfig,
  series: Pick<AreaSeriesGeometry, 'key' | 'seriesIndex'>,
): string {
  return resolveSeriesClass(chartConfig, series.key, series.seriesIndex);
}

/** Same resolution over the stroke channel, for the optional top-edge line. */
export function resolveAreaStrokeClass(
  chartConfig: ChartConfig,
  series: Pick<AreaSeriesGeometry, 'key' | 'seriesIndex'>,
): string {
  return resolveSeriesStrokeClass(chartConfig, series.key, series.seriesIndex);
}
