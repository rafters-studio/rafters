/**
 * Shared class definitions for Input component
 */

export const inputBaseClasses =
  'flex w-full rounded-md border bg-background py-2 ' +
  'ring-offset-background ' +
  'file:border-0 file:bg-transparent file:text-sm file:font-medium ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'transition-shadow duration-100 motion-reduce:transition-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const inputVariantClasses: Record<string, string> = {
  default: 'border-primary focus-visible:ring-2 focus-visible:ring-primary-ring',
  primary: 'border-primary focus-visible:ring-2 focus-visible:ring-primary-ring',
  secondary: 'border-secondary focus-visible:ring-2 focus-visible:ring-secondary-ring',
  destructive: 'border-destructive focus-visible:ring-2 focus-visible:ring-destructive-ring',
  success: 'border-success focus-visible:ring-2 focus-visible:ring-success-ring',
  warning: 'border-warning focus-visible:ring-2 focus-visible:ring-warning-ring',
  info: 'border-info focus-visible:ring-2 focus-visible:ring-info-ring',
  muted: 'border-muted focus-visible:ring-2 focus-visible:ring-ring',
  accent: 'border-accent focus-visible:ring-2 focus-visible:ring-accent-ring',
};

export const inputSizeClasses: Record<string, string> = {
  sm: 'h-8 px-2 text-xs',
  default: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};
