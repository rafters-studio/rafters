/**
 * Line chart -- one path per series for the rafters chart family
 *
 * @cognitive-load 3/10 - Two independent booleans (smooth curve, dot
 * markers) plus whichever axis children are composed or omitted; series and
 * colors flow from ChartConfig, categories from the composed XAxis child
 * when present. Low because the shape is fully determined by data plus two
 * booleans and composition, not open configuration.
 * @attention-economics The line IS the content -- unlike ChartContainer's
 * invisible scaffolding, this component draws the primary visual a chart
 * exists for. The line-enter motion draws the eye to a newly-arrived series
 * on mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale primitives Bar (#2225) already
 * proved, so a Bar and a Line agree on where a category sits. A monotone
 * curve (`smooth`) never overshoots the data -- it stays within each pair of
 * points' own value range, so a reader never sees a peak or trough the data
 * does not have.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label; its
 * SVG is aria-hidden; arrow keys (and Home/End) move an active-datum cursor
 * announced via sr-announcer, focus staying on the figure rather than
 * entering the SVG; a visually-hidden data table carries the same data in
 * fully accessible tabular form, always present in the DOM. axe passes for
 * the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<LineChart data={data}><Line
 * dataKey="desktop"/></LineChart>` call site directly: composed `<Line
 * dataKey>` children (line.tsx, #2226) register a chart's series, in
 * declaration order, and take precedence outright over the `series:
 * string[]` config prop when both are present; `series` alone still fully
 * works with no `<Line>` children composed at all. categoryKey moves to the
 * composed <XAxis dataKey> child rather than a chart-level prop (veneer's
 * compositional-children amendment, bullpen 01a058ec). A LineChart with NO
 * XAxis/YAxis/CartesianGrid/legend children composed renders axis-less BY
 * OMISSION -- the #2230 StatTile sparkline shape -- never via a
 * `minimal`/`axisless` prop.
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose one <Line dataKey="..."/> per series for the shadcn-parity call site
 * DO: Compose <XAxis dataKey="..."/> as a LineChart child for the category axis
 * DO: Omit XAxis/YAxis/CartesianGrid entirely for a sparkline -- omission, never a flag
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Pass BOTH series and <Line> children expecting them to merge -- children win outright
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <LineChart data={data} smooth>
 *     <CartesianGrid />
 *     <XAxis dataKey="month" />
 *     <YAxis />
 *     <Line dataKey="desktop" />
 *     <Line dataKey="mobile" />
 *   </LineChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import { useChartConfig, useChartSize } from './chart';
import {
  buildChartLabel,
  buildSeriesPath,
  computeDots,
  computeLinePoints,
  describePoint,
  groupPointsBySeries,
  lineAria,
  lineChart,
  pointAria,
  resolveAxisParts,
  type AxisChildDescriptor,
  type LineChartBehaviorConfig,
  type LineChartConfig,
  type LineChartState,
  type LinePoint,
} from './line-chart.behavior';
import {
  lineChartClasses,
  resolveDotFillClass,
  resolveLineStrokeClass,
} from './line-chart.classes';
import { Line } from './line';
import { XAxis } from './x-axis';
import { YAxis } from './y-axis';
import { CartesianGrid } from './cartesian-grid';

export interface LineChartProps extends Omit<LineChartConfig, 'series'> {
  /** Optional when composed `<Line dataKey>` children supply the series list
   *  instead (line.tsx, #2226) -- required in `LineChartConfig` for the
   *  score/WC/Astro layer, where there is no React children tree to read. */
  series?: string[] | undefined;
  /** CartesianGrid/XAxis/YAxis/Line, composed as children (shadcn parity's
   *  `<LineChart><XAxis dataKey="month"/><Line dataKey="desktop"/></LineChart>`
   *  call site). LineChart reads the category key off the composed XAxis
   *  child's `dataKey` prop and, when at least one `<Line>` child is present,
   *  its series list off their `dataKey` props in order (taking precedence
   *  over the `series` prop) -- it never accepts a categoryKey prop, and
   *  `series` remains the only way to name series with no `<Line>` children.
   *  Omitting XAxis/YAxis/CartesianGrid entirely renders axis-less by
   *  omission (the #2230 sparkline shape). */
  children?: React.ReactNode | undefined;
}

/** The one targeted read this component does over its own children beyond
 *  `<Line>`: find the composed `<XAxis>` and return its `dataKey`, or `''`
 *  if omitted -- same fallback rationale `categoryKeyFromChildren`
 *  (bar-chart.tsx) documents, except `computeLinePoints`'s own
 *  `resolveCategory` spreads an unresolved category across the row index
 *  rather than collapsing it, so an axis-less LineChart still plots a real
 *  sparkline instead of one degenerate band. */
function categoryKeyFromChildren(children: React.ReactNode): string {
  let categoryKey = '';
  React.Children.forEach(children, (child) => {
    if (categoryKey || !React.isValidElement(child)) return;
    if (child.type === XAxis) {
      categoryKey = (child.props as { dataKey?: string }).dataKey ?? '';
    }
  });
  return categoryKey;
}

