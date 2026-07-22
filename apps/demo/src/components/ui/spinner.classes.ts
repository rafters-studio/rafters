import type { SpinnerConfig, SpinnerSize, SpinnerState, SpinnerVariant } from '@/components/ui/spinner.behavior';

export interface SpinnerClassSet {
  root: string;
}

/**
 * The ring structure every spinner carries: an inline round element that
 * spins, with the reduced-motion opt-out baked in so the animation respects
 * `prefers-reduced-motion`. Motion intent only -- `animate-spin` and its
 * duration/easing resolve from the token-driven Tailwind utilities.
 */
const baseClasses = 'inline-block rounded-full animate-spin motion-reduce:animate-none';

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
