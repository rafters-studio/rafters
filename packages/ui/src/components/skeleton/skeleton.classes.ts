import type { SkeletonConfig, SkeletonState } from './skeleton.behavior';

export interface SkeletonClassSet {
  root: string;
}

/**
 * The whole decoration Skeleton carries: a rounded, muted surface that
 * shimmers. `bg-muted` is a SEMANTIC token (the same shape as Card baking in
 * `bg-card`), not a raw colour utility.
 *
 * THE CELL IS THE SPEC (#2017, #2154). `animate-pulse-shimmer` is the
 * generated consumption of `skeleton / root / waiting` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` (period `shimmer`) -- one
 * reference, no raw `animate-pulse`, no literal duration.
 *
 * NO motion-reduce:animate-none. A period-kind cell is exempt from the
 * reduced-motion zeroing law by design (#2155): the utility carries no
 * `@media (prefers-reduced-motion: reduce)` block at all, so the shimmer runs
 * at the same period regardless of the user's preference. A stopped work loop
 * says the work stopped, which is false while content is still loading --
 * `packages/ui/src/primitives/intelligence-integration.ts:106-121` and
 * `REDUCED_MOTION_ZEROED` in `packages/design-tokens/src/exporters/tailwind.ts`
 * are the ruling this follows. Adding `motion-reduce:animate-none` back here
 * would silently reintroduce the violation this issue removes.
 *
 * THE SECOND ROW HAS NO MOMENT HERE, AND THAT IS THE FINDING.
 * `skeleton / root / content ready` assigns tier `fast` and curve role `exit`
 * (provenance `proposed`) to a fade, and the token layer has already minted
 * the cell (`skeleton-root-content-ready`, utility
 * `animate-fade-out-fast-exit`). Skeleton cannot key it off anything:
 * `SkeletonConfig` and `SkeletonState` are both `Record<never, never>` -- no
 * config, no state, no actions, a decorative leaf whose whole contract is a
 * constant `aria-hidden`. "Content ready" is the CONSUMER unmounting this
 * element, and a CSS animation cannot run on a node that has left the DOM.
 * `data-[state=ready]:animate-fade-out-fast-exit` would name a state nothing
 * sets -- a dead class, the shape of defect #2225 removed from chart-tooltip.
 * Either the row joins the excluded list the way the tooltip rows did, or
 * Skeleton gains a state it does not have today. That is an operator call, so
 * the disagreement is reported here rather than resolved.
 *
 * Consumers size and shape the placeholder through `className` (`h-4 w-48`,
 * `rounded-full`, ...), exactly as the shadcn base and the oracle intended.
 */
export const skeletonBaseClasses = 'animate-pulse-shimmer rounded-md bg-muted';

export function skeletonClasses(_config: SkeletonConfig, _state: SkeletonState): SkeletonClassSet {
  return { root: skeletonBaseClasses };
}
