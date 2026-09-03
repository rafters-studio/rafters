/**
 * Area chart -- overlaid/stacked area marks for the rafters chart family
 *
 * @cognitive-load 3/10 - One structural decision (overlaid vs stacked) plus
 * an optional smooth toggle; series and colors flow from ChartConfig,
 * categories from the composed XAxis child. Low because the shape is fully
 * determined by data plus two booleans, not open configuration -- same
 * budget as BarChart (#2225), which this component mirrors structurally.
 * @attention-economics The filled areas ARE the content -- unlike
 * ChartContainer's invisible scaffolding, this component draws the primary
 * visual a chart exists for. The area-enter fade draws the eye to newly-
 * arrived values on mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale/areaPath primitives every chart
 * in the family shares, so an Area and a Bar agree on where a category
 * sits. Stacked baselines are literal running sums, assertable against a
 * fixture -- never an approximation.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label;
 * its SVG is aria-hidden; arrow keys (and Home/End) move an active-datum
 * cursor announced via sr-announcer, focus staying on the figure rather
 * than entering the SVG; a visually-hidden data table carries the same
 * data in fully accessible tabular form, always present in the DOM. axe
 * passes for the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<AreaChart data={data}><Area
 * dataKey="desktop"/></AreaChart>` call site directly: composed `<Area
 * dataKey>` children (area.tsx, #2227) register a chart's series, in
 * declaration order (also the stack order), and take precedence outright
 * over the `series: string[]` config prop when both are present; `series`
 * alone still fully works with no `<Area>` children composed at all.
 * categoryKey moves to the composed <XAxis dataKey> child rather than a
 * chart-level prop (veneer's compositional-children amendment, bullpen
 * 01a058ec).
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose one <Area dataKey="..."/> per series for the shadcn-parity call site
 * DO: Compose <XAxis dataKey="..."/> as an AreaChart child for the category axis
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Pass BOTH series and <Area> children expecting them to merge -- children win outright
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <AreaChart data={data} stacked>
 *     <CartesianGrid />
 *     <XAxis dataKey="month" />
 *     <YAxis />
 *     <Area dataKey="desktop" />
 *     <Area dataKey="mobile" />
 *   </AreaChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import { useChartConfig, useChartSize } from './chart';
import {
  areaAria,
  areaChart,
  buildAreaChartLabel,
  computeAreas,
  describeArea,
  type AreaChartBehaviorConfig,
  type AreaChartConfig,
  type AreaChartState,
} from './area-chart.behavior';
import {
  areaChartClasses,
  resolveAreaFillClass,
  resolveAreaStrokeClass,
} from './area-chart.classes';
import { Area } from './area';
import { XAxis } from './x-axis';

export interface AreaChartProps extends Omit<AreaChartConfig, 'series'> {
  /** Optional when composed `<Area dataKey>` children supply the series list
   *  instead (area.tsx, #2227) -- required in `AreaChartConfig` for the
   *  WC/Astro layer, where there is no React children tree to read. */
  series?: string[] | undefined;
  /** CartesianGrid/XAxis/YAxis/Area, composed as children (shadcn parity's
   *  `<AreaChart><XAxis dataKey="month"/><Area dataKey="desktop"/></AreaChart>`
   *  call site). AreaChart reads the category key off the composed XAxis
   *  child's `dataKey` prop and, when at least one `<Area>` child is
   *  present, its series list off their `dataKey` props in order (taking
   *  precedence over the `series` prop) -- it never accepts a categoryKey
   *  prop, and `series` remains the only way to name series with no
   *  `<Area>` children. */
  children?: React.ReactNode | undefined;
}

/** The one targeted read this component does over its own children: find the
 *  composed `<XAxis>` and return its `dataKey`, or `''` if omitted -- same
 *  shape `categoryKeyFromChildren` (bar-chart.tsx) uses. */
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

