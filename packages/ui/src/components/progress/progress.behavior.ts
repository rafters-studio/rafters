import type { BehaviorSpec } from '../../lib/contract';

/**
 * Progress: determinate value or indeterminate activity. A static score --
 * no actions, no keymap, no effects -- but the ARIA projection is real:
 * `role="progressbar"` plus `aria-valuemin`/`aria-valuemax`/`aria-valuenow`,
 * and `aria-valuenow` is the one attribute presence itself encodes state --
 * omitted, the value is indeterminate (WAI-ARIA 1.2, not a local convention).
 * `value === undefined` IS the indeterminate signal; there is no separate
 * boolean, so a config can never claim indeterminate and a value in the
 * same breath.
 *
 * `aria-busy` mirrors the oracle's own contract (all three old-tree
 * targets set it on indeterminate) and `data-state` gives the decoration
 * layer a projected attribute to key the indeterminate slide animation off
 * (boundary 6 corollary: style keys off projected attributes, never a
 * hand-rolled ternary in the performance).
 */

export type ProgressSize = 'sm' | 'default' | 'lg';

export interface ProgressConfig {
  /** Current value, 0..max. Undefined = indeterminate. */
  value?: number | undefined;
  /** Maximum value. Default 100. */
  max?: number | undefined;
  size?: ProgressSize | undefined;
  /** Fill signature (#1637) for the indicator. Default 'primary'. */
  fill?: string | undefined;
}

export type ProgressState = Record<never, never>;
export type ProgressActions = Record<never, never>;
export type ProgressPart = 'root' | 'indicator';

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/** Visual fill percentage (0-100) for the indicator's width channel.
 *  Meaningless while indeterminate -- callers gate on `value !== undefined`
 *  before reading it (the animation utility drives the indeterminate look,
 *  not a computed width). */
export function progressPercent(config: ProgressConfig): number {
  if (config.value === undefined) return 0;
  const max = config.max ?? 100;
  return (clamp(config.value, max) / max) * 100;
}

export const progress: BehaviorSpec<ProgressConfig, ProgressState, ProgressActions, ProgressPart> =
  {
    name: 'progress',
    parts: { root: {}, indicator: {} },
    initialState: () => ({}),
    actions: {},
    canDispatch: () => true,
    aria: (_state, config) => {
      const max = config.max ?? 100;
      const determinate = config.value !== undefined;
      const state = determinate ? 'determinate' : 'indeterminate';
      return {
        root: {
          role: 'progressbar',
          'aria-valuemin': '0',
          'aria-valuemax': String(max),
          'aria-valuenow': determinate ? String(clamp(config.value as number, max)) : undefined,
          'aria-busy': determinate ? undefined : 'true',
          'data-state': state,
        },
        indicator: {
          'aria-hidden': 'true',
          'data-state': state,
        },
      };
    },
    keymap: () => null,
    effects: () => [],
  };
