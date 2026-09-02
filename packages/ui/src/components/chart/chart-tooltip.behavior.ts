import type { BehaviorSpec, PartIds } from '../../lib/contract';
import { createBehavior } from '../../lib/contract';
import { computePosition } from '../../primitives/collision-detector';
import type { BandScale } from '../../primitives/graph';
import { getPortalContainer } from '../../primitives/portal';
import { createPoliteAnnouncer } from '../../primitives/sr-announcer';
import type { CleanupFunction, NormalizedPoint } from '../../primitives/types';
import { applyAriaProjection, resolveSeriesLabel, type ChartConfig } from './chart.behavior';
import { resolveSeriesClass } from './chart.classes';

/**
 * ChartTooltip: the pointer-driven datum surface over a chart's plot (#2228).
 * Composed from existing primitives, never rebuilt -- see
 * `startChartTooltipEffects` below for exactly which ones, and the one named
 * primitive this issue evaluated and did NOT compose (`interactive`), with
 * the reason recorded in that function's doc comment rather than silently
 * worked around.
 *
 * -- Data channel (a design decision this issue had to make, recorded here
 * because nothing upstream answers it) --
 * `ChartContainer` (#2224) exposes only `config` and the measured plot size;
 * the category key and the real data array live with the owning chart-type
 * component (Bar #2225, Line #2226, Area #2227 -- none of which exist yet in
 * this tree). So `hitTest`/`tooltipRows` below are PURE functions that take
 * their scale and data explicitly, exactly as the issue's own functional
 * test shows (`hitTest(point, scales, data)`, 3 args) -- the owning chart
 * shell supplies them when it composes `<ChartTooltip>`, matching how
 * `resolveSeriesClass(config, key, index)` already takes everything it needs
 * as parameters rather than reading a hidden context. This is new logic, not
 * a primitive reimplementation: graph.ts (#2223) has scales and paths but no
 * inverse-scale/nearest-datum helper (confirmed by reading its exports), so
 * hit-testing is the capability this issue adds.
 *
 * `scale` is graph.ts's real `BandScale<string>` (`bandScale()`'s return
 * value) -- consumed directly (`domain`, `range`, `step()`), never a
 * parallel invented type. `data` is an array of per-series value records,
 * index-aligned with `scale.domain` (`data[i]` holds the values for
 * `scale.domain[i]`) -- the same shape a chart shell already has on hand
 * once it owns a category axis and a data array.
 */

// ---------------------------------------------------------------------------
// Hit-test: pure function of pointer position + scale + data -> datum
// ---------------------------------------------------------------------------

