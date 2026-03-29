/**
 * Status badge component with multi-sensory communication patterns
 *
 * @cognitive-load 2/10 - Optimized for peripheral scanning with minimal cognitive overhead
 * @attention-economics Secondary/tertiary support: Maximum 1 high-attention badge per section, unlimited subtle badges
 * @trust-building Low trust informational display with optional interaction patterns
 * @accessibility Multi-sensory communication: Color + Icon + Text + Pattern prevents single-point accessibility failure
 * @semantic-meaning Status communication with semantic variants: success=completion, warning=caution, error=problems, info=neutral information
 *
 * @usage-patterns
 * DO: Use for status indicators with multi-sensory communication
 * DO: Navigation badges for notification counts and sidebar status
 * DO: Category labels with semantic meaning over arbitrary colors
 * DO: Interactive badges with enhanced touch targets for removal/expansion
 * NEVER: Primary actions, complex information, critical alerts requiring immediate action
 *
 * @example
 * ```tsx
 * // Status badge with semantic meaning
 * <Badge variant="success">Completed</Badge>
 *
 * // Warning indicator
 * <Badge variant="warning">Pending Review</Badge>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { badgeBaseClasses, badgeSizeClasses, badgeVariantClasses } from './badge.classes';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'muted'
    | 'accent'
    | 'outline'
    | 'ghost'
    | 'link';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const classes = classy(
      badgeBaseClasses,
      badgeVariantClasses[variant] ?? badgeVariantClasses.default,
      badgeSizeClasses[size] ?? badgeSizeClasses.default,
      className,
    );

    return <span ref={ref} className={classes} {...props} />;
  },
);

Badge.displayName = 'Badge';
