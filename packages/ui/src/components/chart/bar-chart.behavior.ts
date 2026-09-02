import { z } from 'zod';
import type { AriaAttrs, BehaviorSpec, InstanceIds, PartIds } from '../../lib/contract';
import { createBehavior } from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { bandScale, linearScale, ticks } from '../../primitives/graph';
import { announceToScreenReader } from '../../primitives/sr-announcer';
import type { ChartConfig } from './chart.behavior';
import { parseChartConfig } from './chart.behavior';
// Sibling classes.ts import, disclosed divergence from Spec 01 rule 1
// ("behavior.ts ... never a classes.ts import"): `resolveSeriesClass` is not
// a layout/visual decision, it is the literal fill-chart-N LOOKUP TABLE the
// whole chart family shares (#2224), and the issue's own functional test
// pins `computeBars(...)[n].className` as part of THIS function's return
// contract -- the geometry and the color resolution are computed together
// here so a consumer never re-derives the series index itself. Recorded in
// the PR body rather than silently bent.
import { resolveSeriesClass } from './chart.classes';
// Same disclosed divergence as above: the DOM-native bind needs the `bar`
// class string to render rects it creates itself (no pre-existing markup to
// enhance -- see syncBarElements).
import { barChartClasses } from './bar-chart.classes';
import { readXAxisConfig } from './x-axis.behavior';

/**
 * BarChart: the first real chart-type mark on top of ChartContainer/
 * XAxis/YAxis/CartesianGrid (#2224). Renders through `graph.ts`
 * (`bandScale`/`linearScale`), shadcn-API-compatible
 * (`<BarChart data={data}><Bar dataKey="desktop" /></BarChart>`), and pins
 * the accessible chart structure the family (#2226/#2227/#2229/#2230) copies:
 * a `<figure>` groups an `aria-hidden` SVG with a keyboard-driven active-datum
 * cursor (announced via `sr-announcer`) and an always-present data-table
 * fallback -- never `role="img"`, which would make the SVG's descendants
 * presentational and break keyboard traversal.
 */

// -- Config (shadcn-compatible; NO categoryKey -- it lives on the composed
// <XAxis dataKey> child, veneer's compositional-children amendment, bullpen
// 01a058ec) --------------------------------------------------------------

export interface BarChartConfig {
  data: ReadonlyArray<Record<string, string | number>>;
  series: string[];
  /** Default 'vertical': bars rise on y, categories run along x. */
  layout?: 'vertical' | 'horizontal' | undefined;
  /** Default false (grouped): series split the category band evenly. */
  stacked?: boolean | undefined;
}

/** What a bind (WC/Astro) or React performance resolves before calling
 *  `createBehavior`: the consumer's `BarChartConfig` plus the three things
 *  only the composition context can supply -- the token config from the
 *  `ChartContainer` ancestor, the category key from the composed `<XAxis
 *  dataKey>` child, and the measured plot size from `ChartContainer`'s own
 *  `observeResize` (#2223/#2224). */
export interface BarChartBehaviorConfig extends BarChartConfig {
  chartConfig: ChartConfig;
  categoryKey: string;
  width: number;
  height: number;
}

// -- Geometry (computeBars) -------------------------------------------------

export interface Bar {
  /** `${category}:${series}` -- stable across a re-render as long as the
   *  category and series names do not change. */
  key: string;
  category: string;
  series: string;
  /** The raw data value this bar/segment represents (not the pixel extent),
   *  needed for the accessible announcement and the data-table fallback. */
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /** The resolved `fill-chart-N` literal (chart.classes.ts), never a hex,
   *  `var()`, or arbitrary value. */
  className: string;
}

export interface ComputeBarsOptions {
  categoryKey: string;
  width: number;
  height: number;
  layout?: 'vertical' | 'horizontal' | undefined;
  stacked?: boolean | undefined;
}

/** The categorical token set has exactly five members (chart-1..chart-5,
 *  Boundary 00 sec 6). A wider ramp is #2030, not this component. */
const MAX_SERIES = 5;

/** Every declared series key must exist on every data row -- a Zod
 *  validation error naming the offending key (external-data boundary,
 *  CLAUDE.md), never a silently-undefined bar. */
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
      `Bar chart data row ${index} is missing series key "${String(key)}": ${issue?.message ?? 'validation failed'}`,
    );
  }
}

