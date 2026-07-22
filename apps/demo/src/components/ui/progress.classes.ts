import {
  resolveProgress,
  type ProgressConfig,
  type ProgressSize,
  type ProgressState,
  type ProgressVariant,
} from '@/components/ui/progress.behavior';

/**
 * The view: class strings, no logic. The track (root) surface and the
 * indicator fill. Fill, not background -- the variant maps pick a `bg-*` role
 * token for the indicator, never a raw colour. The three performances all
 * compose their className through progressClasses so there is zero drift.
 */

export const progressContainerClasses = 'relative w-full overflow-hidden rounded-full bg-muted';

export const progressIndicatorBaseClasses =
  'h-full transition-all duration-300 motion-reduce:transition-none';

/**
 * Animation utility applied to the indicator when the value is indeterminate.
 * The indeterminate slide is a CLASS (its keyframes live in the compiled
 * utility sheet), not a projected attribute -- composed here, painted by the
 * decorator's className.
 */
export const progressIndeterminateClasses =
  'animate-progress-indeterminate motion-reduce:animate-none';

export const progressVariantClasses: Record<ProgressVariant, string> = {
  default: 'bg-primary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  accent: 'bg-accent',
};

export const progressSizeClasses: Record<ProgressSize, string> = {
  sm: 'h-1',
  default: 'h-2',
  lg: 'h-3',
};

export interface ProgressClassSet {
  root: string;
  indicator: string;
}

export function progressClasses(config: ProgressConfig, _state: ProgressState): ProgressClassSet {
  const size = config.size ?? 'default';
  const variant = config.variant ?? 'default';
  const { indeterminate } = resolveProgress(config);

  const root = [progressContainerClasses, progressSizeClasses[size]].filter(Boolean).join(' ');
  const indicator = [
    progressIndicatorBaseClasses,
    progressVariantClasses[variant],
    indeterminate ? progressIndeterminateClasses : '',
  ]
    .filter(Boolean)
    .join(' ');

  return { root, indicator };
}
