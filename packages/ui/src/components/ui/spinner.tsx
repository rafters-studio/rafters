/**
 * Spinning loading indicator for active operations
 *
 * @cognitive-load 2/10 - Simple activity indicator, brief attention capture
 * @attention-economics Activity feedback: indicates system is working, maintains user confidence
 * @trust-building Immediate feedback that action is processing, prevents double-submission anxiety
 * @accessibility aria-label for screen readers, motion-reduce respects preferences, sr-only text
 * @semantic-meaning Processing state: indeterminate loading for actions without progress measurement
 *
 * @usage-patterns
 * DO: Use for button loading states
 * DO: Use for inline loading indicators
 * DO: Size appropriately for context (sm for buttons, lg for page loading)
 * DO: Combine with text feedback for longer operations
 * NEVER: Use for content loading (use Skeleton instead), use without accessible label
 *
 * @example
 * ```tsx
 * // Button loading state
 * <Button disabled>
 *   <Spinner size="sm" />
 *   Saving...
 * </Button>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';

export interface SpinnerProps extends React.HTMLAttributes<HTMLOutputElement> {
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'accent'
    | 'muted';
}

// Variant classes for spinner color
const variantClasses: Record<string, string> = {
  default: 'border-primary border-r-transparent',
  primary: 'border-primary border-r-transparent',
  secondary: 'border-secondary border-r-transparent',
  destructive: 'border-destructive border-r-transparent',
  success: 'border-success border-r-transparent',
  warning: 'border-warning border-r-transparent',
  info: 'border-info border-r-transparent',
  accent: 'border-accent border-r-transparent',
  muted: 'border-muted-foreground border-r-transparent',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4 border-2',
  default: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

export const Spinner = React.forwardRef<HTMLOutputElement, SpinnerProps>(
  ({ className, size = 'default', variant = 'default', ...props }, ref) => {
    const baseClasses = 'inline-block rounded-full animate-spin motion-reduce:animate-none';

    const classes = classy(
      baseClasses,
      sizeClasses[size] ?? sizeClasses.default,
      variantClasses[variant] ?? variantClasses.default,
      className,
    );

    return (
      <output ref={ref} aria-label="Loading" className={classes} {...props}>
        <span className="sr-only">Loading</span>
      </output>
    );
  },
);

Spinner.displayName = 'Spinner';