/** The value-axis domain ceiling: the max single value (grouped) or the max
 *  per-category total (stacked). Shared between `computeBars` and
 *  `initialState`'s `valueTicks` derivation so the two never disagree. */
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
 * Compute grouped/stacked bar geometry against a real plot rectangle, via the
 * SAME `bandScale`/`linearScale` primitives (#2223) the assertion pins.
 * Category axis: `bandScale` over the (deduplication-free) category values in
 * `data`, along x for `layout: 'vertical'` and along y for `'horizontal'`.
 * Value axis: `linearScale` over `[0, max]`, baseline at the bottom (vertical)
 * or the left (horizontal). Grouped splits each category band evenly across
 * `series.length` sub-bands; stacked accumulates each row's series values
 * along the value axis, one segment per series, in declaration order.
 *
 * Empty `data` returns `[]` -- the empty-plot, no-throw case (the axes' own
 * zero state is theirs to render, #2224's XAxis/YAxis/CartesianGrid).
 */
export function computeBars(
  input: { data: ReadonlyArray<Record<string, string | number>>; series: string[] },
  config: ChartConfig,
  options: ComputeBarsOptions,
): Bar[] {
  const { data, series } = input;
  const { categoryKey, width, height } = options;
  const layout = options.layout ?? 'vertical';
  const stacked = options.stacked ?? false;

  if (series.length > MAX_SERIES) {
    throw new Error(
      `Bar chart declares ${series.length} series; the categorical token set has ${MAX_SERIES} members ` +
        `(chart-1..chart-${MAX_SERIES}). Reduce to ${MAX_SERIES} or fewer series -- a wider ramp is issue #2030, not this component.`,
    );
  }

  if (data.length === 0) return [];

  requireSeriesPresence(data, series);

  const categories = data.map((row) => String(row[categoryKey]));
  const maxValue = computeValueDomainMax(data, series, stacked);

  const categoryAxisLength = layout === 'vertical' ? width : height;
  const valueAxisLength = layout === 'vertical' ? height : width;

  const band = bandScale(categories, [0, categoryAxisLength], {
    paddingInner: 0.2,
    paddingOuter: 0.1,
  });
  // Vertical: baseline at the bottom (range inverted, SVG y grows downward).
  // Horizontal: baseline at the left (range not inverted).
  const valueScale =
    layout === 'vertical'
      ? linearScale([0, maxValue], [valueAxisLength, 0])
      : linearScale([0, maxValue], [0, valueAxisLength]);

  const subBandwidth = stacked ? band.bandwidth() : band.bandwidth() / Math.max(1, series.length);

  const bars: Bar[] = [];
  const stackCumulative = new Map<string, number>();

  for (const [rowIndex, row] of data.entries()) {
    const category = categories[rowIndex] as string;
    let cumulative = stackCumulative.get(category) ?? 0;

    for (const [seriesIndex, seriesKey] of series.entries()) {
      const rawValue = row[seriesKey];
      const value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0);
      const className = resolveSeriesClass(config, seriesKey, seriesIndex);
      const key = `${category}:${seriesKey}`;
      const categoryOffset = band.scale(category) + (stacked ? 0 : seriesIndex * subBandwidth);
      const segmentStart = stacked ? cumulative : 0;
      const segmentEnd = stacked ? cumulative + value : value;

      if (layout === 'vertical') {
        const yTop = valueScale(segmentEnd);
        const yBottom = valueScale(segmentStart);
        bars.push({
          key,
          category,
          series: seriesKey,
          value,
          x: categoryOffset,
          y: yTop,
          width: subBandwidth,
          height: Math.max(0, yBottom - yTop),
          className,
        });
      } else {
        const xStart = valueScale(segmentStart);
        const xEnd = valueScale(segmentEnd);
        bars.push({
          key,
          category,
          series: seriesKey,
          value,
          x: xStart,
          y: categoryOffset,
          width: Math.max(0, xEnd - xStart),
          height: subBandwidth,
          className,
        });
      }

      if (stacked) cumulative += value;
    }
    stackCumulative.set(category, cumulative);
  }

  return bars;
}

/** The accessible description for one bar -- the announcer text on keyboard
 *  traversal and a row's plain-language summary in the data-table fallback. */
export function describeBar(bar: Bar): string {
  return `${bar.category}, ${bar.series}, ${bar.value}`;
}

// -- Behavior spec -----------------------------------------------------------

export interface BarChartState {
  bars: Bar[];
  /** Nicely-rounded value-axis tick values (`ticks()`, #2223) for a composed
   *  YAxis/CartesianGrid to read once it renders real ticks against a
   *  numeric domain -- wiring that rendering is out of this issue's scope
   *  ("What NOT to Include": no gridline/tick rendering), so this is derived
   *  and exposed, not yet consumed by markup. */
  valueTicks: readonly number[];
  /** The keyboard-driven active-datum cursor, an index into `bars`, or
   *  `null` before the chart has received keyboard focus/traversal. */
  activeIndex: number | null;
}

export type BarChartActions = {
  moveNext: undefined;
  movePrevious: undefined;
  moveFirst: undefined;
  moveLast: undefined;
};

export type BarChartPart = 'root' | 'plot' | 'bar' | 'table';

function clampActive(index: number, bars: readonly Bar[]): number {
  return Math.min(Math.max(index, 0), bars.length - 1);
}

export const barChart: BehaviorSpec<
  BarChartBehaviorConfig,
  BarChartState,
  BarChartActions,
  BarChartPart
> = {
  name: 'bar-chart',
  parts: {
    root: {},
    plot: {},
    bar: { many: true },
    table: {},
  },
  initialState: (config) => ({
    bars: computeBars({ data: config.data, series: config.series }, config.chartConfig, {
      categoryKey: config.categoryKey,
      width: config.width,
      height: config.height,
      layout: config.layout,
      stacked: config.stacked,
    }),
    valueTicks: ticks(
      0,
      computeValueDomainMax(config.data, config.series, config.stacked ?? false),
      5,
    ),
    activeIndex: null,
  }),
  actions: {
    moveNext: (state) => {
      if (state.bars.length === 0) return state;
      const next = clampActive((state.activeIndex ?? -1) + 1, state.bars);
      return next === state.activeIndex ? state : { ...state, activeIndex: next };
    },
    movePrevious: (state) => {
      if (state.bars.length === 0) return state;
      // Symmetric with moveNext: the first keypress in EITHER direction lands
      // on the first bar (index 0), not the last -- a deliberate choice, not
      // a wrap-from-the-end accident. Only a second press moves off it.
      const previous =
        state.activeIndex === null ? 0 : clampActive(state.activeIndex - 1, state.bars);
      return previous === state.activeIndex ? state : { ...state, activeIndex: previous };
    },
    moveFirst: (state) =>
      state.bars.length === 0 || state.activeIndex === 0 ? state : { ...state, activeIndex: 0 },
    moveLast: (state) => {
      const last = state.bars.length - 1;
      return state.bars.length === 0 || state.activeIndex === last
        ? state
        : { ...state, activeIndex: last };
    },
  },
  canDispatch: (state) => state.bars.length > 0,
  aria: (_state, config, _ids) => ({
    // 'figure', not 'group': the pinned accessible structure names a native
    // <figure> for the React performance, but the WC/Astro host element is
    // NOT a <figure> tag -- projecting the role explicitly, uniformly across
    // all three performances, gives the WC/Astro host the same semantics a
    // native <figure> gets for free, rather than depending on tag choice.
    root: {
      role: 'figure',
      'aria-label': buildChartLabel(config),
    },
    // NEVER role="img" -- that would make the SVG's descendants
    // presentational and break keyboard traversal (the whole reason this
    // issue pins the structure). aria-hidden alone is enough: the data is
    // accessible through the announcer and the data-table fallback, not the
    // SVG DOM.
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
  // No BehaviorSpec.motion field: it is spec-reserved but unimplemented
  // (01-behavior-contract.md:123-125; #1990, open, owns the shape and the
  // two-directional existence/assignment gate). Until #1990 lands, this
  // component's one motion moment -- the bar's "enter" -- is declared the
  // way every other component in this codebase declares one today: as a row
  // in docs/spec/matrix/motion.jsonl (component: bar-chart, part: bar,
  // transition: enter, provenance: proposed), consumed below in
  // bar-chart.classes.ts via the generated animate-bar-chart-bar-enter
  // utility.
};

/** Per-instance ARIA for the `many: true` "bar" part (Spec 01's co-located
 *  `<part>Aria(instanceKey, state, config, ids)` convention). Bars are
 *  decorative -- the SVG is `aria-hidden`, so screen readers never read a
 *  bar's own attributes -- `data-state`/`data-active` exist for the
 *  motion/focus-ring CSS hooks, not for assistive tech. */
export function barAria(
  instanceKey: string,
  state: BarChartState,
  _config: BarChartBehaviorConfig,
  _ids: InstanceIds<BarChartPart>,
): AriaAttrs {
  const index = state.bars.findIndex((bar) => bar.key === instanceKey);
  return {
    'aria-hidden': 'true',
    'data-state': 'visible',
    'data-active': index !== -1 && index === state.activeIndex ? 'true' : 'false',
  };
}

/** `aria-label` for the `<figure>`: chart type, series, and data range --
 *  the text description the pinned accessible structure requires (#2225). */
export function buildChartLabel(config: BarChartBehaviorConfig): string {
  const layout = config.layout ?? 'vertical';
  const seriesList = config.series.join(', ') || 'no series';
  const rows = config.data.length;
  return `${layout === 'horizontal' ? 'Horizontal bar' : 'Bar'} chart of ${seriesList} across ${rows} ${
    rows === 1 ? 'category' : 'categories'
  }`;
}

/** The per-bar `transform-origin`, in the SAME plot-pixel coordinate space
 *  `computeBars` already places x/y/width/height in (SVG's default
 *  transform-box is the element's own user-coordinate system, so an
 *  absolute-pixel origin needs no `transform-box: fill-box` override -- see
 *  bar-chart.classes.ts for why that stays out of the class string). Vertical
 *  bars grow from their bottom edge (the value-axis baseline); horizontal
 *  bars grow from their left edge. Shared by the React performance and the
 *  DOM-native client so both anchor the "grow from baseline" keyframe
 *  identically. */
export function transformOriginFor(bar: Bar, layout: 'vertical' | 'horizontal'): string {
  const x = layout === 'horizontal' ? bar.x : bar.x + bar.width / 2;
  const y = layout === 'horizontal' ? bar.y + bar.height / 2 : bar.y + bar.height;
  return `${x}px ${y}px`;
}

// -- DOM-native client (WC + Astro share this) --------------------------------

/** Read `BarChartConfig` off the root's `data-config` JSON attribute (the
 *  same WC/Astro transport `bindChart` pins), then resolve the three
 *  composition-context values from the nearest `ChartContainer` ancestor:
 *  its `ChartConfig` (`data-config`), its measured size
 *  (`data-chart-width`/`data-chart-height`, written by `bindChart`), and the
 *  category key off the composed `<XAxis dataKey>` child. `root.parentElement`
 *  is the search start, not `root` itself -- both this component and
 *  ChartContainer use the part name "root", so starting from `root` would
 *  match this element's own `data-part="root"` first. */
function readBarChartConfig(
  root: HTMLElement,
  size: { width: number; height: number },
): BarChartBehaviorConfig {
  const configAttr = root.getAttribute('data-config');
  const parsed: unknown = configAttr ? JSON.parse(configAttr) : { data: [], series: [] };
  const raw = parsed as Partial<BarChartConfig>;
  const barChartConfig: BarChartConfig = {
    data: raw.data ?? [],
    series: raw.series ?? [],
    layout: raw.layout,
    stacked: raw.stacked,
  };

  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;
  const xAxisEl = containerRoot?.querySelector<HTMLElement>('[data-part="x-axis"]') ?? null;
  const categoryKey = xAxisEl ? readXAxisConfig(xAxisEl).dataKey : '';
  const chartConfigAttr = containerRoot?.getAttribute('data-config') ?? null;
  const chartConfig = chartConfigAttr ? parseChartConfig(JSON.parse(chartConfigAttr)) : {};

  return { ...barChartConfig, chartConfig, categoryKey, width: size.width, height: size.height };
}

/** Read the measured plot size off the nearest ChartContainer ancestor's
 *  dataset (`data-chart-width`/`data-chart-height`, written by `bindChart`).
 *  Bar-chart reads this rather than composing its own `observeResize` on the
 *  plot -- chart.behavior.ts's own doc pins that: "child binds read this
 *  rather than re-observing the plot themselves." */
function readContainerSize(containerRoot: HTMLElement | null): { width: number; height: number } {
  return {
    width: Number(containerRoot?.dataset['chartWidth'] ?? 0),
    height: Number(containerRoot?.dataset['chartHeight'] ?? 0),
  };
}

/**
 * Imperatively sync one `<rect data-part="bar">` per `state.bars` entry
 * inside the plot SVG -- created here rather than authored by the consumer,
 * because bar geometry is DATA-DRIVEN (unlike the static XAxis/YAxis/
 * CartesianGrid markers, there is no fixed markup to enhance). Matched by
 * `data-bar-key`; a bar no longer present is removed, one newly present is
 * created, and every surviving one has its geometry/class/aria refreshed --
 * so a resize or a data change never leaves a stale or duplicate rect.
 */
function syncBarElements(
  plotEl: SVGElement | null,
  state: BarChartState,
  config: BarChartBehaviorConfig,
  layout: 'vertical' | 'horizontal',
  barClassName: string,
  applyProjection: (el: HTMLElement, attrs: AriaAttrs) => void,
): void {
  if (!plotEl) return;
  const existing = new Map<string, SVGRectElement>();
  for (const el of Array.from(plotEl.querySelectorAll<SVGRectElement>('[data-part="bar"]'))) {
    const key = el.dataset['barKey'];
    if (key) existing.set(key, el);
  }

  const seen = new Set<string>();
  for (const bar of state.bars) {
    seen.add(bar.key);
    let el = existing.get(bar.key);
    if (!el) {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.dataset['part'] = 'bar';
      el.dataset['barKey'] = bar.key;
      plotEl.appendChild(el);
    }
    el.setAttribute('x', String(bar.x));
    el.setAttribute('y', String(bar.y));
    el.setAttribute('width', String(bar.width));
    el.setAttribute('height', String(bar.height));
    el.setAttribute('class', `${bar.className} ${barClassName}`.trim());
    el.style.transformOrigin = transformOriginFor(bar, layout);
    applyProjection(el as unknown as HTMLElement, barAria(bar.key, state, config, {}));
  }

  for (const [key, el] of existing) {
    if (!seen.has(key)) el.remove();
  }
}

/**
 * Imperatively rebuild the data-table fallback's `<tbody>` from
 * `state.bars` -- same rationale as `syncBarElements`: the table's rows are
 * as data-driven as the SVG's rects, so the WC/Astro performance has nothing
 * fixed to enhance. `textContent`, never `innerHTML`: category/series names
 * come from consumer data, not markup this function should ever parse as
 * HTML.
 */
function syncTableRows(tableEl: HTMLElement | null, state: BarChartState): void {
  const tbody = tableEl?.querySelector('tbody');
  if (!tbody) return;
  while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
  for (const bar of state.bars) {
    const row = document.createElement('tr');
    for (const text of [bar.category, bar.series, String(bar.value)]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.appendChild(cell);
    }
    tbody.appendChild(row);
  }
}

export function bindBarChart(root: HTMLElement): () => void {
  const getPart = (part: BarChartPart): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  const containerRoot = root.parentElement?.closest<HTMLElement>('[data-part="root"]') ?? null;

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  let config = readBarChartConfig(root, readContainerSize(containerRoot));
  let unsubscribeMemory: (() => void) | null = null;
  let dispatchCurrent: ((action: keyof BarChartActions) => boolean) | null = null;
  let getStateCurrent: (() => BarChartState) | null = null;

  // A resize (or a fresh mount) discards the previous behavior instance and
  // recreates it from the current config -- the SAME reset-on-geometry-change
  // choice the React performance makes (a new bar set invalidates the
  // keyboard cursor rather than pointing it at a stale index).
  const mount = () => {
    unsubscribeMemory?.();
    const { memory, dispatch } = createBehavior(barChart, config);
    dispatchCurrent = (action) => dispatch(action, config);
    getStateCurrent = () => memory.get();

    const ids = {} as PartIds<BarChartPart>;
    for (const part of Object.keys(barChart.parts) as BarChartPart[]) {
      ids[part] = getPart(part)?.id ?? '';
    }

    const barClasses = barChartClasses({ layout: config.layout ?? 'vertical' }, memory.get());
    let previousActive: number | null = null;

    const render = () => {
      const state = memory.get();
      const projection = barChart.aria(state, config, ids);
      for (const part of Object.keys(projection) as BarChartPart[]) {
        const attrs = projection[part];
        const el = getPart(part);
        if (el && attrs) applyProjection(el, attrs);
      }
      syncBarElements(
        getPart('plot') as unknown as SVGElement | null,
        state,
        config,
        config.layout ?? 'vertical',
        barClasses.bar,
        applyProjection,
      );
      syncTableRows(getPart('table'), state);
      if (state.activeIndex !== previousActive) {
        if (state.activeIndex !== null) {
          const bar = state.bars[state.activeIndex];
          if (bar) announceToScreenReader(describeBar(bar), 'polite');
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
    const part = partEl?.dataset['part'] as BarChartPart | undefined;
    if (!part || !dispatchCurrent || !getStateCurrent) return;
    const action = barChart.keymap(
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
