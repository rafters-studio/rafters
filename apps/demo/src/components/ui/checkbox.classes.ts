import type {
  CheckboxConfig,
  CheckboxSize,
  CheckboxState,
  CheckboxVariant,
} from '@/components/ui/checkbox.behavior';

export interface CheckboxClassSet {
  /** The native `<button role="checkbox">` box. */
  root: string;
  /** The checkmark, shown while data-state=checked (state-swap). */
  check: string;
  /** The dash, shown while data-state=indeterminate (state-swap). */
  dash: string;
}

// `group` lets the indicator icons key off the root's data-state; `peer` is not
// used because the icons live inside the box. Fill, not background: the checked
// and indeterminate fills ride data-[state] variants, the disabled dimming
// rides both native `disabled` and the projected `data-disabled`.
//
// `inline-grid place-items-center`, not `inline-flex items-center
// justify-center`: the two glyphs must STACK in one cell rather than sit side by
// side, because the indicator row (below) animates them with opacity + scale and
// a `display` swap cannot transition. Both glyphs are painted at all times and
// `col-start-1 row-start-1` puts them in the same grid cell, so the box keeps its
// size. This is a structural change the row forced, not a design choice.
//
// TWO ROWS SHARE THIS ELEMENT and they carry different tiers, so the press row
// rides `active:` variants over the colour row's base assignment:
//   root / unchecked <-> checked -- color -- duration-moderate, ease-standard
//   root / press -- zoom + color -- duration-micro, ease-spring-snappy, extent-press
// `scale` is in the transition list for the press zoom; Tailwind v4 writes the
// individual `scale` property, never `transform`, so naming `transform` here
// would transition nothing.
const baseClasses =
  'group inline-grid place-items-center shrink-0 ' +
  'rounded-sm border cursor-pointer ' +
  'hover:border-input-hover ' +
  'transition-[color,background-color,border-color,scale] duration-moderate ease-standard ' +
  'active:extent-press active:scale-(--rafters-consumed-extent) ' +
  'active:duration-micro active:ease-spring-snappy ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

const variantClasses: Record<CheckboxVariant, { border: string; fill: string; ring: string }> = {
  default: {
    border: 'border-primary',
    fill:
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ' +
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
    ring: 'focus-visible:ring-primary-ring',
  },
  primary: {
    border: 'border-primary',
    fill:
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ' +
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
    ring: 'focus-visible:ring-primary-ring',
  },
  secondary: {
    border: 'border-secondary',
    fill:
      'data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground ' +
      'data-[state=indeterminate]:bg-secondary data-[state=indeterminate]:text-secondary-foreground',
    ring: 'focus-visible:ring-secondary-ring',
  },
  destructive: {
    border: 'border-destructive',
    fill:
      'data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground ' +
      'data-[state=indeterminate]:bg-destructive data-[state=indeterminate]:text-destructive-foreground',
    ring: 'focus-visible:ring-destructive-ring',
  },
  success: {
    border: 'border-success',
    fill:
      'data-[state=checked]:bg-success data-[state=checked]:text-success-foreground ' +
      'data-[state=indeterminate]:bg-success data-[state=indeterminate]:text-success-foreground',
    ring: 'focus-visible:ring-success-ring',
  },
  warning: {
    border: 'border-warning',
    fill:
      'data-[state=checked]:bg-warning data-[state=checked]:text-warning-foreground ' +
      'data-[state=indeterminate]:bg-warning data-[state=indeterminate]:text-warning-foreground',
    ring: 'focus-visible:ring-warning-ring',
  },
  info: {
    border: 'border-info',
    fill:
      'data-[state=checked]:bg-info data-[state=checked]:text-info-foreground ' +
      'data-[state=indeterminate]:bg-info data-[state=indeterminate]:text-info-foreground',
    ring: 'focus-visible:ring-info-ring',
  },
  accent: {
    border: 'border-accent',
    fill:
      'data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground ' +
      'data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-foreground',
    ring: 'focus-visible:ring-accent-ring',
  },
};

// The box stays intentionally small -- a checkbox's touch target is the paired
// label, not the glyph -- so these skip the touch-floor CQ scaling buttons use.
const sizeClasses: Record<CheckboxSize, { box: string; icon: string }> = {
  sm: { box: 'h-3.5 w-3.5', icon: 'h-2.5 w-2.5' },
  default: { box: 'h-4 w-4', icon: 'h-3 w-3' },
  lg: { box: 'h-5 w-5', icon: 'h-4 w-4' },
};

// The indicator glyphs. Both are always painted, stacked in the root's single
// grid cell, and each reveals itself when the root reaches its data-state.
//
//   checkbox / indicator / unchecked <-> checked -- swap (check draw) + fade
//     -- duration-fast, ease-standard, extent-draw
//   checkbox / root-indicator / check sequence -- delay -- delay-choreo-step
//
// THE CHECK-SEQUENCE ROW'S `duration` AND `curve` ARE BOTH `{"kind":"none"}`, AND
// THAT IS NOT AN EMPTY ROW. Its MOVEMENT is `delay`, which by construction has no
// duration and no curve -- the delay generic is the entire assignment. Every one
// of the matrix's seven `duration.kind === "none"` rows is this shape (the other
// six are the collection popups' `items / enter` rows carrying
// `delay-stagger-step`), so a reading that treats `none` as "assigns nothing"
// leaves both delay generics with no consumer anywhere in the system, against the
// matrix's own Choreography note: "parts sequence via `delay-choreo-step` between
// their rows". Do not delete the delay below on the strength of the `none`.
//
// EXTENT-DRAW SITS ON THE PRESENT STATE, not the absent one. `draw` is the
// COMPLETED fraction of a drawn indicator (1 = full travel), so the checked glyph
// scales TO it from `scale-0`. That is the opposite placement from `extent-pop`,
// which is the scale a surface enters FROM and therefore sits on the absent state
// (see radio-group's dot).
//
// The choreo delay is on the CHECKED variant only: the glyph follows the fill in
// by one beat on the way in, and leaves without ceremony on the way out.
const indicatorBaseClasses =
  'col-start-1 row-start-1 text-current opacity-0 scale-0 ' +
  'transition-[opacity,scale] duration-fast ease-standard';

const checkStateClasses =
  'group-data-[state=checked]:opacity-100 ' +
  'group-data-[state=checked]:extent-draw ' +
  'group-data-[state=checked]:scale-(--rafters-consumed-extent) ' +
  'group-data-[state=checked]:delay-choreo-step';

const dashStateClasses =
  'group-data-[state=indeterminate]:opacity-100 ' +
  'group-data-[state=indeterminate]:extent-draw ' +
  'group-data-[state=indeterminate]:scale-(--rafters-consumed-extent) ' +
  'group-data-[state=indeterminate]:delay-choreo-step';

export function checkboxClasses(config: CheckboxConfig, _state: CheckboxState): CheckboxClassSet {
  const variant = variantClasses[config.variant ?? 'default'];
  const size = sizeClasses[config.size ?? 'default'];
  return {
    root: `${baseClasses} ${variant.border} ${variant.fill} ${variant.ring} ${size.box}`,
    check: `${size.icon} ${indicatorBaseClasses} ${checkStateClasses}`,
    dash: `${size.icon} ${indicatorBaseClasses} ${dashStateClasses}`,
  };
}
