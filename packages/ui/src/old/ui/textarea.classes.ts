/**
 * Shared class definitions for Textarea component
 */

export const textareaBaseClasses =
  'flex w-full rounded-md border bg-background ' +
  'ring-offset-background ' +
  'placeholder:text-muted-foreground ' +
  'hover:border-input-hover ' +
  'focus-visible:outline-none focus-visible:ring-offset-2 ' +
  'transition-shadow duration-100 motion-reduce:transition-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const textareaVariantClasses: Record<string, string> = {
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

export const textareaSizeClasses: Record<string, string> = {
  sm: 'min-h-16 px-2 py-1 text-label-small',
  default: 'min-h-20 px-3 py-2 text-body-small',
  lg: 'min-h-28 px-4 py-3 text-body-medium',
};
