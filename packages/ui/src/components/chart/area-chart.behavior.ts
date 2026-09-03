import { z } from 'zod';
import type { AriaAttrs, BehaviorSpec, InstanceIds, PartIds } from '../../lib/contract';
import { createBehavior } from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import {
  areaPath,
  bandScale,
  linearScale,
  linePath,
  smoothPath,
  ticks,
} from '../../primitives/graph';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import type { ChartConfig } from './chart.behavior';
import { parseChartConfig } from './chart.behavior';
import { readXAxisConfig } from './x-axis.behavior';

/**
 * AreaChart: the third real chart-type mark on top of ChartContainer/
 * XAxis/YAxis/CartesianGrid (#2224), following Bar/BarChart (#2225).
 * Renders through `graph.ts` (`bandScale`/`linearScale`/`areaPath`/
 * `linePath`/`smoothPath`), shadcn-API-compatible
 * (`<AreaChart data={data}><Area dataKey="desktop" /></AreaChart>`), and
 * reuses the SAME pinned accessible chart structure Bar established
 * (#2225): a `<figure>` groups an `aria-hidden` SVG with a keyboard-driven
 * active-datum cursor (announced via `sr-announcer`) and an always-present
 * data-table fallback -- never `role="img"`.
 *
 * One structural difference from BarChart drives this file's shape: a bar
 * IS one datum (one category x one series), so BarChart's single flat
 * `bars` list serves both as what gets painted and what gets keyboard-
 * traversed. An area is painted once PER SERIES (a filled shape spanning
 * every category), while keyboard traversal still steps datum by datum
 * (category x series), so this behavior keeps two lists: `series` (the
 * paint units AreaChart's SVG renders, one `<path>` each) and `datums` (the
 * traversal units the active-datum cursor, the announcer, and the
 * data-table fallback all read).
 */

// -- Config (shadcn-compatible; NO categoryKey -- it lives on the composed
// <XAxis dataKey> child, veneer's compositional-children amendment, bullpen
// 01a058ec) --------------------------------------------------------------

export interface AreaChartConfig {
  data: ReadonlyArray<Record<string, string | number>>;
  series: string[];
  /** Default false: the top edge is drawn with straight segments (`linePath`). */
  smooth?: boolean | undefined;
  /** Default false (overlaid): every series is an independent area down to
   *  the value-axis baseline. */
  stacked?: boolean | undefined;
}

/** What a bind (WC/Astro) or React performance resolves before calling
 *  `createBehavior`: the consumer's `AreaChartConfig` plus the three things
 *  only the composition context can supply -- the token config from the
 *  `ChartContainer` ancestor, the category key from the composed `<XAxis
 *  dataKey>` child, and the measured plot size from `ChartContainer`'s own
 *  `observeResize` (#2223/#2224). Same shape as `BarChartBehaviorConfig`. */
export interface AreaChartBehaviorConfig extends AreaChartConfig {
  chartConfig: ChartConfig;
  categoryKey: string;
  width: number;
  height: number;
}

// -- Geometry (computeAreas) -------------------------------------------------

export interface AreaPoint {
  x: number;
  y: number;
}

/** One rendered series' area geometry -- the paint unit. `baseline` is a
 *  single flat value (the value-axis zero line) for an overlaid series or
 *  the bottom-most stacked series, and a per-category point list -- the
 *  series below it's own top curve -- for every stacked series above it
 *  (issue: "stacked areas accumulate baselines as cumulative sums").
 *  `areaPath`/`linePath` are the pre-built `d` strings every performance
 *  (React/WC/Astro) renders verbatim, so all three agree pixel for pixel. */
export interface AreaSeriesGeometry {
  key: string;
  /** The series' position in the declared `series` array -- the same index
   *  `resolveSeriesClass`/`resolveSeriesStrokeClass` (chart.classes.ts) use
   *  for their token-less fallback. Geometry is a classes.ts-free concern
   *  (Spec 01 rule 1); `key` + `seriesIndex` give a consumer everything
   *  color resolution needs without this behavior file importing a classes
   *  module itself -- color resolution happens at render time in
   *  area-chart.classes.ts. */
  seriesIndex: number;
  /** Top-edge points, one per category, in data order. */
  points: AreaPoint[];
  /** The raw data value per category, index-aligned with `points`. */
  values: number[];
  baseline: number | AreaPoint[];
  /** The closed fill path (`buildAreaPath`, below): top edge + baseline,
   *  closed with `Z`. */
  areaPath: string;
  /** The open top-edge stroke path -- same points as `areaPath`'s top edge,
   *  never closed, rendered by the optional `line` part. */
  linePath: string;
}

