/**
 * Shared class definitions for Slider component
 */

export const sliderContainerBaseClasses =
  'relative flex touch-none select-none items-center ' +
  'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none';

export const sliderTrackBaseClasses = 'relative grow overflow-hidden rounded-full bg-muted';

export const sliderRangeBaseClasses = 'absolute';

export const sliderThumbBaseClasses = 'absolute block rounded-full border-2 bg-background';

export const sliderThumbInteractionClasses =
  'ring-offset-background transition-all duration-150 motion-reduce:transition-none ' +
  'hover:scale-110 ' +
  'active:scale-105 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

export const sliderVariantClasses: Record<string, { range: string; thumb: string; ring: string }> =
  {
    default: {
      range: 'bg-primary',
      thumb: 'border-primary',
      ring: 'focus-visible:ring-primary-ring',
    },
    primary: {
      range: 'bg-primary',
      thumb: 'border-primary',
      ring: 'focus-visible:ring-primary-ring',
    },
    secondary: {
      range: 'bg-secondary',
      thumb: 'border-secondary',
      ring: 'focus-visible:ring-secondary-ring',
    },
    destructive: {
      range: 'bg-destructive',
      thumb: 'border-destructive',
      ring: 'focus-visible:ring-destructive-ring',
    },
    success: {
      range: 'bg-success',
      thumb: 'border-success',
      ring: 'focus-visible:ring-success-ring',
    },
    warning: {
      range: 'bg-warning',
      thumb: 'border-warning',
      ring: 'focus-visible:ring-warning-ring',
    },
    info: { range: 'bg-info', thumb: 'border-info', ring: 'focus-visible:ring-info-ring' },
    accent: { range: 'bg-accent', thumb: 'border-accent', ring: 'focus-visible:ring-accent-ring' },
  };

export const sliderSizeClasses: Record<string, { track: string; thumb: string }> = {
  sm: { track: 'h-1', thumb: 'h-4 w-4' },
  default: { track: 'h-2', thumb: 'h-5 w-5' },
  lg: { track: 'h-3', thumb: 'h-6 w-6' },
};
