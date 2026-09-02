import type { BehaviorSpec } from '../../lib/contract';

/**
 * Area: a compositional child of AreaChart (#2227), same pattern #2225
 * established for Bar/BarChart -- absence by omission, never a flag on the
 * owning chart. `<Area dataKey="desktop" />` is the shadcn call site
 * (`<AreaChart data={data}><Area dataKey="desktop"/></AreaChart>`);
 * AreaChart derives its series list from composed `<Area>` children, in
 * declaration order, when any are present, and falls back to its own
 * `series: string[]` config when none are (both paths stay supported --
 * `AreaChartConfig.series` is not deprecated by this component's existence).
 *
 * A static score, no state/actions/keymap -- same shape as BarConfig.
 * `dataKey` is the one required field: which data key this series plots.
 * Additional per-series props (a display-name override, a token override)
 * are anticipated by this child-component pattern but not added here --
 * nothing in AreaChart's current contract would consume one yet, and adding
 * an unconsumed field would be exactly the "invented, unused surface"
 * Boundary 00 forbids. `series: string[]` remains the only per-series
 * surface until a real consumer needs more than a data key.
 */

export interface AreaConfig {
  /** The data key this series plots -- the same string AreaChartConfig.series
   *  would carry at this position, just registered per-child instead of in
   *  one array. */
  dataKey: string;
}

export type AreaState = Record<never, never>;
export type AreaActions = Record<never, never>;
/** 'series', not 'area' -- AreaChart's OWN part vocabulary already uses 'area'
 *  for the `many: true` rendered `<path>` fill geometry (AreaChartPart). This
 *  child names one declared data SERIES, a config-time concept distinct from
 *  a rendered area, same split bar.behavior.ts draws against BarChart's own
 *  'bar' part. */
export type AreaPart = 'series';

export const area: BehaviorSpec<AreaConfig, AreaState, AreaActions, AreaPart> = {
  name: 'area',
  parts: { series: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ series: {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes -- same
 *  `data-key` transport `readBarConfig` (bar.behavior.ts) pins. */
export function readAreaConfig(root: HTMLElement): AreaConfig {
  return { dataKey: root.dataset['key'] ?? '' };
}
