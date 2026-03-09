/**
 * Skeleton loading placeholder component for content that is loading
 *
 * @cognitive-load 1/10 - Passive placeholder, reduces uncertainty during loading
 * @attention-economics Loading indicator: maintains layout stability, reduces perceived wait time
 * @trust-building Visual feedback that content is loading, reduces uncertainty anxiety
 * @accessibility motion-reduce respects prefers-reduced-motion, aria-hidden since decorative
 * @semantic-meaning Loading state: represents content shape while data is being fetched
 *
 * @usage-patterns
 * DO: Match skeleton shape to expected content (text lines, images, cards)
 * DO: Use multiple skeletons to represent list items
 * DO: Maintain consistent sizing with actual content
 * DO: Respect prefers-reduced-motion for animation
 * NEVER: Use for interactive elements, use for indefinite loading states
 *
 * @example
 * ```tsx
 * // Text skeleton
 * <Skeleton className="h-4 w-48" />
 *
 * // Avatar skeleton
 * <Skeleton className="h-12 w-12 rounded-full" />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md - uses subtle backgrounds */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'muted'
    | 'accent';
}

// Variant classes using subtle backgrounds for skeleton states
const variantClasses: Record<string, string> = {
  default: 'bg-muted',
  primary: 'bg-primary-subtle',
  secondary: 'bg-secondary-subtle',
  destructive: 'bg-destructive-subtle',
  success: 'bg-success-subtle',
  warning: 'bg-warning-subtle',
  info: 'bg-info-subtle',
  muted: 'bg-muted',
  accent: 'bg-accent-subtle',
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={classy(
          'rounded-md animate-pulse motion-reduce:animate-none',
          variantClasses[variant] ?? variantClasses.default,
          className,
        )}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
