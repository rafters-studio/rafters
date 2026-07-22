import type { SkeletonConfig, SkeletonState } from '@/components/ui/skeleton.behavior';

export interface SkeletonClassSet {
  root: string;
}

/**
 * The whole decoration Skeleton carries, ported verbatim from the oracle
 * (`src/old/ui/skeleton.classes.ts`): a rounded, muted surface that pulses.
 * `bg-muted` is a SEMANTIC token (the same shape as Card baking in `bg-card`),
 * not a raw colour utility. `animate-pulse` is the feedback-loop shimmer;
 * `motion-reduce:animate-none` opts the pulse out under
 * `prefers-reduced-motion`. Consumers size and shape the placeholder through
 * `className` (`h-4 w-48`, `rounded-full`, ...), exactly as the shadcn base and
 * the oracle intended.
 */
export const skeletonBaseClasses = 'animate-pulse rounded-md bg-muted motion-reduce:animate-none';

export function skeletonClasses(_config: SkeletonConfig, _state: SkeletonState): SkeletonClassSet {
  return { root: skeletonBaseClasses };
}