/** Series from composed `<Line dataKey>` children, in declaration order, or
 *  `[]` when none are composed -- the React-props-tree counterpart of
 *  `seriesFromLineChildren` (line-chart.behavior.ts's DOM-based read). */
function seriesFromChildren(children: React.ReactNode): string[] {
  const found: string[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== Line) return;
    const dataKey = (child.props as { dataKey?: string }).dataKey;
    if (dataKey) found.push(dataKey);
  });
  return found;
}

/** `resolveAxisParts`'s React input: which of XAxis/YAxis/CartesianGrid are
 *  composed as direct children, normalized to the same `AxisChildDescriptor`
 *  vocabulary the DOM-native client's `axisPartsFromContainer`
 *  (line-chart.behavior.ts) builds from `[data-part]`. */
function axisChildDescriptorsFromChildren(children: React.ReactNode): AxisChildDescriptor[] {
  const found: AxisChildDescriptor[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === XAxis) found.push({ part: 'x-axis' });
    else if (child.type === YAxis) found.push({ part: 'y-axis' });
    else if (child.type === CartesianGrid) found.push({ part: 'grid' });
  });
  return found;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  series = [],
  smooth = false,
  dots = true,
  children,
}) => {
  const chartConfig = useChartConfig();
  const size = useChartSize();
  const categoryKey = React.useMemo(() => categoryKeyFromChildren(children), [children]);
  // Composed <Line> children win outright over the `series` prop when at
  // least one is present -- same precedence readLineChartConfig gives
  // seriesFromLineChildren over data-config's series array.
  const lineChildSeries = React.useMemo(() => seriesFromChildren(children), [children]);
  const resolvedSeries = lineChildSeries.length > 0 ? lineChildSeries : series;
  const axisParts = React.useMemo(
    () => resolveAxisParts({ children: axisChildDescriptorsFromChildren(children) }),
    [children],
  );

  const config: LineChartBehaviorConfig = {
    data,
    series: resolvedSeries,
    smooth,
    dots,
    chartConfig,
    categoryKey,
    width: size.width,
    height: size.height,
    axisParts,
  };

  const points = React.useMemo(
    () =>
      computeLinePoints(
        { data, series: resolvedSeries },
        { categoryKey, width: size.width, height: size.height },
      ),
    [data, resolvedSeries, categoryKey, size.width, size.height],
  );

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  // The cursor only makes sense against the CURRENT point set; a
  // data/geometry change resets it rather than leaving it pointed at a
  // stale index -- same choice BarChart's own effect makes.
  React.useEffect(() => {
    setActiveIndex(null);
  }, [points]);

  React.useEffect(() => {
    if (activeIndex === null) return;
    const point = points[activeIndex];
    if (point) announceToScreenReader(describePoint(point), 'polite');
  }, [activeIndex, points]);

  const state: LineChartState = { points, valueTicks: [], activeIndex };
  const classes = lineChartClasses({ smooth, dots }, state);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const action = lineChart.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      state,
      'root',
      config,
    );
    if (!action || !lineChart.canDispatch(state, action, config)) return;
    event.preventDefault();
    setActiveIndex(lineChart.actions[action](state, undefined).activeIndex);
  };

  const label = buildChartLabel(config);

  const bySeries = groupPointsBySeries(points);

  return (
    <figure
      data-part="root"
      role="figure"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={classy(classes.root) || undefined}
    >
      {children}
      <svg
        data-part="plot"
        aria-hidden="true"
        viewBox={`0 0 ${size.width} ${size.height}`}
        className={classy(classes.plot) || undefined}
      >
        {Array.from(bySeries.entries()).map(([seriesKey, seriesPoints]) => {
          const firstPoint = seriesPoints[0] as LinePoint;
          const attrs = lineAria(seriesKey, state, config, {});
          return (
            <path
              key={seriesKey}
              data-part="line"
              data-series-key={seriesKey}
              d={buildSeriesPath(seriesPoints, { smooth })}
              fill="none"
              className={classy(resolveLineStrokeClass(chartConfig, firstPoint), classes.line)}
              aria-hidden={attrs['aria-hidden'] === 'true'}
              data-state={typeof attrs['data-state'] === 'string' ? attrs['data-state'] : undefined}
            />
          );
        })}
        {dots &&
          computeDots(points).map((dot) => {
            const attrs = pointAria(dot.key, state, config, {});
            return (
              <circle
                key={dot.key}
                data-part="point"
                data-point-key={dot.key}
                cx={dot.x}
                cy={dot.y}
                r={3}
                className={classy(resolveDotFillClass(chartConfig, dot)) || undefined}
                aria-hidden={attrs['aria-hidden'] === 'true'}
                data-state={
                  typeof attrs['data-state'] === 'string' ? attrs['data-state'] : undefined
                }
                data-active={
                  typeof attrs['data-active'] === 'string' ? attrs['data-active'] : undefined
                }
              />
            );
          })}
      </svg>
      <table data-part="table" className={classy(classes.table) || undefined}>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Series</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <td>{point.category}</td>
              <td>{point.series}</td>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

LineChart.displayName = 'LineChart';

export default LineChart;
