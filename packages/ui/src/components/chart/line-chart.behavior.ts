import { z } from 'zod';
import type { AriaAttrs, BehaviorSpec, InstanceIds, PartIds } from '../../lib/contract';
import { createBehavior } from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { bandScale, linearScale, linePath, smoothPath, ticks } from '../../primitives/graph';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import type { ChartConfig } from './chart.behavior';
import { parseChartConfig } from './chart.behavior';
import { readXAxisConfig } from './x-axis.behavior';

/**
 * LineChart: the second chart-type mark on top of ChartContainer/XAxis/
 * YAxis/CartesianGrid (#2224), sharing the exact cartesian pattern Bar
 * (#2225) proved out. Renders through `graph.ts` (`bandScale` at
 * `paddingInner: 1` for point positions, `linearScale`, `linePath`/
 * `smoothPath`), shadcn-API-compatible (`<LineChart data={data}><Line
 * dataKey="desktop" /></LineChart>`), and reuses the SAME pinned accessible
 * structure BarChart established: a `<figure>` groups an `aria-hidden` SVG
 * with a keyboard-driven active-datum cursor (announced via `sr-announcer`)
 * and an always-present data-table fallback -- never `role="img"`.
 *
 * Two things this file adds beyond the Bar pattern:
 *
 * 1. AXIS-LESS BY OMISSION IS OBSERVABLE, not just structural. A BarChart's
 *    accessible label never depended on whether XAxis/YAxis/CartesianGrid
 *    were composed; a LineChart's does, because the axis-less shape IS a
 *    real, named thing (#2230's StatTile sparkline) and its `aria-label`
 *    should say so rather than call a sparkline a "line chart" with no
 *    axes. `resolveAxisParts` (below) is the pure, framework-agnostic half
 *    of that: given a normalized list of which of x-axis/y-axis/grid a
 *    performance found composed, it says which are present. Each
 *    performance builds that list its own way -- React scans its `children`
 *    prop for XAxis/YAxis/CartesianGrid element types (line-chart.tsx), the
 *    DOM-native client scans the ChartContainer ancestor for
 *    `[data-part="x-axis"|"y-axis"|"grid"]` (`axisPartsFromContainer`,
 *    below) -- but both feed the same pure function, and both feed the
 *    result into `LineChartBehaviorConfig.axisParts` so `buildChartLabel`
 *    can read it without a second parameter threading through `aria()`,
 *    whose signature (`BehaviorSpec.aria`) is fixed.
 * 2. A CATEGORY-LESS ROW STILL SPREADS ITS POINT. Bar's own honest
 *    degenerate case for an unresolvable category key collapses every row
 *    onto ONE band (bar-chart.tsx's `categoryKeyFromChildren` doc) -- still
 *    a legible, if useless, bar chart. A sparkline cannot do the same:
 *    collapsing every point onto one x position turns it into a vertical
 *    smear, defeating the very shape the axis-less path exists for. Line's
 *    category resolution (`resolveCategory`, below) falls back to the row's
 *    own index whenever the key does not resolve on that row -- an honest
 *    fallback, not a fabricated label, and the only way a `<LineChart
 *    data={data}><Line dataKey="v" /></LineChart>` with no `<XAxis>` (the
 *    literal #2230 call site) plots anything but a single point.
 */

// -- Config (shadcn-compatible; NO categoryKey -- it lives on the composed
// <XAxis dataKey> child, veneer's compositional-children amendment, bullpen
// 01a058ec) --------------------------------------------------------------

export interface LineChartConfig {
  data: ReadonlyArray<Record<string, string | number>>;
  /** Data keys to plot; mapped to `ChartConfig` for color. */
  series: string[];
  /** Default false: `linePath` (straight segments). `true`: `smoothPath`
   *  (monotone cubic -- see graph.ts's doc for the curve decision). */
  smooth?: boolean | undefined;
  /** Default true: render one point marker per datum. */
  dots?: boolean | undefined;
}

