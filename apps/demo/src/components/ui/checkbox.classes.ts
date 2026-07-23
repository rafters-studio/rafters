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
const baseClasses =
  'group inline-flex items-center justify-center shrink-0 ' +
  'rounded-sm border cursor-pointer ' +
  'hover:border-input-hover ' +
  'transition-colors duration-150 motion-reduce:transition-none ' +
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

export function checkboxClasses(config: CheckboxConfig, _state: CheckboxState): CheckboxClassSet {
  const variant = variantClasses[config.variant ?? 'default'];
  const size = sizeClasses[config.size ?? 'default'];
  return {
    root: `${baseClasses} ${variant.border} ${variant.fill} ${variant.ring} ${size.box}`,
    // State-swap: each icon is hidden until the root reaches its data-state. The
    // icon carries `text-current`, inheriting the fill's foreground token.
    check: `${size.icon} hidden text-current group-data-[state=checked]:block`,
    dash: `${size.icon} hidden text-current group-data-[state=indeterminate]:block`,
  };
}
