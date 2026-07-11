import type { BehaviorSpec } from '../../lib/contract';

/**
 * Skeleton: a loading placeholder. A static score -- no state, no actions,
 * no keymap, no effects -- but unlike Container's empty projection, this
 * one carries a real, always-on ARIA fact: the placeholder is decoration,
 * never content, so it must never be announced. `aria-hidden` is not a
 * derived state transition (Spec 04's statics declare no motion block);
 * it is the one thing the harness audits here, the same way Grid audits
 * its conditional role.
 *
 * The oracle's Astro performance (src/old/ui/skeleton.astro) claimed
 * "aria-hidden decorative" in its docblock but never rendered the
 * attribute -- a screen reader announcing an empty pulsing div is the
 * defect this projection closes (defect-do-not-port).
 */

export type SkeletonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

export interface SkeletonConfig {
  variant?: SkeletonVariant | undefined;
}

export type SkeletonState = Record<never, never>;
export type SkeletonActions = Record<never, never>;
export type SkeletonPart = 'root';

export const skeleton: BehaviorSpec<SkeletonConfig, SkeletonState, SkeletonActions, SkeletonPart> =
  {
    name: 'skeleton',
    parts: { root: {} },
    initialState: () => ({}),
    actions: {},
    canDispatch: () => true,
    aria: () => ({ root: { 'aria-hidden': 'true' } }),
    keymap: () => null,
    effects: () => [],
  };
