import type { BarChartBehaviorConfig, BarChartState } from './bar-chart.behavior';

export interface BarChartClassSet {
  root: string;
  plot: string;
  bar: string;
  table: string;
}

const rootClasses = 'relative block w-full h-full';

const plotClasses = 'block w-full h-full';

// THE CELL IS THE SPEC (#2017, matched to Dialog's precedent in
// dialog.classes.ts). This is the generated consumption of ONE row of
// packages/ui/docs/spec/matrix/motion.jsonl -- bar-chart / bar / enter
// (normal, enter). One reference per cell, no raw duration/easing, and no
// motion-reduce:animate-none -- reduced motion is handled INSIDE the
// generated utility, which zeroes animation-duration under the media query
// (05-authoring.md "Motion: a matrix cell"). `data-state` is projected by
// `barAria` (bar-chart.behavior.ts); every bar reaches "visible" once mounted,
// so the keyframe plays once on mount and never replays on a later render
// (the class selector does not retrigger a running/finished CSS animation).
const barClasses = 'data-[state=visible]:animate-bar-chart-bar-enter';

// Visually hidden but present and readable by assistive tech (the pinned
// accessible structure's data-table fallback, #2225) -- `sr-only`, not
// `hidden`/`display:none`, which would remove it from the accessibility tree
// too.
const tableClasses = 'sr-only';

/**
 * BarChart classes: root/plot are pure layout (Container/Grid own spacing,
 * this family owns none, same disposition as chart.classes.ts). `bar` names
 * only the generated motion utility -- the per-bar FILL color
 * (`fill-chart-N`) is resolved per-instance by `resolveSeriesClass`
 * (chart.classes.ts) inside `computeBars`, never here, and never a hex,
 * `var()`, or arbitrary value.
 */
export function barChartClasses(
  _config: Pick<BarChartBehaviorConfig, 'layout'>,
  _state: BarChartState,
): BarChartClassSet {
  return {
    root: rootClasses,
    plot: plotClasses,
    bar: barClasses,
    table: tableClasses,
  };
}
