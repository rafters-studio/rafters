import type { BehaviorSpec } from '../../lib/contract';

/**
 * Spinner: a busy indicator. A static score -- no state, no actions, no
 * keymap, no effects (Spec 01: statics have nothing to subscribe to) -- but
 * unlike Container/Grid's structural silence, Spinner's whole job is an
 * ARIA projection: `role="status"` plus an accessible name, so assistive
 * tech announces in-flight work without the caller wiring a live region by
 * hand. That real, unconditional projection is why this static gets a
 * behavior file at all (Container has none; Grid's is conditional on
 * `role='grid'`).
 *
 * Oracle disposition (src/old/ui/spinner.*): the accessible name was a
 * hardcoded literal ("Loading", baked into every framework target with no
 * override). Config's `label` makes it what it always should have been --
 * data, not a string constant -- while keeping "Loading" as the default so
 * silent callers get identical behavior.
 */

export type SpinnerVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'muted';

export type SpinnerSize = 'sm' | 'default' | 'lg';

export interface SpinnerConfig {
  size?: SpinnerSize | undefined;
  variant?: SpinnerVariant | undefined;
  /** Accessible name announced by role="status". Defaults to "Loading". */
  label?: string | undefined;
}

export type SpinnerState = Record<never, never>;
export type SpinnerActions = Record<never, never>;
export type SpinnerPart = 'root';

export const spinner: BehaviorSpec<SpinnerConfig, SpinnerState, SpinnerActions, SpinnerPart> = {
  name: 'spinner',
  parts: { root: { role: 'status' } },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  aria: (_state, config) => ({
    root: {
      role: 'status',
      'aria-label': config.label ?? 'Loading',
    },
  }),
  keymap: () => null,
  effects: () => [],
};