export interface ChartDatum {
  /** The category value at the hit index (e.g. "Feb"). */
  category: string;
  /** Index into `scale.domain` / `data`. */
  categoryIndex: number;
  /** Series-keyed numeric values for this category, from `data[categoryIndex]`. */
  values: Readonly<Record<string, number>>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolve a normalized pointer position (0-1 on both axes, same shape
 * `interactive` emits) to the nearest datum. Pure: no DOM, no side effects.
 * Returns null when the scale has no domain or degenerates to a zero
 * span/step -- the "no datum under the pointer" case the issue's
 * error-handling section requires to fail quiet, never throw.
 */
export function hitTest(
  point: NormalizedPoint,
  scale: BandScale<string>,
  data: readonly Readonly<Record<string, number>>[],
): ChartDatum | null {
  const { domain, range, step } = scale;
  if (domain.length === 0) return null;

  const [rangeStart, rangeEnd] = range;
  const span = rangeEnd - rangeStart;
  const bandStep = step();
  if (span <= 0 || bandStep <= 0) return null;

  const pixel = rangeStart + point.left * span;
  const index = clamp(Math.floor((pixel - rangeStart) / bandStep), 0, domain.length - 1);
  const category = domain[index];
  if (category === undefined) return null;

  return { category, categoryIndex: index, values: data[index] ?? {} };
}

/**
 * The pixel center of a category's band on `scale` -- the anchor point every
 * performance positions the floating content at (React's two `useLayoutEffect`s
 * in chart-tooltip.tsx, and the DOM-native `render()` in `bindChartTooltip`
 * below, both call this rather than each re-deriving `scale(category) +
 * bandwidth()/2`).
 */
export function bandCenter(scale: BandScale<string>, category: string): number {
  return scale.scale(category) + scale.bandwidth() / 2;
}

// ---------------------------------------------------------------------------
// Tooltip content: ChartConfig + datum -> rows (shadcn-compatible config)
// ---------------------------------------------------------------------------

export type IndicatorVariant = 'dot' | 'line' | 'dashed';

/** shadcn's ChartTooltipContent props, ported verbatim (issue interface). */
export interface ChartTooltipContentConfig {
  /** Config key whose `label` supplies the header; defaults to the datum's own category. */
  labelKey?: string | undefined;
  /** Config key whose `label` supplies every row's name.
   *  Simplification note: shadcn resolves `nameKey` per payload item; rafters
   *  has no per-item payload to index (data is already series-keyed), so a
   *  supplied `nameKey` resolves ONE shared label for every row here. Narrow
   *  by design -- documented, not silently invented -- and unexercised by
   *  the issue's own functional test. */
  nameKey?: string | undefined;
  /** Marker shape for each row's series swatch. */
  indicator?: IndicatorVariant | undefined;
  hideLabel?: boolean | undefined;
  hideIndicator?: boolean | undefined;
}

export interface TooltipRowData {
  key: string;
  label: string;
  value: number | undefined;
  /** Literal `fill-chart-N`, selected by `resolveSeriesClass` -- never
   *  constructed, never a hex/var() (Boundary 00 sec 6). */
  swatchClass: string;
}

/** The header label shown above the rows: the datum's category, or a
 *  config-driven override when `labelKey` names a config entry. */
export function tooltipHeaderLabel(
  datum: ChartDatum,
  config: ChartConfig,
  labelKey?: string,
): string {
  return labelKey ? resolveSeriesLabel(config, labelKey, datum.category) : datum.category;
}

/**
 * Build one row per configured series for a hit-tested datum. Pure: swatch
 * class comes from `resolveSeriesClass` (composed, never reconstructed),
 * value comes straight from `datum.values`, label defaults to the series
 * key's own config label (or the key itself).
 */
export function tooltipRows(
  datum: ChartDatum,
  config: ChartConfig,
  nameKey?: string,
): TooltipRowData[] {
  return Object.keys(config).map((key, index) => ({
    key,
    label: resolveSeriesLabel(config, nameKey ?? key, key),
    value: datum.values[key],
    swatchClass: resolveSeriesClass(config, key, index),
  }));
}

/** One-shot announcement text (sr-announcer, edge-triggered on datum change
 *  -- see `startChartTooltipEffects`). Kept a pure string builder so the
 *  announced content is testable without mounting the announcer. */
export function describeDatum(datum: ChartDatum, config: ChartConfig, nameKey?: string): string {
  const rows = tooltipRows(datum, config, nameKey);
  const parts = rows
    .filter((row) => row.value !== undefined)
    .map((row) => `${row.label} ${row.value}`);
  return [datum.category, ...parts].join(', ');
}

// ---------------------------------------------------------------------------
// Behavior spec: datum is the only state; no keymap of its own
// ---------------------------------------------------------------------------

export type ChartTooltipConfig = Record<never, never>;
export interface ChartTooltipState {
  datum: ChartDatum | null;
}
export interface ChartTooltipPointPayload {
  point: NormalizedPoint;
  scale: BandScale<string>;
  data: readonly Readonly<Record<string, number>>[];
}
export type ChartTooltipActions = {
  point: ChartTooltipPointPayload;
  clear: undefined;
};
export type ChartTooltipPart = 'root' | 'content';

function sameDatum(a: ChartDatum | null, b: ChartDatum | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.category === b.category && a.categoryIndex === b.categoryIndex;
}

/**
 * ChartTooltip: state is exactly "which datum, if any, is under the
 * pointer." The `point` action re-derives it from the raw pointer position
 * via `hitTest` (kept in the reducer, same shape as `chart-container`'s
 * `resize`: the action is where the sensor reading turns into state, so
 * every performance -- React, WC, Astro -- shares one computation).
 *
 * No keymap: keyboard datum traversal is the owning chart shell's
 * responsibility (Bar/Line/Area dispatch datum changes from their own
 * roving/arrow-key contract, driving this SAME `point`/`clear` action pair);
 * this behavior only ever renders whatever datum it is given, whether that
 * arrived via pointer or keyboard. Honest empty keymap, same shape as
 * chart-container/x-axis/y-axis/cartesian-grid.
 */
export const chartTooltip: BehaviorSpec<
  ChartTooltipConfig,
  ChartTooltipState,
  ChartTooltipActions,
  ChartTooltipPart
> = {
  name: 'chart-tooltip',
  parts: {
    root: {},
    content: {},
  },
  initialState: () => ({ datum: null }),
  actions: {
    point: (state, payload) => {
      const next = hitTest(payload.point, payload.scale, payload.data);
      return sameDatum(state.datum, next) ? state : { datum: next };
    },
    clear: (state) => (state.datum === null ? state : { datum: null }),
  },
  canDispatch: () => true,
  aria: () => ({
    root: {},
    // Never focusable (matches the shipped tooltip/hover-card contract):
    // discoverable via the live-region announcement, not by AT focus.
    content: { role: 'tooltip' },
  }),
  keymap: () => null,
};

// ---------------------------------------------------------------------------
// Composition: pointer tracking + sr-announcer (edge announce)
// ---------------------------------------------------------------------------

/** Convert a client-space pointer position to a 0-1 normalized point within
 *  `rect`, clamped to the element's bounds. Same shape `interactive` emits
 *  (`{left, top}`), reimplemented at ~8 lines rather than composed -- see
 *  the doc comment on `startChartTooltipEffects` for why. */
function toNormalizedPoint(clientX: number, clientY: number, rect: DOMRect): NormalizedPoint {
  return {
    left: rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0,
    top: rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0,
  };
}

export interface ChartTooltipEffectsOptions {
  /** The plot element to track pointer movement over (found by the caller
   *  via `closest('[data-part="plot"]')` from a marker this component
   *  renders inside it -- see chart-tooltip.tsx/.element.ts). */
  plot: HTMLElement;
  scale: BandScale<string>;
  data: readonly Readonly<Record<string, number>>[];
  config: ChartConfig;
  nameKey?: string | undefined;
  dispatchPoint: (payload: ChartTooltipPointPayload) => void;
  dispatchClear: () => void;
  getState: () => ChartTooltipState;
}

/**
 * Composes `sr-announcer` (one-shot announce on the datum-change edge)
 * directly -- Spec 03 (retired effects layer): a behavior composes
 * primitives in a plain function, called from `bindX` (WC/Astro) and from
 * `useEffect` (React), same function, same cleanup.
 *
 * Deliberately does NOT compose `interactive` for the pointer surface, and
 * this is a recorded gap against the issue's "compose interactive" line, not
 * a silent substitution: `createInteractive`'s mouse path only starts
 * tracking on `mousedown` and continues while the button is held (it is
 * built for drag surfaces -- sliders, color pickers), so it cannot deliver
 * a plain hover-driven tooltip, which must update on `mousemove` alone with
 * no button pressed. Forcing it here would mean the tooltip only appears
 * while click-dragging across the chart, which is not the required
 * interaction. A second, independent reason this issue also evaluated and
 * rejected composing it: `createInteractive`'s `applyAria` unconditionally
 * stamps `role="application"` + `tabindex="0"` on the tracked element,
 * which would collide with the plot's own accessible identity (a `figure` +
 * aria-hidden SVG pattern the owning chart shell owns, per Bar #2225).
 * `pointerToNormalized`'s actual math (`interactive.ts:52-72`) is
 * reproduced here as `toNormalizedPoint` (~8 lines) rather than reimplementing
 * the primitive's larger keyboard/ARIA/drag surface just to reach it.
 */
export function startChartTooltipEffects(options: ChartTooltipEffectsOptions): CleanupFunction {
  const { plot, scale, data, config, nameKey, dispatchPoint, dispatchClear, getState } = options;
  const announcer = createPoliteAnnouncer();
  let previous: ChartDatum | null = null;

  const handleMove = (clientX: number, clientY: number): void => {
    const point = toNormalizedPoint(clientX, clientY, plot.getBoundingClientRect());
    dispatchPoint({ point, scale, data });
    const datum = getState().datum;
    // One-shot / edge-triggered (Spec 03): announce only on the transition
    // into a new datum, never on baseline, never repeating the same one.
    if (datum && !sameDatum(previous, datum)) {
      announcer.announce(describeDatum(datum, config, nameKey));
    }
    previous = datum;
  };

  const handleMouseMove = (event: MouseEvent): void => handleMove(event.clientX, event.clientY);
  const handleMouseLeave = (): void => {
    previous = null;
    dispatchClear();
  };
  const handleTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch) handleMove(touch.clientX, touch.clientY);
  };
  const handleTouchEnd = (): void => {
    previous = null;
    dispatchClear();
  };

  plot.addEventListener('mousemove', handleMouseMove);
  plot.addEventListener('mouseleave', handleMouseLeave);
  plot.addEventListener('touchmove', handleTouchMove, { passive: true });
  plot.addEventListener('touchend', handleTouchEnd);

  return () => {
    plot.removeEventListener('mousemove', handleMouseMove);
    plot.removeEventListener('mouseleave', handleMouseLeave);
    plot.removeEventListener('touchmove', handleTouchMove);
    plot.removeEventListener('touchend', handleTouchEnd);
    announcer.destroy();
  };
}

