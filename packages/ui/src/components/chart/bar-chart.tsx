/**
 * Bar chart -- grouped/stacked bar marks for the rafters chart family
 *
 * @cognitive-load 3/10 - One structural decision (layout vertical/horizontal)
 * plus an optional grouped/stacked toggle; series and colors flow from
 * ChartConfig, categories from the composed XAxis child. Low because the
 * shape is fully determined by data plus two booleans, not open
 * configuration.
 * @attention-economics The bars ARE the content -- unlike ChartContainer's
 * invisible scaffolding, this component draws the primary visual a chart
 * exists for. The bar-enter motion draws the eye to a newly-arrived value on
 * mount, then gets out of the way (no ongoing animation).
 * @trust-building Deterministic, token-mapped color per series (never a
 * random or config-order-dependent hue); geometry computed once from real
 * data via the same bandScale/linearScale primitives every chart in the
 * family shares, so a Bar and a future Line agree on where a category sits.
 * @accessibility role="img" is never used (it would make the SVG's
 * descendants presentational and break keyboard traversal). The chart
 * renders inside a <figure role="figure"> with a descriptive aria-label; its
 * SVG is aria-hidden; arrow keys (and Home/End) move an active-datum cursor
 * announced via sr-announcer, focus staying on the figure rather than
 * entering the SVG; a visually-hidden data table carries the same data in
 * fully accessible tabular form, always present in the DOM. axe passes for
 * the default, empty, and active-datum states.
 * @semantic-meaning Ports shadcn's `<BarChart data={data}><Bar dataKey=/></BarChart>`
 * call site: `series` names the data keys to plot (shadcn expresses the same
 * thing as `<Bar dataKey="desktop" />` children); categoryKey moves to the
 * composed <XAxis dataKey> child rather than a chart-level prop (veneer's
 * compositional-children amendment, bullpen 01a058ec).
 *
 * @usage-patterns
 * DO: Compose inside a ChartContainer with a ChartConfig mapping each series to a token
 * DO: Compose <XAxis dataKey="..."/> as a BarChart child for the category axis
 * DO: Keep series to 5 or fewer -- the categorical token set has 5 members
 * NEVER: Pass a categoryKey prop -- it belongs on the composed XAxis child
 * NEVER: Author a color, duration, or easing here -- token + matrix cell only
 *
 * @example
 * ```tsx
 * <ChartContainer config={{ desktop: { token: 'chart-1' }, mobile: { token: 'chart-2' } }}>
 *   <BarChart data={data} series={['desktop', 'mobile']}>
 *     <CartesianGrid />
 *     <XAxis dataKey="month" />
 *     <YAxis />
 *   </BarChart>
 * </ChartContainer>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import { useChartConfig, useChartSize } from './chart';
import {
  barAria,
  barChart,
  buildChartLabel,
  computeBars,
  describeBar,
  transformOriginFor,
  type BarChartBehaviorConfig,
  type BarChartConfig,
  type BarChartState,
} from './bar-chart.behavior';
import { barChartClasses, resolveBarFillClass } from './bar-chart.classes';
import { XAxis } from './x-axis';

export interface BarChartProps extends BarChartConfig {
  /** CartesianGrid/XAxis/YAxis, composed as children (shadcn parity's
   *  `<BarChart><XAxis dataKey="month"/></BarChart>` call site). BarChart
   *  reads the category key off the composed XAxis child's `dataKey` prop;
   *  it never accepts one directly. */
  children?: React.ReactNode | undefined;
}

/** The one targeted read this component does over its own children: find the
 *  composed `<XAxis>` and return its `dataKey`, or `''` if omitted (an
 *  axis-less chart cannot resolve categories, so `computeBars` receives an
 *  empty key and every category collapses to `"undefined"` -- an honest,
 *  non-throwing degenerate case, not a special path). */
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

export const BarChart: React.FC<BarChartProps> = ({
  data,
  series,
  layout = 'vertical',
  stacked = false,
  children,
}) => {
  const chartConfig = useChartConfig();
  const size = useChartSize();
  const categoryKey = React.useMemo(() => categoryKeyFromChildren(children), [children]);

  const config: BarChartBehaviorConfig = {
    data,
    series,
    layout,
    stacked,
    chartConfig,
    categoryKey,
    width: size.width,
    height: size.height,
  };

  const bars = React.useMemo(
    () =>
      computeBars({ data, series }, chartConfig, {
        categoryKey,
        width: size.width,
        height: size.height,
        layout,
        stacked,
      }),
    [data, series, chartConfig, categoryKey, size.width, size.height, layout, stacked],
  );

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  // The cursor only makes sense against the CURRENT bar set; a data/geometry
  // change resets it rather than leaving it pointed at a stale index.
  React.useEffect(() => {
    setActiveIndex(null);
  }, [bars]);

  React.useEffect(() => {
    if (activeIndex === null) return;
    const bar = bars[activeIndex];
    if (bar) announceToScreenReader(describeBar(bar), 'polite');
  }, [activeIndex, bars]);

  const state: BarChartState = { bars, valueTicks: [], activeIndex };
  const classes = barChartClasses({ layout }, state);

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const action = barChart.keymap(
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
    if (!action || !barChart.canDispatch(state, action, config)) return;
    event.preventDefault();
    setActiveIndex(barChart.actions[action](state, undefined).activeIndex);
  };

  const label = buildChartLabel(config);

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
        {bars.map((bar) => {
          const attrs = barAria(bar.key, state, config, {});
          return (
            <rect
              key={bar.key}
              data-part="bar"
              data-bar-key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              style={{ transformOrigin: transformOriginFor(bar, layout) }}
              className={classy(resolveBarFillClass(chartConfig, bar), classes.bar) || undefined}
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
          {bars.map((bar) => (
            <tr key={bar.key}>
              <td>{bar.category}</td>
              <td>{bar.series}</td>
              <td>{bar.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

BarChart.displayName = 'BarChart';

export default BarChart;
