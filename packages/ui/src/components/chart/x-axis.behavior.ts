import type { BehaviorSpec } from '../../lib/contract';

/**
 * XAxis: a compositional child of a cartesian chart (Bar #2225, Line #2226,
 * Area #2227), never a prop on ChartContainer or a chart-type config
 * (veneer's compositional-children amendment, bullpen 01a058ec). The
 * category key lives HERE, on `dataKey` -- keeping the shadcn call site
 * (`<XAxis dataKey="month" />`) a straight port.
 *
 * A static score in its purest form -- no state, no actions, no keymap.
 * #2224 establishes only the compositional contract: the child exists (or
 * is honestly omitted) and carries its config. Rendering real tick marks
 * needs a numeric/category domain, which only the chart-type component that
 * reads this child owns (it has the data); inventing one here would be
 * exactly the "invented spinner" Boundary 00 sec 1 forbids. An empty part is
 * honest.
 */

export interface XAxisConfig {
  /** The category key lives here, not on the chart config. */
  dataKey: string;
}

export type XAxisState = Record<never, never>;
export type XAxisActions = Record<never, never>;
export type XAxisPart = 'x-axis';

export const xAxis: BehaviorSpec<XAxisConfig, XAxisState, XAxisActions, XAxisPart> = {
  name: 'x-axis',
  parts: { 'x-axis': {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ 'x-axis': {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes (#2001
 *  pairing: config travels as data-* only). */
export function readXAxisConfig(root: HTMLElement): XAxisConfig {
  return { dataKey: root.dataset['key'] ?? '' };
}
