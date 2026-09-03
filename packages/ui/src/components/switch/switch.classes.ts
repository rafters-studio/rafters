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
// The root IS the track: the matrix's `switch / track` and `switch / root` rows
// both land on this one element, and they carry different tiers, so the press row
// rides `active:` variants over the colour row's base assignment.
//   switch / track / off <-> on -- color -- duration-moderate, ease-standard
//   switch / root / press -- zoom + color -- duration-micro, ease-spring-snappy,
//     extent-press
// `scale` is named in the transition list because Tailwind v4 writes the
// individual `scale` property; `transform` would transition nothing.
const baseTrackClasses =
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent ' +
  'bg-input ' +
  'transition-[color,background-color,border-color,scale] duration-moderate ease-standard ' +
  'active:extent-press active:scale-(--rafters-consumed-extent) ' +
  'active:duration-micro active:ease-spring-snappy ' +
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

// switch / thumb / off <-> on -- travel (x) -- duration-moderate, ease-standard,
// structural (track minus thumb).
//
// A TRANSITION, NOT A KEYFRAME. The thumb stays on screen and moves between two
// resting positions, so it must interpolate from wherever it currently is; a
// keyframe would restart from its own `from` and snap a half-thrown switch back
// to the start. The travel distance stays structural -- the per-size
// `translate-x-*` below -- which is what the row's `structural` extent means.
const baseThumbClasses =
  'pointer-events-none block rounded-full bg-background shadow-sm ring-0 translate-x-0 ' +
  'transition-transform duration-moderate ease-standard';

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