/** One traversal unit: a single (category, series) datum -- the keyboard
 *  cursor, the announcer, and the data-table fallback all read this list,
 *  same role `BarRect` plays for BarChart, just decoupled from the paint
 *  unit (`AreaSeriesGeometry`) above. */
export interface AreaDatum {
  /** `${category}:${series}` -- stable across a re-render as long as the
   *  category and series names do not change. */
  key: string;
  category: string;
  /** Index into the data rows / category list. */
  categoryIndex: number;
  series: string;
  seriesIndex: number;
  value: number;
  x: number;
  /** The datum's pixel position on the series' top edge (the cumulative
   *  sum through this series for a stacked chart). */
  y: number;
}

export interface ComputeAreasOptions {
  categoryKey: string;
  width: number;
  height: number;
  smooth?: boolean | undefined;
  stacked?: boolean | undefined;
}

export interface AreaChartGeometry {
  series: AreaSeriesGeometry[];
  datums: AreaDatum[];
}

/** The categorical token set has exactly five members (chart-1..chart-5,
 *  Boundary 00 sec 6). A wider ramp is #2030, not this component. Same
 *  limit BarChart enforces (bar-chart.behavior.ts). */
const MAX_SERIES = 5;

/** Every declared series key must exist on every data row -- a Zod
 *  validation error naming the offending key (external-data boundary,
 *  CLAUDE.md), never a silently-undefined area. Duplicated from
 *  bar-chart.behavior.ts's identical helper rather than shared: each chart-
 *  type behavior file is a self-contained score, same precedent that file
 *  itself sets. */
function requireSeriesPresence(
  data: ReadonlyArray<Record<string, string | number>>,
  series: readonly string[],
): void {
  if (series.length === 0) return;
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key of series) shape[key] = z.union([z.string(), z.number()]);
  // looseObject, not object().passthrough() (zod 3 API) -- this repo pins zod
  // ^4.1.12 (pnpm-workspace.yaml catalog).
  const rowSchema = z.looseObject(shape);
  for (const [index, row] of data.entries()) {
    const result = rowSchema.safeParse(row);
    if (result.success) continue;
    const issue = result.error.issues[0];
    const key = issue?.path[0];
    throw new Error(
      `Area chart data row ${index} is missing series key "${String(key)}": ${issue?.message ?? 'validation failed'}`,
    );
  }
}

/** The value-axis domain ceiling: the max single value (overlaid) or the
 *  max per-category total (stacked). Shared between `computeAreas` and
 *  `initialState`'s `valueTicks` derivation so the two never disagree --
 *  same role as `computeValueDomainMax` in bar-chart.behavior.ts. */
function computeValueDomainMax(
  data: ReadonlyArray<Record<string, string | number>>,
  series: readonly string[],
  stacked: boolean,
): number {
  let maxValue = 0;
  for (const row of data) {
    if (stacked) {
      let total = 0;
      for (const key of series) total += Number(row[key] ?? 0);
      maxValue = Math.max(maxValue, total);
    } else {
      for (const key of series) maxValue = Math.max(maxValue, Number(row[key] ?? 0));
    }
  }
  return maxValue;
}

/**
 * Build the closed SVG fill path for one series: `points` (the top edge) to
 * `baseline`, closed with `Z`. A `number` baseline (the value-axis zero
 * line, or "flat") delegates straight to `areaPath` (#2223, graph.ts) --
 * the SAME primitive the issue's `areaPath(points, baselineY, { smooth })`
 * call site names, adapted to its real (points, baseline, smooth?)
 * signature (graph.ts / graph.test.ts pin it positional, not an options
 * object). An `AreaPoint[]` baseline (a stacked series above the bottom of
 * the stack, whose baseline is the series below it's own top curve) builds
 * the closed path directly: the top edge honors `smooth`, but the CLOSING
 * edge back along the reversed baseline is always straight lines
 * (`linePath`), never smoothed -- mirroring `areaPath` itself, which
 * smooths only the top edge and closes with straight `L` commands. This
 * also keeps the shape immune to whichever curve algorithm `smoothPath`
 * lands under it (#2226 is porting it to d3-shape curveMonotoneX on a
 * sibling branch): curveMonotoneX derives tangents from dy/dx assuming x
 * increasing, so handing it a reversed, x-decreasing baseline array would
 * be the wrong input regardless of which curve is live.
 */
