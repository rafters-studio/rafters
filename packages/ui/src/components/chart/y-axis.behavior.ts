import type { BehaviorSpec } from '../../lib/contract';

/**
 * YAxis: the value axis, a compositional child of a cartesian chart (Bar
 * #2225, Line #2226, Area #2227), never a prop. A static score in its purest
 * form -- no state, no actions, no keymap.
 *
 * Real tick values come from `graph.ts`'s `ticks()` (#2223) once the owning
 * chart type resolves a numeric domain from its own data -- that domain does
 * not exist in #2224's scope (no chart-type marks are built here), so this
 * child is an honest structural marker, not a fabricated [0,1] axis (Boundary
 * 00 sec 1: an empty part is honest; an invented value is not).
 */

export interface YAxisConfig {
  /** Optional axis label; no value-domain knobs here -- the owning chart
   *  type supplies min/max/ticks from its data. */
  label?: string | undefined;
}

export type YAxisState = Record<never, never>;
export type YAxisActions = Record<never, never>;
export type YAxisPart = 'y-axis';

export const yAxis: BehaviorSpec<YAxisConfig, YAxisState, YAxisActions, YAxisPart> = {
  name: 'y-axis',
  parts: { 'y-axis': {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ 'y-axis': {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes. */
export function readYAxisConfig(root: HTMLElement): YAxisConfig {
  const label = root.dataset['label'];
  return label === undefined ? {} : { label };
}
