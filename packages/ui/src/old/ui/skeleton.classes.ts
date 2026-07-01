/**
 * Shared skeleton variant class definitions
 *
 * Imported by both skeleton.tsx (React) and skeleton.astro (Astro)
 * to ensure visual parity across framework targets.
 */

export const skeletonVariantClasses: Record<string, string> = {
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

export const skeletonBaseClasses = 'rounded-md animate-pulse motion-reduce:animate-none';
