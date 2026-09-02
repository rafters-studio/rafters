import type { BehaviorSpec } from '../../lib/contract';

/**
 * Line: a compositional child of LineChart (#2226), same pattern #2225
 * established for Bar -- absence by omission, never a flag on the owning
 * chart. `<Line dataKey="desktop" />` is the shadcn call site
 * (`<LineChart data={data}><Line dataKey="desktop"/></LineChart>`);
 * LineChart derives its series list from composed `<Line>` children, in
 * declaration order, when any are present, and falls back to its own
 * `series: string[]` config when none are (both paths stay supported --
 * `LineChartConfig.series` is not deprecated by this component's existence).
 *
 * A static score, no state/actions/keymap -- same shape as BarConfig.
 * `dataKey` is the one required field: which data key this series plots.
 */

export interface LineConfig {
  /** The data key this series plots -- the same string LineChartConfig.series
   *  would carry at this position, just registered per-child instead of in
   *  one array. */
  dataKey: string;
}

export type LineState = Record<never, never>;
export type LineActions = Record<never, never>;
/** 'series', not 'line' -- LineChart's OWN part vocabulary already uses
 *  'line' for the `many: true` rendered `<path>` geometry (LineChartPart).
 *  This child names one declared data SERIES, a config-time concept
 *  distinct from a rendered path; sharing the string would make
 *  `[data-part="line"]` queries ambiguous between "a Line child marker" and
 *  "a rendered series path", same reasoning `bar.behavior.ts`'s own
 *  `BarPart` doc pins for 'series' vs 'bar'. */
export type LinePart = 'series';

export const line: BehaviorSpec<LineConfig, LineState, LineActions, LinePart> = {
  name: 'line',
  parts: { series: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ series: {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes -- same
 *  `data-key` transport `readBarConfig` (bar.behavior.ts) pins. */
export function readLineConfig(root: HTMLElement): LineConfig {
  return { dataKey: root.dataset['key'] ?? '' };
}
