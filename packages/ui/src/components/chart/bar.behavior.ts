import type { BehaviorSpec } from '../../lib/contract';

/**
 * Bar: a compositional child of BarChart (#2225), same pattern #2224
 * established for XAxis/YAxis/CartesianGrid -- absence by omission, never a
 * flag on the owning chart. `<Bar dataKey="desktop" />` is the shadcn call
 * site (`<BarChart data={data}><Bar dataKey="desktop"/></BarChart>`);
 * BarChart derives its series list from composed `<Bar>` children, in
 * declaration order, when any are present, and falls back to its own
 * `series: string[]` config when none are (both paths stay supported --
 * `BarChartConfig.series` is not deprecated by this component's existence).
 *
 * A static score, no state/actions/keymap -- same shape as XAxisConfig.
 * `dataKey` is the one required field: which data key this series plots.
 * Additional per-series props (a display-name override, a token override)
 * are anticipated by this child-component pattern but not added here --
 * nothing in BarChart's current contract would consume one yet, and adding
 * an unconsumed field would be exactly the "invented, unused surface"
 * Boundary 00 forbids. `series: string[]` remains the only per-series
 * surface until a real consumer needs more than a data key.
 */

export interface BarConfig {
  /** The data key this series plots -- the same string BarChartConfig.series
   *  would carry at this position, just registered per-child instead of in
   *  one array. */
  dataKey: string;
}

export type BarState = Record<never, never>;
export type BarActions = Record<never, never>;
/** 'series', not 'bar' -- BarChart's OWN part vocabulary already uses 'bar'
 *  for the `many: true` rendered `<rect>` geometry (BarChartPart). This
 *  child names one declared data SERIES, a config-time concept distinct from
 *  a rendered bar; sharing the string would make `[data-part="bar"]` queries
 *  ambiguous between "a Bar child marker" and "a rendered bar rect". */
export type BarPart = 'series';

export const bar: BehaviorSpec<BarConfig, BarState, BarActions, BarPart> = {
  name: 'bar',
  parts: { series: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ series: {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes -- same
 *  `data-key` transport `readXAxisConfig` (x-axis.behavior.ts) pins. */
export function readBarConfig(root: HTMLElement): BarConfig {
  return { dataKey: root.dataset['key'] ?? '' };
}
