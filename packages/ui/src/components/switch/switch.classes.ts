import type { SwitchConfig, SwitchSize, SwitchState, SwitchVariant } from './switch.behavior';

export interface SwitchClassSet {
  root: string;
  thumb: string;
}

// The checked/unchecked presentation is driven off the projected `data-state`,
// not a swapped class string: one class set covers both ends, and the score's
// data-state flip is what the CSS reads -- so light-DOM markup, the WC, and
// React all animate identically with no extra class logic (the same technique
// input uses to style validity off aria-invalid).
const baseTrackClasses =
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent ' +
  'bg-input ' +
  'transition-colors duration-200 motion-reduce:transition-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const variantClasses: Record<SwitchVariant, string> = {
  default: 'data-[state=checked]:bg-primary focus-visible:ring-primary-ring',
  primary: 'data-[state=checked]:bg-primary focus-visible:ring-primary-ring',
  secondary: 'data-[state=checked]:bg-secondary focus-visible:ring-secondary-ring',
  destructive: 'data-[state=checked]:bg-destructive focus-visible:ring-destructive-ring',
  success: 'data-[state=checked]:bg-success focus-visible:ring-success-ring',
  warning: 'data-[state=checked]:bg-warning focus-visible:ring-warning-ring',
  info: 'data-[state=checked]:bg-info focus-visible:ring-info-ring',
  accent: 'data-[state=checked]:bg-accent focus-visible:ring-accent-ring',
};

const trackSizeClasses: Record<SwitchSize, string> = {
  sm: 'h-5 w-9',
  default: 'h-6 w-11',
  lg: 'h-7 w-14',
};

const baseThumbClasses =
  'pointer-events-none block rounded-full bg-background shadow-sm ring-0 translate-x-0 ' +
  'transition-transform duration-200 motion-reduce:transition-none';

const thumbSizeClasses: Record<SwitchSize, string> = {
  sm: 'h-4 w-4 data-[state=checked]:translate-x-4',
  default: 'h-5 w-5 data-[state=checked]:translate-x-5',
  lg: 'h-6 w-6 data-[state=checked]:translate-x-7',
};

export function switchClasses(config: SwitchConfig, _state?: SwitchState): SwitchClassSet {
  return {
    root: `${baseTrackClasses} ${trackSizeClasses[config.size]} ${variantClasses[config.variant]}`,
    thumb: `${baseThumbClasses} ${thumbSizeClasses[config.size]}`,
  };
}

export function switchVariants(
  options: { variant?: SwitchVariant; size?: SwitchSize } = {},
): string {
  return `${baseTrackClasses} ${trackSizeClasses[options.size ?? 'default']} ${variantClasses[options.variant ?? 'default']}`;
}
