import type { BehaviorSpec } from '@/lib/contract';

/**
 * Spinner: a busy indicator. A static score -- no state, no actions, no
 * keymap, no effects. It signals in-flight work through a spinning ring and
 * announces "Loading" to assistive tech.
 *
 * Like card and container, the score never performs; it describes. The one
 * contract it projects is `aria-label="Loading"` on the root. The root is an
 * `<output>`, whose implicit `role="status"` (a polite live region) is NATIVE
 * to the element -- so, exactly as container leaves landmark roles to the
 * element, the score does NOT project a role and `parts.root` declares none.
 * The label, by contrast, is NOT native, so the score states it (the same
 * native-vs-projected split alert draws with its non-native `role="alert"`).
 * Projecting the label -- rather than leaving it a literal in each framework
 * file -- gives the conformance harness a real ARIA contract to audit and
 * keeps the "Loading" string defined in exactly one place.
 *
 * There is nothing to react to, so Spinner needs NO client: no `bindSpinner`,
 * no `useMemory`, no `<script>`. The performances are markup + classes + the
 * projected label, nothing more.
 */

export type SpinnerSize = 'sm' | 'default' | 'lg';

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

export interface SpinnerConfig {
  size?: SpinnerSize | undefined;
  variant?: SpinnerVariant | undefined;
}

export type SpinnerState = Record<never, never>;
export type SpinnerActions = Record<never, never>;
export type SpinnerPart = 'root';

export const spinner: BehaviorSpec<SpinnerConfig, SpinnerState, SpinnerActions, SpinnerPart> = {
  name: 'spinner',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // aria-label is the whole contract: a non-native accessible name for the
  // busy indicator, projected unconditionally. role="status" stays native to
  // the <output> element, so the score never states it.
  aria: () => ({ root: { 'aria-label': 'Loading' } }),
  keymap: () => null,
};
