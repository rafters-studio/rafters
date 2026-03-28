/**
 * Shared class definitions for Spinner component
 * Used by both spinner.tsx (React) and spinner.astro (Astro)
 */

export const spinnerBaseClasses =
  'inline-block rounded-full animate-spin motion-reduce:animate-none';

export const spinnerVariantClasses: Record<string, string> = {
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

export const spinnerSizeClasses: Record<string, string> = {
  sm: 'h-4 w-4 border-2',
  default: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};