export function buildAreaPath(
  points: AreaPoint[],
  baseline: number | AreaPoint[],
  options?: { smooth?: boolean },
): string {
  if (points.length === 0) return '';
  const smooth = options?.smooth ?? false;

  if (typeof baseline === 'number') {
    return areaPath(points, baseline, smooth);
  }

  const topPath = smooth ? smoothPath(points) : linePath(points);
  const reversedBaseline = [...baseline].reverse();
  const bottomEdge = linePath(reversedBaseline).replace(/^M/, 'L');
  return `${topPath} ${bottomEdge} Z`;
}

/**
 * Compute overlaid/stacked area geometry against a real plot rectangle, via
 * the SAME `bandScale`/`linearScale` primitives (#2223) the assertion
 * pins, plus `areaPath`/`linePath`/`smoothPath` for the `d` strings.
 *
 * Category axis: a POINT scale over the (deduplication-free) category
 * values in `data` -- `bandScale` with `paddingInner: 1` (bandwidth
 * collapses to 0), which is exactly how d3-scale defines `scalePoint` in
 * terms of `scaleBand`. This deliberately does NOT match BarChart's inset
 * `0.2/0.1`-padded bands (bar-chart.behavior.ts): a bar needs clearance on
 * both sides of its own band, a line/area point does not, so categories run
 * edge to edge (first category at x=0, last at x=width).
 *
 * Value axis: `linearScale` over `[0, max]`, baseline at the bottom
 * (`valueScale(0)`). Overlaid: every series starts every category at value
 * 0. Stacked: each series' baseline is the running sum of every series
 * before it, accumulated per category in declaration order (bottom of the
 * stack to top) -- the same accumulation `computeBars` performs, keyed by
 * category here since one area series spans every category at once.
 *
 * Empty `data` returns `{ series: [], datums: [] }` -- the empty-plot,
 * no-throw case (the axes' own zero state is theirs to render, #2224's
 * XAxis/YAxis/CartesianGrid).
 */
export function computeAreas(
  input: { data: ReadonlyArray<Record<string, string | number>>; series: string[] },
  // Unused: color resolution lives in area-chart.classes.ts (Spec 01 rule 1
  // -- behavior.ts never imports a classes module). Kept as the second
  // positional parameter so the ChartConfig call-site shape matches
  // `computeBars` (bar-chart.behavior.ts) across the chart family.
  _config: ChartConfig,
  options: ComputeAreasOptions,
): AreaChartGeometry {
  const { data, series } = input;
  const { categoryKey, width, height } = options;
  const smooth = options.smooth ?? false;
  const stacked = options.stacked ?? false;

  if (series.length > MAX_SERIES) {
    throw new Error(
      `Area chart declares ${series.length} series; the categorical token set has ${MAX_SERIES} members ` +
        `(chart-1..chart-${MAX_SERIES}). Reduce to ${MAX_SERIES} or fewer series -- a wider ramp is issue #2030, not this component.`,
    );
  }

  if (data.length === 0) return { series: [], datums: [] };

  requireSeriesPresence(data, series);

  const categories = data.map((row) => String(row[categoryKey]));
  const maxValue = computeValueDomainMax(data, series, stacked);

  const point = bandScale(categories, [0, width], { paddingInner: 1, paddingOuter: 0 });
  const valueScale = linearScale([0, maxValue], [height, 0]);
  const baselineY = valueScale(0);

  const seriesGeometry: AreaSeriesGeometry[] = [];
  const datums: AreaDatum[] = [];
  // Running sum per category, carried across the series loop in declaration
  // order (bottom of the stack to top) -- same accumulation computeBars
  // performs (bar-chart.behavior.ts's stackCumulative), keyed by category
  // rather than reset per row since one area series spans every category.
  const cumulativeByCategory = new Map<string, number>(categories.map((category) => [category, 0]));

  for (const [seriesIndex, seriesKey] of series.entries()) {
    const points: AreaPoint[] = [];
    const values: number[] = [];
    const baselinePoints: AreaPoint[] = [];
    // Flat (the value-axis zero line) for an overlaid series or the
    // bottom-most stacked series -- both start every category at value 0.
    // Every stacked series above it has a baseline that follows the series
    // below it's own top curve, so it is per-category, never flat.
    const isBaselineFlat = !stacked || seriesIndex === 0;

    for (const [rowIndex, row] of data.entries()) {
      const category = categories[rowIndex] as string;
      const rawValue = row[seriesKey];
      const value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
      const previousCumulative = stacked ? (cumulativeByCategory.get(category) ?? 0) : 0;
      const cumulative = stacked ? previousCumulative + value : value;

      const x = point.scale(category);
      const y = valueScale(cumulative);
      points.push({ x, y });
      values.push(value);
      baselinePoints.push({ x, y: valueScale(previousCumulative) });

      datums.push({
        key: `${category}:${seriesKey}`,
        category,
        categoryIndex: rowIndex,
        series: seriesKey,
        seriesIndex,
        value,
        x,
        y,
      });

      if (stacked) cumulativeByCategory.set(category, cumulative);
    }

    const baseline: number | AreaPoint[] = isBaselineFlat ? baselineY : baselinePoints;
    seriesGeometry.push({
      key: seriesKey,
      seriesIndex,
      points,
      values,
      baseline,
      areaPath: buildAreaPath(points, baseline, { smooth }),
      linePath: smooth ? smoothPath(points) : linePath(points),
    });
  }

  return { series: seriesGeometry, datums };
}

