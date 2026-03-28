/**
 * Shared class definitions for Progress component
 * Used by both progress.tsx (React) and progress.astro (Astro)
 */

export const progressContainerClasses = 'relative w-full overflow-hidden rounded-full bg-muted';

export const progressIndicatorBaseClasses =
  'h-full transition-all duration-normal motion-reduce:transition-none';

export const progressVariantClasses: Record<string, string> = {
  default: 'bg-primary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  accent: 'bg-accent',
};

export const progressSizeClasses: Record<string, string> = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
};
