/**
 * Shared class definitions for Switch component
 */

export const switchTrackBaseClasses = 'peer inline-flex shrink-0 cursor-pointer items-center';

export const switchTrackShapeClasses = 'rounded-full border-2 border-transparent';

export const switchTrackTransitionClasses = 'transition-colors';

export const switchTrackFocusClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const switchTrackDisabledClasses = 'disabled:cursor-not-allowed disabled:opacity-50';

export const switchTrackUncheckedClasses = 'bg-input';

export const switchThumbBaseClasses =
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0';

export const switchThumbTransitionClasses = 'transition-transform';

export const switchThumbUncheckedClasses = 'translate-x-0';

export const switchVariantClasses: Record<string, { checked: string; ring: string }> = {
  default: { checked: 'bg-primary', ring: 'focus-visible:ring-primary-ring' },
  primary: { checked: 'bg-primary', ring: 'focus-visible:ring-primary-ring' },
  secondary: { checked: 'bg-secondary', ring: 'focus-visible:ring-secondary-ring' },
  destructive: { checked: 'bg-destructive', ring: 'focus-visible:ring-destructive-ring' },
  success: { checked: 'bg-success', ring: 'focus-visible:ring-success-ring' },
  warning: { checked: 'bg-warning', ring: 'focus-visible:ring-warning-ring' },
  info: { checked: 'bg-info', ring: 'focus-visible:ring-info-ring' },
  accent: { checked: 'bg-accent', ring: 'focus-visible:ring-accent-ring' },
};

export const switchSizeClasses: Record<
  string,
  { track: string; thumb: string; translate: string }
> = {
  sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' },
  default: { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' },
  lg: { track: 'h-7 w-14', thumb: 'h-6 w-6', translate: 'translate-x-7' },
};
