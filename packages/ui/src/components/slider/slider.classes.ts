import type {
  SliderConfig,
  SliderOrientation,
  SliderSize,
  SliderState,
  SliderVariant,
} from './slider.behavior';

export interface SliderClassSet {
  root: string;
  track: string;
  range: string;
  thumb: string;
}

// The disabled presentation rides the projected `data-disabled` on the root, not
// a swapped string: one class set covers both ends and the score's flag is what
// the CSS reads -- so light-DOM markup, the WC, and React all dim identically.
const baseRootClasses =
  'relative flex touch-none select-none items-center ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const rootOrientationClasses: Record<SliderOrientation, string> = {
  horizontal: 'w-full',
  vertical: 'h-full flex-col',
};

const baseTrackClasses = 'relative grow overflow-hidden rounded-full bg-muted';

const trackSizeClasses: Record<SliderSize, string> = {
  sm: 'data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1',
  default: 'data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2',
  lg: 'data-[orientation=horizontal]:h-3 data-[orientation=vertical]:w-3',
};

const trackOrientationClasses: Record<SliderOrientation, string> = {
  horizontal: 'w-full',
  vertical: 'h-full',
};

const baseRangeClasses = 'absolute';

const rangeOrientationClasses: Record<SliderOrientation, string> = {
  horizontal: 'h-full',
  vertical: 'w-full',
};

const rangeFillClasses: Record<SliderVariant, string> = {
  default: 'bg-primary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  accent: 'bg-accent',
};

const baseThumbClasses =
  'absolute block rounded-full border-2 bg-background ' +
  'ring-offset-background transition-all duration-150 motion-reduce:transition-none ' +
  'hover:scale-110 active:scale-105 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed';

const thumbSizeClasses: Record<SliderSize, string> = {
  sm: 'h-4 w-4',
  default: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const thumbVariantClasses: Record<SliderVariant, string> = {
  default: 'border-primary focus-visible:ring-primary-ring',
  primary: 'border-primary focus-visible:ring-primary-ring',
  secondary: 'border-secondary focus-visible:ring-secondary-ring',
  destructive: 'border-destructive focus-visible:ring-destructive-ring',
  success: 'border-success focus-visible:ring-success-ring',
  warning: 'border-warning focus-visible:ring-warning-ring',
  info: 'border-info focus-visible:ring-info-ring',
  accent: 'border-accent focus-visible:ring-accent-ring',
};

export function sliderClasses(config: SliderConfig, _state?: SliderState): SliderClassSet {
  const { variant, size, orientation } = config;
  return {
    root: `${baseRootClasses} ${rootOrientationClasses[orientation]}`,
    track: `${baseTrackClasses} ${trackSizeClasses[size]} ${trackOrientationClasses[orientation]}`,
    range: `${baseRangeClasses} ${rangeOrientationClasses[orientation]} ${rangeFillClasses[variant]}`,
    thumb: `${baseThumbClasses} ${thumbSizeClasses[size]} ${thumbVariantClasses[variant]}`,
  };
}

export function sliderVariants(
  options: { variant?: SliderVariant; size?: SliderSize } = {},
): string {
  const variant = options.variant ?? 'default';
  const size = options.size ?? 'default';
  return `${baseThumbClasses} ${thumbSizeClasses[size]} ${thumbVariantClasses[variant]}`;
}
