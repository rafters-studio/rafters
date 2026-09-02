import type { BehaviorSpec } from '../../lib/contract';

/**
 * CartesianGrid: background grid lines, a compositional child of a cartesian
 * chart (Bar #2225, Line #2226, Area #2227), never a prop. A static score --
 * no state, no actions, no keymap.
 *
 * The horizontal/vertical toggle is real config (shadcn parity: `<CartesianGrid
 * vertical={false} />`), reflected as `data-horizontal`/`data-vertical` for the
 * owning chart type to read. The actual line COORDINATES need a plot
 * rectangle and tick positions (`graph.ts`'s `gridLines()`/`ticks()`, #2223),
 * which only the chart-type component resolves once it has real data and a
 * domain -- #2224 builds no chart-type marks, so this stays an honest
 * structural marker (Boundary 00 sec 1) rather than a grid drawn against a
 * fabricated domain.
 */

export interface CartesianGridConfig {
  horizontal?: boolean | undefined;
  vertical?: boolean | undefined;
}

export type CartesianGridState = Record<never, never>;
export type CartesianGridActions = Record<never, never>;
export type CartesianGridPart = 'grid';

export const cartesianGrid: BehaviorSpec<
  CartesianGridConfig,
  CartesianGridState,
  CartesianGridActions,
  CartesianGridPart
> = {
  name: 'cartesian-grid',
  parts: { grid: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: () => ({ grid: {} }),
  keymap: () => null,
};

/** Reconstruct config from the WC/Astro root's `data-*` attributes. Both
 *  toggles default true (shadcn parity: an omitted attribute means "on"). */
export function readCartesianGridConfig(root: HTMLElement): CartesianGridConfig {
  return {
    horizontal: root.dataset['horizontal'] !== 'false',
    vertical: root.dataset['vertical'] !== 'false',
  };
}
