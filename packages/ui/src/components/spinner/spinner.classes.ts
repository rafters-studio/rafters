import type { SpinnerConfig, SpinnerSize, SpinnerState, SpinnerVariant } from './spinner.behavior';

export interface SpinnerClassSet {
  root: string;
}

/**
 * The ring structure every spinner carries: an inline round element that
 * spins.
 *
 * THE CELL IS THE SPEC (#2017, #2154). `animate-spinner-root-busy` is the
 * generated consumption of `spinner / root / busy` in
 * `packages/ui/docs/spec/matrix/motion.jsonl` (period `spin`) -- one
 * reference, no raw `animate-spin`, no literal duration.
 *
 * NO motion-reduce:animate-none. A period-kind cell is exempt from the
 * reduced-motion zeroing law by design (#2155): the utility carries no
 * `@media (prefers-reduced-motion: reduce)` block at all, so the ring keeps
 * spinning at the same period regardless of the user's preference -- a
 * stopped busy indicator says the work stopped, which would be false while
 * work is still in flight. See
 * `packages/ui/src/primitives/intelligence-integration.ts:106-121` and
 * `REDUCED_MOTION_ZEROED` in `packages/design-tokens/src/exporters/tailwind.ts`
 * for the ruling this follows.
 */
const baseClasses = 'inline-block rounded-full animate-spinner-root-busy';

/**
 * Size selects the ring's box and stroke. Ported verbatim from the oracle.
 * `border-3` is not a Tailwind v4 default width token (the defaults are
 * border-2/4/8); it is carried forward as-is rather than repointed, a tracked
 * oracle disposition, not an agent decision (see the component doc).
 */
const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  default: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

/**
 * Variant colours the ring: the role's border colour on three sides with a
 * transparent right edge, which is what reads as a spinning arc. Semantic
 * colour tokens only -- never a raw colour utility.
 */
const variantClasses: Record<SpinnerVariant, string> = {
  default: 'border-primary border-r-transparent',
  primary: 'border-primary border-r-transparent',
  secondary: 'border-secondary border-r-transparent',
  destructive: 'border-destructive border-r-transparent',
  success: 'border-success border-r-transparent',
  warning: 'border-warning border-r-transparent',
  info: 'border-info border-r-transparent',
  accent: 'border-accent border-r-transparent',
  muted: 'border-muted-foreground border-r-transparent',
};

export function spinnerClasses(config: SpinnerConfig, _state: SpinnerState): SpinnerClassSet {
  const size = config.size ?? 'default';
  const variant = config.variant ?? 'default';
  return {
    root: `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`,
  };
}
