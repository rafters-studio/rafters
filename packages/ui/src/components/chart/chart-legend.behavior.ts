import type { BehaviorSpec, PartIds } from '../../lib/contract';
import { createRovingFocus } from '../../primitives/roving-focus';
import { applyAriaProjection, resolveSeriesLabel, type ChartConfig } from './chart.behavior';
import { resolveSeriesClass } from './chart.classes';

/**
 * ChartLegend: one entry per configured series, display-only by default
 * (#2228). Composed from `roving-focus` for keyboard traversal -- nothing
 * else, since the default contract dispatches nothing on activation
 * (shadcn parity: `ChartLegendContent` is display-only).
 *
 * Series-visibility toggling (click an entry to hide/show its series) is
 * explicitly OUT OF SCOPE (the issue's own "What NOT to Include" list): it
 * needs a series-visibility state axis in the chart shell behaviors
 * (#2225-2227) that does not exist yet. A future `ChartLegendInteractive` (or
 * an opt-in prop) is where that lands, never as this component's default.
 */

export interface ChartLegendContentConfig {
  /** Config key whose `label` supplies every entry's name.
   *  Same simplification as chart-tooltip's `nameKey`: rafters' config is
   *  keyed by series, not by a per-item payload, so a supplied `nameKey`
   *  resolves one shared label rather than indexing per item. */
  nameKey?: string | undefined;
}

export interface ChartLegendEntry {
  key: string;
  label: string;
  /** Literal `fill-chart-N`, selected by `resolveSeriesClass` -- never
   *  constructed, never a hex/var() (Boundary 00 sec 6). */
  swatchClass: string;
}

/** One entry per configured series, in config key order. Pure. Empty config
 *  -> empty legend, never a throw (the issue's error-handling contract). */
export function legendEntries(config: ChartConfig, nameKey?: string): ChartLegendEntry[] {
  return Object.keys(config).map((key, index) => ({
    key,
    label: resolveSeriesLabel(config, nameKey ?? key, key),
    swatchClass: resolveSeriesClass(config, key, index),
  }));
}

// ---------------------------------------------------------------------------
// Behavior spec: no state, no actions -- a static score, same shape as
// x-axis/y-axis/cartesian-grid. `entry` is a uniform many-part: every entry
// gets the SAME `role: 'listitem'`, so no `instanceAria` is needed (contract.ts's
// own carve-out for uniform-item components, e.g. radio-group's roving set).
// ---------------------------------------------------------------------------

export type ChartLegendConfig = Record<never, never>;
export type ChartLegendState = Record<never, never>;
export type ChartLegendActions = Record<never, never>;
export type ChartLegendPart = 'root' | 'entry';

export const chartLegend: BehaviorSpec<
  ChartLegendConfig,
  ChartLegendState,
  ChartLegendActions,
  ChartLegendPart
> = {
  name: 'chart-legend',
  parts: {
    root: { role: 'list' },
    entry: { many: true, role: 'listitem' },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ root: { role: 'list' }, entry: { role: 'listitem' } }),
  // No keymap of its own: roving-focus owns arrow/Home/End traversal directly
  // against the DOM (`data-roving-item`), never through this dispatch
  // surface -- there is nothing to dispatch (display-only, no toggle).
  keymap: () => null,
};

// ---------------------------------------------------------------------------
// DOM-native client (WC + Astro share this)
// ---------------------------------------------------------------------------

/**
 * Bind a `rafters-chart-legend` root: projects the static ARIA contract onto
 * root + each rendered entry, then composes `roving-focus` directly (one
 * primitive -- 05-authoring: a direct call, no colocated composition
 * function needed).
 */
export function bindChartLegend(root: HTMLElement): () => void {
  const ids: PartIds<ChartLegendPart> = { root: root.id || '', entry: '' };
  const projection = chartLegend.aria({}, {}, ids);
  applyAriaProjection(root, projection.root ?? {});
  for (const entry of root.querySelectorAll<HTMLElement>('[data-part="entry"]')) {
    applyAriaProjection(entry, projection.entry ?? {});
  }

  return createRovingFocus(root, { orientation: 'horizontal' });
}