/** Series from composed `<Area dataKey>` children, in declaration order, or
 *  `[]` when none are composed -- the React-props-tree counterpart of
 *  `seriesFromAreaChildren` (area-chart.behavior.ts's DOM-based read for
 *  the WC/Astro performances). Empty `dataKey` values are skipped rather
 *  than pushed as `''`. */
function seriesFromChildren(children: React.ReactNode): string[] {
  const found: string[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== Area) return;
    const dataKey = (child.props as { dataKey?: string }).dataKey;
    if (dataKey) found.push(dataKey);
  });
  return found;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  series = [],
  smooth = false,
  stacked = false,
  children,
}) => {
  const chartConfig = useChartConfig();
  const size = useChartSize();
  const categoryKey = React.useMemo(() => categoryKeyFromChildren(children), [children]);
  // Composed <Area> children win outright over the `series` prop when at
  // least one is present -- same precedence readAreaChartConfig gives
  // seriesFromAreaChildren over data-config's series array (area-chart.behavior.ts).
  const areaChildSeries = React.useMemo(() => seriesFromChildren(children), [children]);
  const resolvedSeries = areaChildSeries.length > 0 ? areaChildSeries : series;

  const config: AreaChartBehaviorConfig = {
    data,
    series: resolvedSeries,
    smooth,
    stacked,
    chartConfig,
    categoryKey,
    width: size.width,
    height: size.height,
  };

  const geometry = React.useMemo(
    () =>
      computeAreas({ data, series: resolvedSeries }, chartConfig, {
        categoryKey,
        width: size.width,
        height: size.height,
        smooth,
        stacked,
      }),
    [data, resolvedSeries, chartConfig, categoryKey, size.width, size.height, smooth, stacked],
  );

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  // The cursor only makes sense against the CURRENT datum set; a data/
  // geometry change resets it rather than leaving it pointed at a stale
  // index -- same choice bar-chart.tsx makes.
  React.useEffect(() => {
    setActiveIndex(null);
  }, [geometry]);

  React.useEffect(() => {
    if (activeIndex === null) return;
    const datum = geometry.datums[activeIndex];
    if (datum) announceToScreenReader(describeArea(datum), 'polite');
  }, [activeIndex, geometry]);

  const state: AreaChartState = { ...geometry, valueTicks: [], activeIndex };
  const classes = areaChartClasses({}, state);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const action = areaChart.keymap(
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
    if (!action || !areaChart.canDispatch(state, action, config)) return;
    event.preventDefault();
    setActiveIndex(areaChart.actions[action](state, undefined).activeIndex);
  };

  const label = buildAreaChartLabel(config);

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
        {geometry.series.map((series) => {
          const attrs = areaAria(series.key, state, config, {});
          return (
            <path
              key={series.key}
              data-part="area"
              data-series-key={series.key}
              d={series.areaPath}
              className={
                classy(resolveAreaFillClass(chartConfig, series), classes.area) || undefined
              }
              aria-hidden={attrs['aria-hidden'] === 'true'}
              data-state={typeof attrs['data-state'] === 'string' ? attrs['data-state'] : undefined}
              data-active={
                typeof attrs['data-active'] === 'string' ? attrs['data-active'] : undefined
              }
            />
          );
        })}
        {geometry.series.map((series) => {
          const attrs = areaAria(series.key, state, config, {});
          return (
            <path
              key={series.key}
              data-part="line"
              data-series-key={series.key}
              d={series.linePath}
              fill="none"
              className={
                classy(resolveAreaStrokeClass(chartConfig, series), classes.line) || undefined
              }
              aria-hidden={attrs['aria-hidden'] === 'true'}
              data-state={typeof attrs['data-state'] === 'string' ? attrs['data-state'] : undefined}
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
          {geometry.datums.map((datum) => (
            <tr key={datum.key}>
              <td>{datum.category}</td>
              <td>{datum.series}</td>
              <td>{datum.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

AreaChart.displayName = 'AreaChart';

export default AreaChart;