/** What a bind (WC/Astro) or React performance resolves before calling
 *  `createBehavior`: the consumer's `LineChartConfig` plus the four things
 *  only the composition context can supply -- the token config from the
 *  `ChartContainer` ancestor, the category key from the composed `<XAxis
 *  dataKey>` child, the measured plot size from `ChartContainer`'s own
 *  `observeResize` (#2223/#2224), and which of XAxis/YAxis/CartesianGrid are
 *  actually composed (`resolveAxisParts`, below) -- the axis-less-by-omission
 *  signal `buildChartLabel` reads. */
export interface LineChartBehaviorConfig extends LineChartConfig {
  chartConfig: ChartConfig;
  categoryKey: string;
  width: number;
  height: number;
  axisParts: AxisPartsPresence;
}

// -- Axis-parts resolution (pure; the framework-specific children scan lives
// in each performance) -------------------------------------------------

/** The vocabulary a normalized composed-child list uses -- the exact three
 *  `data-part` values XAxis/YAxis/CartesianGrid already render (x-axis.tsx,
 *  y-axis.tsx, cartesian-grid.tsx), so a React element-type scan and a DOM
 *  `[data-part]` scan agree on one shared shape without either importing
 *  the other's machinery. */
export interface AxisChildDescriptor {
  part: 'x-axis' | 'y-axis' | 'grid';
}

export interface ResolveAxisPartsInput {
  children: ReadonlyArray<AxisChildDescriptor>;
}

export interface AxisPartsPresence {
  xAxis: boolean;
  yAxis: boolean;
  grid: boolean;
}

/**
 * Whether a LineChart's composed XAxis/YAxis/CartesianGrid children are
 * present. There is no `minimal`/`axisless` prop anywhere in this file: a
 * chart is axis-less exactly when it composes none of the three, decided
 * here from whichever normalized children list the calling performance
 * built -- never guessed, never a flag threaded down from the consumer.
 */
export function resolveAxisParts(input: ResolveAxisPartsInput): AxisPartsPresence {
  let xAxis = false;
  let yAxis = false;
  let grid = false;
  for (const child of input.children) {
    if (child.part === 'x-axis') xAxis = true;
    else if (child.part === 'y-axis') yAxis = true;
    else if (child.part === 'grid') grid = true;
  }
  return { xAxis, yAxis, grid };
}

// -- Geometry (computeLinePoints) -------------------------------------------

/** One rendered point's computed geometry -- the same role `BarRect` plays
 *  for BarChart, named `LinePoint` (not `Line`) so it never collides with
 *  the `<Line dataKey="desktop"/>` compositional child component (line.
 *  behavior.ts/.tsx/.element.ts/.astro): `Line` names one declared data
 *  series in the config surface, `LinePoint` names one rendered datum's
 *  pixel position on that series' path. */
export interface LinePoint {
  /** `${category}:${series}` -- stable across a re-render as long as the
   *  category and series names do not change, same convention `BarRect.key`
   *  pins. */
  key: string;
  category: string;
  series: string;
  /** The series' position in the declared `series` array -- what
   *  `resolveSeriesStrokeClass`/`resolveSeriesClass` (chart.classes.ts)
   *  need for their token-less fallback. Geometry is a classes.ts-free
   *  concern (Spec 01 rule 1); `series` + `seriesIndex` give a consumer
   *  everything color resolution needs without this behavior file
   *  importing a classes module itself -- color resolution happens at
   *  render time in line-chart.classes.ts. */
  seriesIndex: number;
  /** The raw data value this point represents, needed for the accessible
   *  announcement and the data-table fallback. */
  value: number;
  x: number;
  y: number;
}

export interface ComputeLinePointsOptions {
  categoryKey: string;
  width: number;
  height: number;
}

/** The categorical token set has exactly five members (chart-1..chart-5,
 *  Boundary 00 sec 6). A wider ramp is #2030, not this component. */
const MAX_SERIES = 5;

/** Every declared series key must exist on every data row -- a Zod
 *  validation error naming the offending key (external-data boundary,
 *  CLAUDE.md), never a silently-undefined point. */
function requireSeriesPresence(
  data: ReadonlyArray<Record<string, string | number>>,
  series: readonly string[],
): void {
  if (series.length === 0) return;
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key of series) shape[key] = z.union([z.string(), z.number()]);
  const rowSchema = z.looseObject(shape);
  for (const [index, row] of data.entries()) {
    const result = rowSchema.safeParse(row);
    if (result.success) continue;
    const issue = result.error.issues[0];
    const key = issue?.path[0];
    throw new Error(
      `Line chart data row ${index} is missing series key "${String(key)}": ${issue?.message ?? 'validation failed'}`,
    );
  }
}

