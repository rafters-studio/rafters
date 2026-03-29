/**
 * Shared class definitions for Checkbox component
 */

export const checkboxBaseClasses =
  'inline-flex items-center justify-center shrink-0 ' +
  'rounded-sm border ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50';

export const checkboxVariantClasses: Record<
  string,
  { border: string; checked: string; ring: string }
> = {
  default: {
    border: 'border-primary',
    checked: 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    ring: 'focus-visible:ring-primary-ring',
  },
  primary: {
    border: 'border-primary',
    checked: 'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
    ring: 'focus-visible:ring-primary-ring',
  },
  secondary: {
    border: 'border-secondary',
    checked: 'data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground',
    ring: 'focus-visible:ring-secondary-ring',
  },
  destructive: {
    border: 'border-destructive',
    checked: 'data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground',
    ring: 'focus-visible:ring-destructive-ring',
  },
  success: {
    border: 'border-success',
    checked: 'data-[state=checked]:bg-success data-[state=checked]:text-success-foreground',
    ring: 'focus-visible:ring-success-ring',
  },
  warning: {
    border: 'border-warning',
    checked: 'data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground',
    ring: 'focus-visible:ring-warning-ring',
  },
  info: {
    border: 'border-info',
    checked: 'data-[state=checked]:bg-info data-[state=checked]:text-info-foreground',
    ring: 'focus-visible:ring-info-ring',
  },
  accent: {
    border: 'border-accent',
    checked: 'data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground',
    ring: 'focus-visible:ring-accent-ring',
  },
};

export const checkboxSizeClasses: Record<string, { box: string; icon: string }> = {
  sm: { box: 'h-3.5 w-3.5', icon: 'h-2.5 w-2.5' },
  default: { box: 'h-4 w-4', icon: 'h-3 w-3' },
  lg: { box: 'h-5 w-5', icon: 'h-4 w-4' },
};
