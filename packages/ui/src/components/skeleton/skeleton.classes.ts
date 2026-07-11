import type { SkeletonConfig, SkeletonState, SkeletonVariant } from './skeleton.behavior';

export interface SkeletonClassSet {
  root: string;
}

/**
 * Subtle surfaces, not solid ones: a skeleton occupies layout, it does not
 * compete for attention. No paired *-foreground class is emitted for any
 * variant -- the part renders no text, so a foreground token would be a
 * class the DOM never uses (and the contrast-pairing defect this vocabulary
 * exists to avoid never has a text node to pair against here).
 */
const variantClasses: Record<SkeletonVariant, string> = {
  default: 'bg-muted',
  primary: 'bg-primary-subtle',
  secondary: 'bg-secondary-subtle',
  destructive: 'bg-destructive-subtle',
  success: 'bg-success-subtle',
  warning: 'bg-warning-subtle',
  info: 'bg-info-subtle',
  muted: 'bg-muted',
  accent: 'bg-accent-subtle',
};

const baseClasses = 'rounded-md animate-pulse motion-reduce:animate-none';

export function skeletonClasses(config: SkeletonConfig, _state: SkeletonState): SkeletonClassSet {
  const variant = config.variant ?? 'default';
  return { root: `${baseClasses} ${variantClasses[variant]}` };
}