/** A row's category identity: `categoryKey`'s value on that row when it
 *  resolves, the row's own index otherwise. See the module doc's point 2 --
 *  the deliberate divergence from Bar's own degenerate case, which
 *  collapses onto one shared band instead. */
function resolveCategory(
  row: Record<string, string | number>,
  categoryKey: string,
  index: number,
): string {
  if (categoryKey === '') return String(index);
  const raw = row[categoryKey];
  return raw === undefined ? String(index) : String(raw);
}

/** The value-axis domain: `[min(0, dataMin), max(0, dataMax)]` -- Bar's own
 *  `[0, max]` convention (bar-chart.behavior.ts's `computeValueDomainMax`)
 *  generalized to a signed axis. A line series routinely carries negative
 *  deltas where a bar's magnitude never does, so a domain that only ever
 *  grows upward from zero would silently clip them off the plot; extending
 *  down keeps every value on-plot while staying IDENTICAL to Bar's exact
 *  convention whenever the data happens to be all non-negative (the common
 *  case, and every case the issue's own fixture covers). Shared between
 *  `computeLinePoints` and `initialState`'s `valueTicks` derivation so the
 *  two never disagree, same rationale as Bar's shared helper. */
function computeValueDomain(
  data: ReadonlyArray<Record<string, string | number>>,
  series: readonly string[],
): [number, number] {
  let min = 0;
  let max = 0;
  for (const row of data) {
    for (const key of series) {
      const value = Number(row[key] ?? 0);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  return [min, max];
}

/**
 * Compute line-point geometry against a real plot rectangle, via the SAME
 * `bandScale`/`linearScale` primitives (#2223) the assertion pins. Category
 * axis: `bandScale` at `paddingInner: 1, paddingOuter: 0` over
 * `resolveCategory`'s per-row category, which reproduces d3-scale's
 * `scalePoint` exactly -- a padding-1 band has zero bandwidth, so its "left
 * edge" IS the point position (evenly spaced start-to-end, matching a
 * single-point domain to the plot's horizontal center). Value axis:
 * `linearScale` over `computeValueDomain`'s signed domain, baseline at the
 * bottom (SVG y grows downward), one point per (row, series) pair, in
 * declaration order.
 *
 * Empty `data` returns `[]` -- the empty-plot, no-throw case (the axes' own
 * zero state is theirs to render, #2224's XAxis/YAxis/CartesianGrid).
 */
export function computeLinePoints(
  input: { data: ReadonlyArray<Record<string, string | number>>; series: string[] },
  options: ComputeLinePointsOptions,
): LinePoint[] {
  const { data, series } = input;
  const { categoryKey, width, height } = options;

  if (series.length > MAX_SERIES) {
    throw new Error(
      `Line chart declares ${series.length} series; the categorical token set has ${MAX_SERIES} members ` +
        `(chart-1..chart-${MAX_SERIES}). Reduce to ${MAX_SERIES} or fewer series -- a wider ramp is issue #2030, not this component.`,
    );
  }

  if (data.length === 0) return [];

  requireSeriesPresence(data, series);

  const categories = data.map((row, index) => resolveCategory(row, categoryKey, index));
  const [domainMin, domainMax] = computeValueDomain(data, series);

  const point = bandScale(categories, [0, width], { paddingInner: 1, paddingOuter: 0 });
  const valueScale = linearScale([domainMin, domainMax], [height, 0]);

  const points: LinePoint[] = [];
  for (const [rowIndex, row] of data.entries()) {
    const category = categories[rowIndex] as string;
    for (const [seriesIndex, seriesKey] of series.entries()) {
      const rawValue = row[seriesKey];
      const value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
      points.push({
        key: `${category}:${seriesKey}`,
        category,
        series: seriesKey,
        seriesIndex,
        value,
        x: point.scale(category) + point.bandwidth() / 2,
        y: valueScale(value),
      });
    }
  }

  return points;
}

/** One path per series: `linePath` (straight segments, default) or
 *  `smoothPath` (monotone cubic) over that series' points, in the order
 *  `computeLinePoints` produced them. Takes a single series' points --
 *  group `computeLinePoints`'s flat output by `series` before calling this
 *  (`groupPointsBySeries`, below, is the DOM-native client's own grouping;
 *  the React performance does the equivalent with `Array.prototype.filter`). */
export function buildSeriesPath(
  points: ReadonlyArray<Pick<LinePoint, 'x' | 'y'>>,
  options: { smooth?: boolean | undefined },
): string {
  const coords = points.map((p) => ({ x: p.x, y: p.y }));
  return options.smooth ? smoothPath(coords) : linePath(coords);
}

/** One rendered point marker's geometry -- structurally identical to
 *  `LinePoint` today, kept as its own type/function pair (rather than
 *  reusing `LinePoint` directly at every dot render site) so a future
 *  dot-only addition has somewhere to land without widening the geometry
 *  every path-building call site also consumes. */
export interface LineDot {
  key: string;
  category: string;
  series: string;
  seriesIndex: number;
  value: number;
  x: number;
  y: number;
}

/** One marker per datum, positioned at the exact scale points
 *  `computeLinePoints` already resolved -- never re-derived. */
export function computeDots(points: ReadonlyArray<LinePoint>): LineDot[] {
  return points.map((point) => ({ ...point }));
}

/** The accessible description for one point -- the announcer text on
 *  keyboard traversal and a row's plain-language summary in the data-table
 *  fallback, same shape `describeBar` (bar-chart.behavior.ts) pins. */
export function describePoint(point: LinePoint): string {
  return `${point.category}, ${point.series}, ${point.value}`;
}

// -- Behavior spec -----------------------------------------------------------

export interface LineChartState {
  points: LinePoint[];
  /** Nicely-rounded value-axis tick values (`ticks()`, #2223) for a composed
   *  YAxis/CartesianGrid to read once it renders real ticks -- derived and
   *  exposed, not yet consumed by markup (out of this issue's scope, same as
   *  BarChartState.valueTicks). */
  valueTicks: readonly number[];
  /** The keyboard-driven active-datum cursor, an index into `points`, or
   *  `null` before the chart has received keyboard focus/traversal. */
  activeIndex: number | null;
}

export type LineChartActions = {
  moveNext: undefined;
  movePrevious: undefined;
  moveFirst: undefined;
  moveLast: undefined;
};

export type LineChartPart = 'root' | 'plot' | 'line' | 'point' | 'table';

function clampActive(index: number, points: readonly LinePoint[]): number {
  return Math.min(Math.max(index, 0), points.length - 1);
}

export const lineChart: BehaviorSpec<
  LineChartBehaviorConfig,
  LineChartState,
  LineChartActions,
  LineChartPart
> = {
  name: 'line-chart',
  parts: {
    root: {},
    plot: {},
    line: { many: true },
    point: { many: true, optional: true },
    table: {},
  },
  initialState: (config) => {
    const points = computeLinePoints(
      { data: config.data, series: config.series },
      { categoryKey: config.categoryKey, width: config.width, height: config.height },
    );
    const [domainMin, domainMax] = computeValueDomain(config.data, config.series);
    return {
      points,
      valueTicks: ticks(domainMin, domainMax, 5),
      activeIndex: null,
    };
  },
  actions: {
    moveNext: (state) => {
      if (state.points.length === 0) return state;
      const next = clampActive((state.activeIndex ?? -1) + 1, state.points);
      return next === state.activeIndex ? state : { ...state, activeIndex: next };
    },
    movePrevious: (state) => {
      if (state.points.length === 0) return state;
      // Symmetric with moveNext: the first keypress in EITHER direction
      // lands on the first point, not the last -- same deliberate choice
      // barChart's own movePrevious pins.
      const previous =
        state.activeIndex === null ? 0 : clampActive(state.activeIndex - 1, state.points);
      return previous === state.activeIndex ? state : { ...state, activeIndex: previous };
    },
    moveFirst: (state) =>
      state.points.length === 0 || state.activeIndex === 0 ? state : { ...state, activeIndex: 0 },
    moveLast: (state) => {
      const last = state.points.length - 1;
      return state.points.length === 0 || state.activeIndex === last
        ? state
        : { ...state, activeIndex: last };
    },
  },
  canDispatch: (state) => state.points.length > 0,
  aria: (_state, config, _ids) => ({
    // 'figure', not 'group' -- see barChart.aria's own doc; the same
    // rationale applies uniformly across the chart family.
    root: {
      role: 'figure',
      'aria-label': buildChartLabel(config),
    },
    // NEVER role="img" -- see barChart.aria's own doc.
    plot: { 'aria-hidden': 'true' },
    table: {},
  }),
  keymap: (event, _state, part) => {
    if (part !== 'root' && part !== 'plot') return null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        return 'moveNext';
      case 'ArrowLeft':
      case 'ArrowUp':
        return 'movePrevious';
      case 'Home':
        return 'moveFirst';
      case 'End':
        return 'moveLast';
      default:
        return null;
    }
  },
  // No BehaviorSpec.motion field -- spec-reserved but unimplemented (#1990,
  // open); see bar-chart.behavior.ts's own note. This component's one motion
  // moment -- the line's "enter" -- is a row in
  // docs/spec/matrix/motion.jsonl (component: line-chart, part: line,
  // transition: enter), consumed below via line-chart.classes.ts's
  // generated animate-line-chart-line-enter utility.
};

/** Per-instance ARIA for the `many: true, optional: true` "point" part
 *  (Spec 01's co-located `<part>Aria` convention). Points are decorative --
 *  the SVG is `aria-hidden`, so screen readers never read a point's own
 *  attributes -- `data-state`/`data-active` exist for the focus-ring CSS
 *  hook, not for assistive tech. */
export function pointAria(
  instanceKey: string,
  state: LineChartState,
  _config: LineChartBehaviorConfig,
  _ids: InstanceIds<LineChartPart>,
): AriaAttrs {
  const index = state.points.findIndex((point) => point.key === instanceKey);
  return {
    'aria-hidden': 'true',
    'data-state': 'visible',
    'data-active': index !== -1 && index === state.activeIndex ? 'true' : 'false',
  };
}

/** Per-instance ARIA for the `many: true` "line" part -- one instance per
 *  SERIES (unlike "point", which is one instance per datum). A line has no
 *  active/inactive distinction of its own (the keyboard cursor tracks a
 *  DATUM, not a series), so this stays constant across every series --
 *  `data-state` alone is enough for the enter-motion CSS hook. */
export function lineAria(
  _seriesKey: string,
  _state: LineChartState,
  _config: LineChartBehaviorConfig,
  _ids: InstanceIds<LineChartPart>,
): AriaAttrs {
  return { 'aria-hidden': 'true', 'data-state': 'visible' };
}

/** `aria-label` for the `<figure>`: chart type, series, and data range,
 *  same accessible-description requirement `buildChartLabel`
 *  (bar-chart.behavior.ts) pins -- except the "chart type" half reads
 *  `config.axisParts`: a LineChart composing none of XAxis/YAxis/
 *  CartesianGrid is described as a "Sparkline" (the #2230 StatTile shape),
 *  never as a "Line chart" with axes it does not have. */
export function buildChartLabel(config: LineChartBehaviorConfig): string {
  const seriesList = config.series.join(', ') || 'no series';
  const rows = config.data.length;
  const isSparkline = !config.axisParts.xAxis && !config.axisParts.yAxis && !config.axisParts.grid;
  const kind = isSparkline ? 'Sparkline' : 'Line chart';
  return `${kind} of ${seriesList} across ${rows} ${rows === 1 ? 'point' : 'points'}`;
}

// -- DOM-native client (WC + Astro share this) --------------------------------

/** Series from composed `<rafters-line data-part="series">` children of
 *  `root`, in DOM order, or `[]` when none are present -- the DOM-based
 *  counterpart of `seriesFromBarChildren` (bar-chart.behavior.ts). */
function seriesFromLineChildren(root: HTMLElement): string[] {
  const lineEls = Array.from(root.querySelectorAll<HTMLElement>('[data-part="series"]'));
  return lineEls.map((el) => el.dataset['key'] ?? '');
}

/** `resolveAxisParts`'s DOM-native input: which of `[data-part="x-axis"]`,
 *  `[data-part="y-axis"]`, `[data-part="grid"]` exist anywhere under the
 *  ChartContainer ancestor -- the same permissive scope
 *  `readLineChartConfig`'s own `[data-part="x-axis"]` lookup already uses
 *  (a chart shares its ChartContainer with its axis siblings, never nests
 *  them, in the WC/Astro markup shape bar-chart.astro's example pins). */
function axisPartsFromContainer(containerRoot: HTMLElement | null): AxisPartsPresence {
  const children: AxisChildDescriptor[] = [];
  if (containerRoot) {
    for (const part of ['x-axis', 'y-axis', 'grid'] as const) {
      if (containerRoot.querySelector(`[data-part="${part}"]`)) children.push({ part });
    }
  }
  return resolveAxisParts({ children });
}

/** Read `LineChartConfig` off the root's `data-config` JSON attribute (the
 *  same WC/Astro transport `bindChart`/`bindBarChart` pin), then resolve
 *  the composition-context values from the nearest `ChartContainer`
 *  ancestor -- same shape `readBarChartConfig` (bar-chart.behavior.ts)
 *  pins, plus `axisParts`. */
function readLineChartConfig(
  root: HTMLElement,
  size: { width: number; height: number },
): LineChartBehaviorConfig {
  const configAttr = root.getAttribute('data-config');
  const parsed: unknown = configAttr ? JSON.parse(configAttr) : { data: [], series: [] };
  const raw = parsed as Partial<LineChartConfig>;
  // Composed <Line dataKey> children win outright over the data-config
  // series array when present, same precedence the React performance gives
  // seriesFromChildren over the `series` prop (line-chart.tsx).
  const seriesFromChildren = seriesFromLineChildren(root);
  const lineChartConfig: LineChartConfig = {
    data: raw.data ?? [],
    series: seriesFromChildren.length > 0 ? seriesFromChildren : (raw.series ?? []),
    smooth: raw.smooth,
    dots: raw.dots,
  };

  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;
  const xAxisEl = containerRoot?.querySelector<HTMLElement>('[data-part="x-axis"]') ?? null;
  const categoryKey = xAxisEl ? readXAxisConfig(xAxisEl).dataKey : '';
  const chartConfigAttr = containerRoot?.getAttribute('data-config') ?? null;
  const chartConfig = chartConfigAttr ? parseChartConfig(JSON.parse(chartConfigAttr)) : {};
  const axisParts = axisPartsFromContainer(containerRoot);

  return {
    ...lineChartConfig,
    chartConfig,
    categoryKey,
    width: size.width,
    height: size.height,
    axisParts,
  };
}

/** Read the measured plot size off the nearest ChartContainer ancestor's
 *  dataset -- identical to `readContainerSize` (bar-chart.behavior.ts). */
function readContainerSize(containerRoot: HTMLElement | null): { width: number; height: number } {
  return {
    width: Number(containerRoot?.dataset['chartWidth'] ?? 0),
    height: Number(containerRoot?.dataset['chartHeight'] ?? 0),
  };
}

/** Group a flat `LinePoint[]` by series, preserving first-seen order --
 *  which equals `config.series`'s declaration order, since
 *  `computeLinePoints` iterates rows outer, series inner, so every series
 *  is first seen while processing row 0 in `series` order. Used by the
 *  DOM-native client to build one `<path>` per series
 *  (`syncLineElements`); the React performance filters `state.points`
 *  per-series inline instead (line-chart.tsx), an equivalent read with no
 *  shared helper worth naming across two different tree shapes. */
function groupPointsBySeries(points: readonly LinePoint[]): Map<string, LinePoint[]> {
  const bySeries = new Map<string, LinePoint[]>();
  for (const point of points) {
    const existing = bySeries.get(point.series);
    if (existing) existing.push(point);
    else bySeries.set(point.series, [point]);
  }
  return bySeries;
}

/** A fixed pixel radius for the point marker -- raw SVG geometry (an
 *  attribute value, like a bar's x/y/width/height), not a Tailwind class,
 *  so it carries no token/arbitrary-value concern (line-chart.classes.ts
 *  owns every class string this component emits). */
const DOT_RADIUS = 3;

/**
 * Imperatively sync one `<path data-part="line">` per series inside the
 * plot SVG -- created here rather than authored by the consumer, because
 * line geometry is DATA-DRIVEN, same rationale `syncBarElements`
 * (bar-chart.behavior.ts) documents for bars. Matched by `data-series-key`;
 * a series no longer present (empty data) is removed, one newly present is
 * created, and every surviving one has its `d`/class/aria refreshed.
 *
 * `resolveStrokeClass` is injected by the caller (line-chart.element.ts /
 * line-chart.astro's script), never imported here -- this file never
 * imports a classes module (Spec 01 rule 1).
 */
function syncLineElements(
  plotEl: SVGElement | null,
  state: LineChartState,
  config: LineChartBehaviorConfig,
  lineEnterClass: string,
  resolveStrokeClass: (
    chartConfig: ChartConfig,
    point: Pick<LinePoint, 'series' | 'seriesIndex'>,
  ) => string,
  applyProjection: (el: HTMLElement, attrs: AriaAttrs) => void,
): void {
  if (!plotEl) return;
  const existing = new Map<string, SVGPathElement>();
  for (const el of Array.from(plotEl.querySelectorAll<SVGPathElement>('[data-part="line"]'))) {
    const key = el.dataset['seriesKey'];
    if (key) existing.set(key, el);
  }

  const bySeries = groupPointsBySeries(state.points);
  const seen = new Set<string>();
  for (const [seriesKey, points] of bySeries) {
    seen.add(seriesKey);
    let el = existing.get(seriesKey);
    if (!el) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.dataset['part'] = 'line';
      el.dataset['seriesKey'] = seriesKey;
      plotEl.appendChild(el);
    }
    const firstPoint = points[0] as LinePoint;
    el.setAttribute('d', buildSeriesPath(points, { smooth: config.smooth }));
    el.setAttribute('fill', 'none');
    el.setAttribute(
      'class',
      `${resolveStrokeClass(config.chartConfig, firstPoint)} ${lineEnterClass}`.trim(),
    );
    applyProjection(el as unknown as HTMLElement, lineAria(seriesKey, state, config, {}));
  }

  for (const [key, el] of existing) {
    if (!seen.has(key)) el.remove();
  }
}

