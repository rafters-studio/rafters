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
import { skeleton, type SkeletonConfig } from './skeleton.behavior';
import { skeletonClasses } from './skeleton.classes';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    const config: SkeletonConfig = {};
    const classes = skeletonClasses(config, {});

    // A static score: aria-hidden is a constant, no state, no ids, no effects.
    // Classes + the constant aria projection out -- the alert/card shape, no
    // useBehavior. The projection ignores ids, so pass an empty one.
    const { root: aria } = skeleton.aria({}, config, { root: '' });

    return (
      <div
        ref={ref}
        data-part="root"
        data-slot="skeleton"
        className={classy(classes.root, className)}
        {...aria}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
