import type {
  SliderConfig,
  SliderOrientation,
  SliderSize,
  SliderState,
  SliderVariant,
} from '@/components/ui/slider.behavior';

export interface SliderClassSet {
  root: string;
  track: string;
  range: string;
  thumb: string;
}

// The disabled presentation rides the projected `data-disabled` on the root, not
// a swapped string: one class set covers both ends and the score's flag is what
// the CSS reads -- so light-DOM markup, the WC, and React all dim identically.
// `group` is load-bearing: the score sets `data-dragging="true"` on the ROOT for
// the duration of a pointer drag (slider.behavior.ts setDragging, and the same
// two lines in slider.tsx), and the thumb and range read it through
// `group-data-[dragging=true]` to obey the pointer rule below. Until now nothing
// consumed that flag; the behaviour comment already called it "the `data-dragging`
// flag the CSS reads".
const baseRootClasses =
  'group relative flex touch-none select-none items-center ' +
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

// slider / range fill / follows thumb -- fill -- the row's duration and curve are
// `{"kind":"follows","source":"thumb"}`, so the fill takes the thumb's assignment
// verbatim: duration-fast / ease-standard for a discrete step, and NOTHING while
// a pointer drives it.
//
// FOLLOWS MEANS "TAKES THE THUMB'S ASSIGNMENT", NOT "TAKES NOTHING". The matrix
// renders this row's two columns as `same as thumb | same`. Untimed here while
// the thumb glides through a keyboard step would make the fill snap ahead of the
// thumb it is supposed to follow, which is the one thing the row forbids. The
// drag exemption below is inherited for the same reason -- it is the thumb's.
//
// The properties are the physical insets the score writes inline (`left`/`right`
// horizontally, `bottom`/`top` vertically -- slider.behavior.ts updateRange and
// slider.tsx rangeStyle). The matrix asks for logical sides; the score writes
// physical ones, which is a defect in the score, not something a classes file can
// correct. Reported, not papered over.
const baseRangeClasses =
  'absolute transition-[left,right,top,bottom] duration-fast ease-standard ' +
  'group-data-[dragging=true]:transition-none';

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

// THE POINTER RULE IS THE WHOLE POINT OF THIS BLOCK. Four rows land on the thumb:
//
//   thumb / hover -- color -- duration-fast, ease-standard
//   thumb / keyboard step -- travel -- duration-fast, ease-standard, structural (step)
//   thumb / grab -- zoom -- duration-micro, ease-spring-snappy, extent-press
//   thumb / dragging -- travel -- duration {"kind":"pointer-rule"}: NOT A TUNABLE
//     CELL. While a pointer drives the thumb it tracks the pointer exactly, and
//     any nonzero duration is a defect.
//
// `transition-all duration-fast` was that defect: the score writes the thumb's
// position as an inline `left`/`bottom` percentage, `all` covers it, so every
// pointer move was arriving one `duration-fast` late. The fix is to drop the
// POSITION out of the transition list while `data-dragging` is set, rather than
// to zero the duration -- zeroing would also flatten the grab zoom, which is a
// real cell that keeps its timing throughout the drag.
//
// THE `group-data-[dragging=true]:` RULE IS THE POINTER-RULE ROW'S CONSUMPTION.
// DO NOT DELETE IT AS DEAD WEIGHT. A pointer-rule row is consumed by the absence
// of timing, and on most components that means writing nothing at all -- but here
// the KEYBOARD STEP row (a real tier, fast*) puts `left`/`bottom` into the
// transition list, and the two rows share that property. Silence in the class
// string would therefore render as `duration-fast` on pointer-driven travel: the
// defect, not the rule. The exemption is what makes the drag actually untimed.
//
// The position properties are the PHYSICAL insets the score writes inline
// (slider.behavior.ts updateThumb, slider.tsx thumbStyle). The matrix calls a
// physical side a defect; correcting it belongs to the score, not here.
//
// `hover:scale-110` HAS NO ROW. The matrix's `thumb / hover` row is colour only,
// so this zoom is a moment the component has and the matrix does not claim. It is
// kept as it stands and reported rather than deleted or given an invented cell;
// its timing falls out of the hover row's own tier, which is the same fast/standard.
//
// `active:scale-105` is gone: the grab row assigns `extent-press`, so the scale
// comes from the token leaf. Note the grab's `active:duration-micro
// active:ease-spring-snappy` retimes every property on the element while pressed,
// the hover colour included -- Tailwind emits one duration per rule, so a
// per-property tier is not expressible. During a grab, the grab's tier wins.
const baseThumbClasses =
  'absolute block rounded-full border-2 bg-background ring-offset-background ' +
  'transition-[left,bottom,background-color,border-color,scale] duration-fast ease-standard ' +
  'group-data-[dragging=true]:transition-[background-color,border-color,scale] ' +
  'hover:scale-110 ' +
  'active:extent-press active:scale-(--rafters-consumed-extent) ' +
  'active:duration-micro active:ease-spring-snappy ' +
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