/**
 * Imperatively sync one `<circle data-part="point">` per datum -- only when
 * `config.dots` is not explicitly `false` (default true). Matched by
 * `data-point-key`, same create/refresh/remove discipline `syncLineElements`
 * and `syncBarElements` share.
 */
function syncDotElements(
  plotEl: SVGElement | null,
  state: LineChartState,
  config: LineChartBehaviorConfig,
  resolveDotFillClass: (
    chartConfig: ChartConfig,
    dot: Pick<LineDot, 'series' | 'seriesIndex'>,
  ) => string,
  applyProjection: (el: HTMLElement, attrs: AriaAttrs) => void,
): void {
  if (!plotEl) return;
  const existing = new Map<string, SVGCircleElement>();
  for (const el of Array.from(plotEl.querySelectorAll<SVGCircleElement>('[data-part="point"]'))) {
    const key = el.dataset['pointKey'];
    if (key) existing.set(key, el);
  }

  const seen = new Set<string>();
  const dots = config.dots === false ? [] : computeDots(state.points);
  for (const dot of dots) {
    seen.add(dot.key);
    let el = existing.get(dot.key);
    if (!el) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.dataset['part'] = 'point';
      el.dataset['pointKey'] = dot.key;
      plotEl.appendChild(el);
    }
    el.setAttribute('cx', String(dot.x));
    el.setAttribute('cy', String(dot.y));
    el.setAttribute('r', String(DOT_RADIUS));
    el.setAttribute('class', resolveDotFillClass(config.chartConfig, dot));
    applyProjection(el as unknown as HTMLElement, pointAria(dot.key, state, config, {}));
  }

  for (const [key, el] of existing) {
    if (!seen.has(key)) el.remove();
  }
}

