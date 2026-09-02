/**
 * Chart family -- ChartContainer + ChartConfig, the XAxis/YAxis/
 * CartesianGrid compositional children every cartesian chart composes
 * (#2224), and BarChart -- the first real chart-type mark, with its own Bar
 * compositional child registering one series each (#2225).
 *
 * Framework-agnostic surface only (functions + types, no module-level side
 * effects) -- same convention as the editor barrel (components/editor/index.ts):
 * the decorators (`*.tsx`/`.element.ts`/`.astro` per component) are imported
 * directly by path. This barrel should not force every consumer's bundle to
 * pay for React or run a `customElements.define` side effect just to read
 * `parseChartConfig`, `resolveSeriesClass`, or `computeBars`.
 */
export {
  applyAriaProjection,
  bindChart,
  chartContainer,
  parseChartConfig,
  resolveSeriesLabel,
} from './chart.behavior';
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

export { bar, readBarConfig } from './bar.behavior';
export type { BarConfig, BarPart, BarState } from './bar.behavior';

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
  BarChartActions,
  BarChartBehaviorConfig,
  BarChartConfig,
  BarChartPart,
  BarChartRuntimeClasses,
  BarChartState,
  BarRect,
  ComputeBarsOptions,
} from './bar-chart.behavior';
export { barChartClasses, resolveBarEnterClass, resolveBarFillClass } from './bar-chart.classes';
export type { BarChartClassSet } from './bar-chart.classes';

export { line, readLineConfig } from './line.behavior';
export type { LineConfig, LinePart, LineState } from './line.behavior';

export {
  bindLineChart,
  buildSeriesPath,
  computeDots,
  computeLinePoints,
  describePoint,
  groupPointsBySeries,
  lineAria,
  lineChart,
  pointAria,
  resolveAxisParts,
} from './line-chart.behavior';
export type {
  AxisChildDescriptor,
  AxisPartsPresence,
  ComputeLinePointsOptions,
  LineChartActions,
  LineChartBehaviorConfig,
  LineChartConfig,
  LineChartPart,
  LineChartRuntimeClasses,
  LineChartState,
  LineDot,
  LinePoint,
  ResolveAxisPartsInput,
} from './line-chart.behavior';
export {
  lineChartClasses,
  resolveDotFillClass,
  resolveLineEnterClass,
  resolveLineStrokeClass,
} from './line-chart.classes';
export type { LineChartClassSet } from './line-chart.classes';

export {
  bandCenter,
  bindChartTooltip,
  chartTooltip,
  describeDatum,
  hitTest,
  startChartTooltipEffects,
  tooltipHeaderLabel,
  tooltipRows,
} from './chart-tooltip.behavior';
export type {
  ChartDatum,
  ChartTooltipActions,
  ChartTooltipConfig,
  ChartTooltipContentConfig,
  ChartTooltipEffectsOptions,
  ChartTooltipMountConfig,
  ChartTooltipPart,
  ChartTooltipPointPayload,
  ChartTooltipState,
  IndicatorVariant,
  TooltipRowData,
} from './chart-tooltip.behavior';
export { chartTooltipClasses, chartTooltipIndicatorWrapperClass } from './chart-tooltip.classes';
export type { ChartTooltipClassSet } from './chart-tooltip.classes';

export { bindChartLegend, chartLegend, legendEntries } from './chart-legend.behavior';
export type {
  ChartLegendActions,
  ChartLegendConfig,
  ChartLegendContentConfig,
  ChartLegendEntry,
  ChartLegendPart,
  ChartLegendState,
} from './chart-legend.behavior';
export { chartLegendClasses, chartLegendSwatchWrapperClass } from './chart-legend.classes';
export type { ChartLegendClassSet } from './chart-legend.classes';
