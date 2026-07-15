/**
 * Shared class definitions for Label component
 */

export const labelBaseClasses =
  'text-label-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

export const labelVariantClasses: Record<string, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  destructive: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  muted: 'text-muted-foreground',
  accent: 'text-accent',
};