// ---------------------------------------------------------------------------
// DOM-native client (WC + Astro share this)
// ---------------------------------------------------------------------------

export interface ChartTooltipMountConfig {
  scale: BandScale<string>;
  data: readonly Readonly<Record<string, number>>[];
  config: ChartConfig;
  nameKey?: string | undefined;
}

/**
 * Bind a `rafters-chart-tooltip` root once its config is available. Unlike
 * `bindChart`, this needs `scale`/`data`/`config` handed in explicitly by
 * the caller (the owning chart shell) rather than read off a data-*
 * attribute -- a `BandScale`'s functions cannot round-trip through JSON, so
 * there is no serialization boundary to parse here; see chart-tooltip.astro
 * and chart-tooltip.element.ts for how each performance obtains it.
 */
export function bindChartTooltip(
  root: HTMLElement,
  mountConfig: ChartTooltipMountConfig,
): () => void {
  const plot = root.closest<HTMLElement>('[data-part="plot"]') ?? root;
  const contentEl = root.querySelector<HTMLElement>('[data-part="content"]');

  const { memory, dispatch } = createBehavior(chartTooltip, {});

  const ids: PartIds<ChartTooltipPart> = { root: root.id || '', content: contentEl?.id ?? '' };

  // Portal once, matching the React performance: `getPortalContainer`
  // composed directly (the same primitive `Float` wraps), not re-portaled
  // on every render.
  if (contentEl) {
    const portalContainer = getPortalContainer({ enabled: true });
    if (portalContainer && contentEl.parentElement !== portalContainer) {
      portalContainer.appendChild(contentEl);
    }
    contentEl.style.position = 'fixed';
    contentEl.style.left = '0';
    contentEl.style.top = '0';
  }

  const render = () => {
    const state = memory.get();
    const projection = chartTooltip.aria(state, {}, ids);
    if (!contentEl) return;
    applyAriaProjection(contentEl, projection.content ?? {});
    contentEl.dataset['state'] = state.datum ? 'open' : 'closed';
    if (state.datum) {
      const rows = tooltipRows(state.datum, mountConfig.config, mountConfig.nameKey);
      contentEl.dataset['category'] = state.datum.category;
      contentEl.textContent = [
        tooltipHeaderLabel(state.datum, mountConfig.config),
        ...rows.map((row) => `${row.label}: ${row.value ?? ''}`),
      ].join(' ');

      // Anchor at the hit band's center point ({x, y} anchor form --
      // collision-detector.ts's `Anchor` type accepts a raw point, so no
      // fake anchor DOM node is needed for this performance).
      const plotRect = plot.getBoundingClientRect();
      const center = bandCenter(mountConfig.scale, state.datum.category);
      const anchorPoint = { x: plotRect.left + center, y: plotRect.top + plotRect.height / 2 };
      const result = computePosition(anchorPoint, contentEl, {
        side: 'top',
        align: 'center',
        sideOffset: 8,
        avoidCollisions: true,
      });
      contentEl.style.transform = `translate(${Math.round(result.x)}px, ${Math.round(result.y)}px)`;
    } else {
      delete contentEl.dataset['category'];
      contentEl.textContent = '';
    }
  };
  const unsubscribe = memory.subscribe(render);

  const stopEffects = startChartTooltipEffects({
    plot,
    scale: mountConfig.scale,
    data: mountConfig.data,
    config: mountConfig.config,
    nameKey: mountConfig.nameKey,
    dispatchPoint: (payload) => {
      dispatch('point', {}, payload);
    },
    dispatchClear: () => {
      dispatch('clear', {});
    },
    getState: () => memory.get(),
  });

  return () => {
    unsubscribe();
    stopEffects();
  };
}
