import type { BarChartBehaviorConfig, BarChartState, BarRect } from './bar-chart.behavior';
import type { ChartConfig } from './chart.behavior';
import { resolveSeriesClass } from './chart.classes';

export interface BarChartClassSet {
  root: string;
  plot: string;
  bar: string;
  table: string;
}

const rootClasses = 'relative block w-full h-full';

const plotClasses = 'block w-full h-full';

// THE CELL IS THE SPEC (#2017, matched to Dialog's precedent in
// dialog.classes.ts). These are the generated consumption of the TWO
// bar-chart / bar / enter* rows in packages/ui/docs/spec/matrix/motion.jsonl
// -- one per layout, because the structural extent is "grow along the VALUE
// axis from the baseline", and the value axis is y in the default vertical
// layout and x once `layout: 'horizontal'` swaps it (the same swap
// computeBars applies to its own geometry, bar-chart.behavior.ts). Two
// keyframes/cells/rows, never one keyframe driven by an inline numeric or a
// runtime CSS variable computed here. One reference per cell, no raw
// duration/easing, and no motion-reduce:animate-none -- reduced motion is
// handled INSIDE the generated utility, which zeroes animation-duration
// under the media query (05-authoring.md "Motion: a matrix cell").
// `data-state` is projected by `barAria` (bar-chart.behavior.ts); every bar
// reaches "visible" once mounted, so the keyframe plays once on mount and
// never replays on a later render (the class selector does not retrigger a
// running/finished CSS animation).
const barClassesVertical = 'data-[state=visible]:animate-grow-in-normal-enter';
const barClassesHorizontal = 'data-[state=visible]:animate-grow-in-x-normal-enter';

/**
 * Select the bar-enter matrix cell's generated utility by layout -- the
 * single place that decides scaleY (vertical, motion.jsonl's `enter` row) vs
 * scaleX (horizontal, `enter-horizontal`). Used by `barChartClasses` below
 * (React reads `.bar` off its return value directly) and injected into the
 * DOM-native client as `BarChartRuntimeClasses.barByLayout`
 * (bar-chart.element.ts / bar-chart.astro's script) so bar-chart.behavior.ts
 * never imports this module itself (Spec 01 rule 1).
 */
export function resolveBarEnterClass(layout: 'vertical' | 'horizontal'): string {
  return layout === 'horizontal' ? barClassesHorizontal : barClassesVertical;
}

// Visually hidden but present and readable by assistive tech (the pinned
// accessible structure's data-table fallback, #2225) -- `sr-only`, not
// `hidden`/`display:none`, which would remove it from the accessibility tree
// too.
const tableClasses = 'sr-only';

/**
 * BarChart classes: root/plot are pure layout (Container/Grid own spacing,
 * this family owns none, same disposition as chart.classes.ts) and do not
 * vary by layout or state. `bar` names the generated motion utility selected
 * by `config.layout` (`resolveBarEnterClass`, above) -- the per-bar FILL
 * color (`fill-chart-N`) is resolved per-instance by `resolveBarFillClass`
 * (below, this file) at render time, never in `computeBars`
 * (bar-chart.behavior.ts never imports a classes module, Spec 01 rule 1),
 * and never a hex, `var()`, or arbitrary value.
 */
export function barChartClasses(
  config: Pick<BarChartBehaviorConfig, 'layout'>,
  _state: BarChartState,
): BarChartClassSet {
  return {
    root: rootClasses,
    plot: plotClasses,
    bar: resolveBarEnterClass(config.layout ?? 'vertical'),
    table: tableClasses,
  };
}

/**
 * Resolve one bar's `fill-chart-N` literal at render time -- the classes-side
 * half of the Spec 01 rule 1 fix: `computeBars` (bar-chart.behavior.ts) only
 * returns `series`/`seriesIndex`, never a class string, so every performance
 * (React, WC, Astro) calls this instead of reading a `className` field off
 * the geometry. Thin wrapper over `resolveSeriesClass` (chart.classes.ts),
 * the same literal lookup table the whole chart family shares.
 */
export function resolveBarFillClass(
  chartConfig: ChartConfig,
  bar: Pick<BarRect, 'series' | 'seriesIndex'>,
): string {
  return resolveSeriesClass(chartConfig, bar.series, bar.seriesIndex);
}
