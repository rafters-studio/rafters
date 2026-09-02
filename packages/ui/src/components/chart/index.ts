/**
 * Chart family -- ChartContainer + ChartConfig, the XAxis/YAxis/
 * CartesianGrid compositional children every cartesian chart composes
 * (#2224), and BarChart -- the first real chart-type mark (#2225).
 *
 * Framework-agnostic surface only (functions + types, no module-level side
 * effects) -- same convention as the editor barrel (components/editor/index.ts):
 * the decorators (`*.tsx`/`.element.ts`/`.astro` per component) are imported
 * directly by path. This barrel should not force every consumer's bundle to
 * pay for React or run a `customElements.define` side effect just to read
 * `parseChartConfig`, `resolveSeriesClass`, or `computeBars`.
 */
export { bindChart, chartContainer, parseChartConfig } from './chart.behavior';
export type {
  ChartConfig,
  ChartContainerActions,
  ChartContainerConfig,
  ChartContainerPart,
  ChartContainerState,
  ChartSeriesConfig,
  ChartSize,
  ChartToken,
} from './chart.behavior';
export {
  chartContainerClasses,
  resolveSeriesClass,
  resolveSeriesStrokeClass,
} from './chart.classes';
export type { ChartContainerClassSet } from './chart.classes';

export { readXAxisConfig, xAxis } from './x-axis.behavior';
export type { XAxisConfig, XAxisPart, XAxisState } from './x-axis.behavior';

export { readYAxisConfig, yAxis } from './y-axis.behavior';
export type { YAxisConfig, YAxisPart, YAxisState } from './y-axis.behavior';

export { cartesianGrid, readCartesianGridConfig } from './cartesian-grid.behavior';
export type {
  CartesianGridConfig,
  CartesianGridPart,
  CartesianGridState,
} from './cartesian-grid.behavior';

export {
  barAria,
  barChart,
  bindBarChart,
  buildChartLabel,
  computeBars,
  describeBar,
  transformOriginFor,
} from './bar-chart.behavior';
export type {
  Bar,
  BarChartActions,
  BarChartBehaviorConfig,
  BarChartConfig,
  BarChartPart,
  BarChartRuntimeClasses,
  BarChartState,
  ComputeBarsOptions,
} from './bar-chart.behavior';
export { barChartClasses, resolveBarFillClass } from './bar-chart.classes';
export type { BarChartClassSet } from './bar-chart.classes';
