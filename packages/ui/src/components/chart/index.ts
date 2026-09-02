/**
 * Chart family -- ChartContainer + ChartConfig, and the XAxis/YAxis/
 * CartesianGrid compositional children every cartesian chart composes
 * (#2224).
 *
 * Framework-agnostic surface only (functions + types, no module-level side
 * effects) -- same convention as the editor barrel (components/editor/index.ts):
 * the five decorators (`chart.tsx`/`.element.ts`/`.astro`, and the same trio
 * per axis/grid child) are imported directly by path. This barrel should not
 * force every consumer's bundle to pay for React or run a `customElements.define`
 * side effect just to read `parseChartConfig` or `resolveSeriesClass`.
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
