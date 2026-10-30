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
 *
 * @dependencies react
 * @primitives classy
 * @lib contract
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import type { PartIds } from '../../lib/contract';
import { badge, type BadgePart, type BadgeSize, type BadgeVariant } from './badge.behavior';
import { badgeClasses } from './badge.classes';

export { badgeVariants } from './badge.classes';

/**
 * Small label chip. Displays a short status/count label inline.
 *
 * @cognitive-load 2/10 - decision 0, information 1, interaction 0,
 * disruption 0, learning 1. Display only: one label to read, no decision,
 * no interaction, no context disruption. Color-coding conventions
 * (destructive=red, success=green) are the sole learning cost.
 * @attention-economics Secondary/tertiary support: at most one
 * high-attention badge (destructive/warning) per section; subtle variants
 * (muted/outline/ghost) are unlimited.
 * @trust-building Low-trust informational display. Never a primary action
 * surface -- a badge announces state, it does not gate it.
 * @accessibility The label text is the entire accessible payload; no role
 * is projected. Multi-sensory communication (color + text, never color
 * alone) is a designer-vocabulary property of the variant classes, not a
 * behavior of this component.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant. Oracle's full vocabulary (contract, boundary 9). */
  variant?: BadgeVariant;
  /** Exactly one `bg-fill-*` token; it replaces the surface. */
  fill?: string;
  /** A surface name; its `bg-surface-*` class replaces the base surface. */
  surface?: string;
  size?: BadgeSize;
  /** Decorative icon before the label (after it on a right-to-left page). Hidden from assistive technology. */
  startIcon?: React.ReactNode;
  /** Decorative icon after the label (before it on a right-to-left page). Hidden from assistive technology. */
  endIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant, size = 'default', fill, surface, className, startIcon, endIcon, children, ...props },
    ref,
  ) => {
    const classes = badgeClasses({ variant, size, fill, surface }, {});
    const uid = React.useId();
    const ids = {} as PartIds<BadgePart>;
    for (const part of Object.keys(badge.parts) as BadgePart[]) ids[part] = `${uid}-${part}`;
    const aria = badge.aria({}, { variant, size }, ids);

    return (
      <span
        ref={ref}
        data-part="root"
        data-slot="badge"
        className={classy(classes.root, className)}
        {...props}
      >
        {startIcon != null && startIcon !== false ? (
          <span
            data-part="startIcon"
            data-icon="inline-start"
            id={ids.startIcon}
            className={classes.startIcon}
            {...aria.startIcon}
          >
            {startIcon}
          </span>
        ) : null}
        {children}
        {endIcon != null && endIcon !== false ? (
          <span
            data-part="endIcon"
            data-icon="inline-end"
            id={ids.endIcon}
            className={classes.endIcon}
            {...aria.endIcon}
          >
            {endIcon}
          </span>
        ) : null}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export default Badge;