/**
 * Imperatively rebuild the data-table fallback's `<tbody>` from
 * `state.points` -- same rationale/discipline `syncTableRows`
 * (bar-chart.behavior.ts) documents.
 */
function syncTableRows(tableEl: HTMLElement | null, state: LineChartState): void {
  const tbody = tableEl?.querySelector('tbody');
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  for (const point of state.points) {
    const row = document.createElement('tr');
    for (const text of [point.category, point.series, String(point.value)]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

/**
 * The DOM-native bind's dependency on the classes layer, injected by the
 * caller (line-chart.element.ts / line-chart.astro's script) rather than
 * imported here -- this file never imports a classes module (Spec 01 rule
 * 1). `lineEnterClass` is a plain string, not a per-layout resolver
 * function like BarChartRuntimeClasses.barByLayout -- Line has no `layout`
 * prop to branch on, so there is only ever one enter utility.
 */
export interface LineChartRuntimeClasses {
  lineEnterClass: string;
  resolveStrokeClass: (
    chartConfig: ChartConfig,
    point: Pick<LinePoint, 'series' | 'seriesIndex'>,
  ) => string;
  resolveDotFillClass: (
    chartConfig: ChartConfig,
    dot: Pick<LineDot, 'series' | 'seriesIndex'>,
  ) => string;
}

export function bindLineChart(root: HTMLElement, classes: LineChartRuntimeClasses): () => void {
  const getPart = (part: LineChartPart): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let config = readLineChartConfig(root, readContainerSize(containerRoot));
  let unsubscribeMemory: (() => void) | null = null;
  let dispatchCurrent: ((action: keyof LineChartActions) => boolean) | null = null;
  let getStateCurrent: (() => LineChartState) | null = null;

  // A resize (or a fresh mount) discards the previous behavior instance and
  // recreates it from the current config -- same reset-on-geometry-change
  // choice bindBarChart makes.
  const mount = () => {
    unsubscribeMemory?.();
    const { memory, dispatch } = createBehavior(lineChart, config);
    dispatchCurrent = (action) => dispatch(action, config);
    getStateCurrent = () => memory.get();

    const ids = {} as PartIds<LineChartPart>;
    for (const part of Object.keys(lineChart.parts) as LineChartPart[]) {
      ids[part] = getPart(part)?.id ?? '';
    }

    let previousActive: number | null = null;

    const render = () => {
      const state = memory.get();
      const projection = lineChart.aria(state, config, ids);
      for (const part of Object.keys(projection) as LineChartPart[]) {
        const attrs = projection[part];
        const el = getPart(part);
        if (el && attrs) applyProjection(el, attrs);
      }
      const plotEl = getPart('plot') as unknown as SVGElement | null;
      syncLineElements(
        plotEl,
        state,
        config,
        classes.lineEnterClass,
        classes.resolveStrokeClass,
        applyProjection,
      );
      syncDotElements(plotEl, state, config, classes.resolveDotFillClass, applyProjection);
      syncTableRows(getPart('table'), state);
      if (state.activeIndex !== previousActive) {
        if (state.activeIndex !== null) {
          const point = state.points[state.activeIndex];
          if (point) announceToScreenReader(describePoint(point), 'polite');
        }
        previousActive = state.activeIndex;
      }
    };
    unsubscribeMemory = memory.subscribe(render); // fires immediately: first paint
  };
  mount();

  // Re-mount when the ChartContainer ancestor's measured size changes.
  let stopObservingContainer = (): void => {};
  if (containerRoot && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      const size = readContainerSize(containerRoot);
      if (size.width === config.width && size.height === config.height) return;
      config = { ...config, width: size.width, height: size.height };
      mount();
    });
    observer.observe(containerRoot, {
      attributes: true,
      attributeFilter: ['data-chart-width', 'data-chart-height'],
    });
    stopObservingContainer = () => observer.disconnect();
  }

  const onKeydown = (event: KeyboardEvent) => {
    const partEl = (event.target as HTMLElement).closest<HTMLElement>('[data-part]');
    const part = partEl?.dataset['part'] as LineChartPart | undefined;
    if (!part || !dispatchCurrent || !getStateCurrent) return;
    const action = lineChart.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      getStateCurrent(),
      part,
      config,
    );
    if (!action) return;
    event.preventDefault();
    dispatchCurrent(action);
  };
  root.addEventListener('keydown', onKeydown);

  return () => {
    unsubscribeMemory?.();
    stopObservingContainer();
    root.removeEventListener('keydown', onKeydown);
  };
}