/** The accessible description for one datum -- the announcer text on
 *  keyboard traversal and a row's plain-language summary in the data-table
 *  fallback. Same shape `describeBar` (bar-chart.behavior.ts) returns. */
export function describeArea(datum: AreaDatum): string {
  return `${datum.category}, ${datum.series}, ${datum.value}`;
}

// -- Behavior spec -----------------------------------------------------------

export interface AreaChartState {
  /** The paint units: one entry per series, each carrying its own
   *  pre-built `areaPath`/`linePath`. */
  series: AreaSeriesGeometry[];
  /** The traversal units: one entry per (category, series) datum -- what
   *  the keyboard cursor, the announcer, and the data-table fallback read. */
  datums: AreaDatum[];
  /** Nicely-rounded value-axis tick values (`ticks()`, #2223) for a composed
   *  YAxis/CartesianGrid to read once it renders real ticks against a
   *  numeric domain -- same deferred-consumption note as BarChartState. */
  valueTicks: readonly number[];
  /** The keyboard-driven active-datum cursor, an index into `datums`, or
   *  `null` before the chart has received keyboard focus/traversal. */
  activeIndex: number | null;
}

export type AreaChartActions = {
  moveNext: undefined;
  movePrevious: undefined;
  moveFirst: undefined;
  moveLast: undefined;
};

export type AreaChartPart = 'root' | 'plot' | 'area' | 'line' | 'table';

function clampActive(index: number, datums: readonly AreaDatum[]): number {
  return Math.min(Math.max(index, 0), datums.length - 1);
}

export const areaChart: BehaviorSpec<
  AreaChartBehaviorConfig,
  AreaChartState,
  AreaChartActions,
  AreaChartPart
