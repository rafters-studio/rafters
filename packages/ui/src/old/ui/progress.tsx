/**
 * Progress indicator for task completion status
 *
 * @cognitive-load 4/10 - Moderate attention required for progress monitoring
 * @attention-economics Temporal attention: Holds user attention during wait states with clear progress indication
 * @trust-building Accurate progress builds user confidence; clear completion states and next steps
 * @accessibility Screen reader announcements via native progress element; keyboard navigation not applicable
 * @semantic-meaning Progress communication: determinate=known duration with value, indeterminate=unknown duration
 *
 * @usage-patterns
 * DO: Provide accurate progress indication when possible
 * DO: Use indeterminate for unknown durations
 * DO: Show clear completion states
 * DO: Include value labels for complex operations
 * NEVER: Fake progress (inaccurate progress bars)
 * NEVER: Use for instant operations (< 1 second)
 * NEVER: Leave progress at 99% indefinitely
 *
 * @example
 * ```tsx
 * // Determinate progress
 * <Progress value={66} />
 *
 * // With custom label
 * <Progress
 *   value={3}
 *   max={10}
 *   getValueLabel={(value, max) => `${value} of ${max} files uploaded`}
 * />
 *
 * // Indeterminate (loading)
 * <Progress />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  progressContainerClasses,
  progressIndicatorBaseClasses,
  progressSizeClasses,
  progressVariantClasses,
} from './progress.classes';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current progress value (0 to max). Undefined = indeterminate state. */
  value?: number;
  /** Maximum value. Default 100. */
  max?: number;
  /** Callback to generate accessible value text. */
  getValueLabel?: (value: number, max: number) => string;
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'accent';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

function defaultValueLabel(value: number, max: number): string {
  return `${Math.round((value / max) * 100)}%`;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      getValueLabel,
      variant = 'default',
      size = 'default',
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      ...props
    },
    ref,
  ) => {
    const isIndeterminate = value === undefined;
    const clampedValue = isIndeterminate ? 0 : Math.min(Math.max(value, 0), max);
    const percentage = (clampedValue / max) * 100;

    const valueLabel = isIndeterminate
      ? undefined
      : getValueLabel
        ? getValueLabel(clampedValue, max)
        : defaultValueLabel(clampedValue, max);

    const s = progressSizeClasses[size] ?? progressSizeClasses.default;
    const v = progressVariantClasses[variant] ?? progressVariantClasses.default;

    const containerClasses = classy(progressContainerClasses, s, className);

    const indicatorClasses = classy(
      progressIndicatorBaseClasses,
      v,
      isIndeterminate && 'animate-progress-indeterminate motion-reduce:animate-none',
    );

    return (
      <div
        ref={ref}
        className={containerClasses}
        aria-busy={isIndeterminate ? 'true' : undefined}
        {...props}
      >
        {/* Native progress element for screen reader accessibility */}
        <progress
          className="sr-only"
          value={isIndeterminate ? undefined : clampedValue}
          max={max}
          aria-valuenow={isIndeterminate ? undefined : clampedValue}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={valueLabel}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
        >
          {valueLabel}
        </progress>

        {/* Visual indicator */}
        <div
          className={indicatorClasses}
          style={isIndeterminate ? undefined : { width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    );
  },
);

Progress.displayName = 'Progress';

export default Progress;