> = {
  name: 'area-chart',
  parts: {
    root: {},
    plot: {},
    area: { many: true },
    // Optional: the top-edge stroke is an enhancement over the fill, not a
    // requirement for the chart to be legible or accessible -- the issue's
    // own part list marks it `optional` (behavior parts: plot, area (many),
    // line (many, optional)).
    line: { many: true, optional: true },
    table: {},
  },
  initialState: (config) => {
    const { series, datums } = computeAreas(
      { data: config.data, series: config.series },
      config.chartConfig,
      {
        categoryKey: config.categoryKey,
        width: config.width,
        height: config.height,
        smooth: config.smooth,
        stacked: config.stacked,
      },
    );
    return {
      series,
      datums,
      valueTicks: ticks(
        0,
        computeValueDomainMax(config.data, config.series, config.stacked ?? false),
        5,
      ),
      activeIndex: null,
    };
  },
  actions: {
    moveNext: (state) => {
      if (state.datums.length === 0) return state;
      const next = clampActive((state.activeIndex ?? -1) + 1, state.datums);
      return next === state.activeIndex ? state : { ...state, activeIndex: next };
    },
    movePrevious: (state) => {
      if (state.datums.length === 0) return state;
      // Symmetric with moveNext: the first keypress in EITHER direction
      // lands on the first datum (index 0), not the last -- same
      // deliberate choice bar-chart.behavior.ts makes.
      const previous =
        state.activeIndex === null ? 0 : clampActive(state.activeIndex - 1, state.datums);
      return previous === state.activeIndex ? state : { ...state, activeIndex: previous };
    },
    moveFirst: (state) =>
      state.datums.length === 0 || state.activeIndex === 0 ? state : { ...state, activeIndex: 0 },
    moveLast: (state) => {
      const last = state.datums.length - 1;
      return state.datums.length === 0 || state.activeIndex === last
        ? state
        : { ...state, activeIndex: last };
    },
  },
  canDispatch: (state) => state.datums.length > 0,
  aria: (_state, config, _ids) => ({
    // 'figure', not 'group': same pinned accessible structure BarChart
    // establishes (bar-chart.behavior.ts) -- the React performance names a
    // native <figure>, the WC/Astro host element projects the role
    // explicitly instead.
    root: {
      role: 'figure',
      'aria-label': buildAreaChartLabel(config),
    },
    // NEVER role="img" -- see bar-chart.behavior.ts's identical note: it
    // would make the SVG's descendants presentational and break keyboard
    // traversal.
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
  // No BehaviorSpec.motion field: spec-reserved but unimplemented (#1990,
  // same note as bar-chart.behavior.ts). This component's one motion moment
  // -- the area's "enter" (a fade, not a scale: a stacked area has no
  // single baseline edge to grow from) -- is declared as a row in
  // docs/spec/matrix/motion.jsonl (component: area-chart, part: area,
  // transition: enter), consumed below in area-chart.classes.ts via the
  // generated animate-fade-in-moderate-enter utility, the assignment this cell shares
  // with every other moment on the same shape, tier and curve.
};

/** Per-instance ARIA for the `many: true` "area" and "line" parts (Spec
 *  01's co-located `<part>Aria(instanceKey, state, config, ids)`
 *  convention) -- one function shared by both parts since they are keyed
 *  identically (the series key: there is one area path and, when rendered,
 *  one line path per series, not per datum). Areas/lines are decorative --
 *  the SVG is `aria-hidden`, so screen readers never read their own
 *  attributes -- `data-state`/`data-active` exist for the motion/focus-ring
 *  CSS hooks, not for assistive tech. `data-active` flags the series that
 *  OWNS the currently active datum (`state.activeIndex` indexes `datums`,
 *  a category x series list finer-grained than the one-path-per-series
 *  paint unit this function projects onto). */
export function areaAria(
  instanceKey: string,
  state: AreaChartState,
  _config: AreaChartBehaviorConfig,
  _ids: InstanceIds<AreaChartPart>,
): AriaAttrs {
  const activeDatum = state.activeIndex !== null ? state.datums[state.activeIndex] : undefined;
  return {
    'aria-hidden': 'true',
    'data-state': 'visible',
    'data-active':
      activeDatum !== undefined && activeDatum.series === instanceKey ? 'true' : 'false',
  };
}

/** `aria-label` for the `<figure>`: chart type, series, and data range --
 *  the text description the pinned accessible structure requires, same
 *  role `buildChartLabel` plays for BarChart. */
export function buildAreaChartLabel(config: AreaChartBehaviorConfig): string {
  const seriesList = config.series.join(', ') || 'no series';
  const rows = config.data.length;
  return `Area chart of ${seriesList} across ${rows} ${rows === 1 ? 'category' : 'categories'}`;
}

// -- DOM-native client (WC + Astro share this) --------------------------------

/** Series from composed `<rafters-area data-part="series">` children of
 *  `root`, in DOM order, or `[]` when none are present. Same
 *  `querySelectorAll` shape `seriesFromBarChildren` (bar-chart.behavior.ts)
 *  uses. */
function seriesFromAreaChildren(root: HTMLElement): string[] {
  const areaEls = Array.from(root.querySelectorAll<HTMLElement>('[data-part="series"]'));
  return areaEls.map((el) => el.dataset['key'] ?? '');
}

/** Read `AreaChartConfig` off the root's `data-config` JSON attribute (the
 *  same WC/Astro transport `bindChart` pins), then resolve the three
 *  composition-context values from the nearest `ChartContainer` ancestor --
 *  same shape `readBarChartConfig` (bar-chart.behavior.ts) reads. */
function readAreaChartConfig(
  root: HTMLElement,
  size: { width: number; height: number },
): AreaChartBehaviorConfig {
  const configAttr = root.getAttribute('data-config');
  const parsed: unknown = configAttr ? JSON.parse(configAttr) : { data: [], series: [] };
  const raw = parsed as Partial<AreaChartConfig>;
  // Composed <Area dataKey> children win outright over the data-config
  // series array when present, same precedence the React performance gives
  // seriesFromChildren over the `series` prop (area-chart.tsx).
  const seriesFromChildren = seriesFromAreaChildren(root);
  const areaChartConfig: AreaChartConfig = {
    data: raw.data ?? [],
    series: seriesFromChildren.length > 0 ? seriesFromChildren : (raw.series ?? []),
    smooth: raw.smooth,
    stacked: raw.stacked,
  };

  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;
  const xAxisEl = containerRoot?.querySelector<HTMLElement>('[data-part="x-axis"]') ?? null;
  const categoryKey = xAxisEl ? readXAxisConfig(xAxisEl).dataKey : '';
  const chartConfigAttr = containerRoot?.getAttribute('data-config') ?? null;
  const chartConfig = chartConfigAttr ? parseChartConfig(JSON.parse(chartConfigAttr)) : {};

  return { ...areaChartConfig, chartConfig, categoryKey, width: size.width, height: size.height };
}

/** Read the measured plot size off the nearest ChartContainer ancestor's
 *  dataset -- same rationale as `readContainerSize` in
 *  bar-chart.behavior.ts. */
function readContainerSize(containerRoot: HTMLElement | null): { width: number; height: number } {
  return {
    width: Number(containerRoot?.dataset['chartWidth'] ?? 0),
    height: Number(containerRoot?.dataset['chartHeight'] ?? 0),
  };
}

/**
 * The DOM-native bind's dependency on the classes layer, injected by the
 * caller (area-chart.element.ts / area-chart.astro's script) rather than
 * imported here -- this file never imports a classes module (Spec 01 rule
 * 1). Unlike `BarChartRuntimeClasses.barByLayout`, AreaChart has no layout
 * axis to select between, so the motion/structural classes are plain
 * strings rather than a per-mount function.
 */
export interface AreaChartRuntimeClasses {
  areaClassName: string;
  lineClassName: string;
  resolveFillClass: (chartConfig: ChartConfig, series: AreaSeriesGeometry) => string;
  resolveStrokeClass: (chartConfig: ChartConfig, series: AreaSeriesGeometry) => string;
}

/**
 * Imperatively sync one `<path data-part="area">` (fill) and one
 * `<path data-part="line">` (top-edge stroke) per `state.series` entry
 * inside the plot SVG -- created here rather than authored by the consumer,
 * same rationale `syncBarElements` (bar-chart.behavior.ts) documents: area
 * geometry is DATA-DRIVEN, so there is no fixed markup to enhance. Matched
 * by `data-series-key`; a series no longer present is removed, one newly
 * present is created, and every surviving one has its `d`/class/aria
 * refreshed.
 */
function syncAreaElements(
  plotEl: SVGElement | null,
  state: AreaChartState,
  config: AreaChartBehaviorConfig,
  classes: AreaChartRuntimeClasses,
  applyProjection: (el: HTMLElement, attrs: AriaAttrs) => void,
): void {
  if (!plotEl) return;

  const existingAreas = new Map<string, SVGPathElement>();
  for (const el of Array.from(plotEl.querySelectorAll<SVGPathElement>('[data-part="area"]'))) {
    const key = el.dataset['seriesKey'];
    if (key) existingAreas.set(key, el);
  }
  const existingLines = new Map<string, SVGPathElement>();
  for (const el of Array.from(plotEl.querySelectorAll<SVGPathElement>('[data-part="line"]'))) {
    const key = el.dataset['seriesKey'];
    if (key) existingLines.set(key, el);
  }

  const seen = new Set<string>();
  for (const series of state.series) {
    seen.add(series.key);

    let areaEl = existingAreas.get(series.key);
    if (!areaEl) {
      areaEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      areaEl.dataset['part'] = 'area';
      areaEl.dataset['seriesKey'] = series.key;
      plotEl.appendChild(areaEl);
    }
    areaEl.setAttribute('d', series.areaPath);
    areaEl.setAttribute(
      'class',
      `${classes.resolveFillClass(config.chartConfig, series)} ${classes.areaClassName}`.trim(),
    );
    applyProjection(areaEl as unknown as HTMLElement, areaAria(series.key, state, config, {}));

    let lineEl = existingLines.get(series.key);
    if (!lineEl) {
      lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      lineEl.dataset['part'] = 'line';
      lineEl.dataset['seriesKey'] = series.key;
      lineEl.setAttribute('fill', 'none');
      plotEl.appendChild(lineEl);
    }
    lineEl.setAttribute('d', series.linePath);
    lineEl.setAttribute(
      'class',
      `${classes.resolveStrokeClass(config.chartConfig, series)} ${classes.lineClassName}`.trim(),
    );
    applyProjection(lineEl as unknown as HTMLElement, areaAria(series.key, state, config, {}));
  }

  for (const [key, el] of existingAreas) {
    if (!seen.has(key)) el.remove();
  }
  for (const [key, el] of existingLines) {
    if (!seen.has(key)) el.remove();
  }
}

/**
 * Imperatively rebuild the data-table fallback's `<tbody>` from
 * `state.datums` -- same rationale as `syncTableRows` in
 * bar-chart.behavior.ts. `textContent`, never `innerHTML`.
 */
function syncTableRows(tableEl: HTMLElement | null, state: AreaChartState): void {
  const tbody = tableEl?.querySelector('tbody');
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  for (const datum of state.datums) {
    const row = document.createElement('tr');
    for (const text of [datum.category, datum.series, String(datum.value)]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

export function bindAreaChart(root: HTMLElement, classes: AreaChartRuntimeClasses): () => void {
  const getPart = (part: AreaChartPart): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let config = readAreaChartConfig(root, readContainerSize(containerRoot));
  let unsubscribeMemory: (() => void) | null = null;
  let dispatchCurrent: ((action: keyof AreaChartActions) => boolean) | null = null;
  let getStateCurrent: (() => AreaChartState) | null = null;

  // A resize (or a fresh mount) discards the previous behavior instance and
  // recreates it from the current config -- same reset-on-geometry-change
  // choice bar-chart.behavior.ts makes.
  const mount = () => {
    unsubscribeMemory?.();
    const { memory, dispatch } = createBehavior(areaChart, config);
    dispatchCurrent = (action) => dispatch(action, config);
    getStateCurrent = () => memory.get();

    const ids = {} as PartIds<AreaChartPart>;
    for (const part of Object.keys(areaChart.parts) as AreaChartPart[]) {
      ids[part] = getPart(part)?.id ?? '';
    }

    let previousActive: number | null = null;

    const render = () => {
      const state = memory.get();
      const projection = areaChart.aria(state, config, ids);
      for (const part of Object.keys(projection) as AreaChartPart[]) {
        const attrs = projection[part];
        const el = getPart(part);
        if (el && attrs) applyProjection(el, attrs);
      }
      syncAreaElements(
        getPart('plot') as unknown as SVGElement | null,
        state,
        config,
        classes,
        applyProjection,
      );
      syncTableRows(getPart('table'), state);
      if (state.activeIndex !== previousActive) {
        if (state.activeIndex !== null) {
          const datum = state.datums[state.activeIndex];
          if (datum) announceToScreenReader(describeArea(datum), 'polite');
        }
        previousActive = state.activeIndex;
      }
    };
    unsubscribeMemory = memory.subscribe(render); // fires immediately: first paint
  };
  mount();

  // Re-mount when the ChartContainer ancestor's measured size changes.
  // MutationObserver, not a second observeResize on the plot -- see
  // readContainerSize's doc.
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
    const part = partEl?.dataset['part'] as AreaChartPart | undefined;
    if (!part || !dispatchCurrent || !getStateCurrent) return;
    const action = areaChart.keymap(
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
