/**
 * Skeleton -- a loading placeholder that reserves layout while content loads.
 * A shimmer in the shape of the content to come; sized and shaped by the
 * consumer through `className` (`h-4 w-48`, `h-12 w-12 rounded-full`, ...), the
 * shadcn drop-in surface. Decorative by contract: it is hidden from assistive
 * technology, so a screen reader hears the real content, never the placeholder.
 *
 * @cognitive-load 1/10 - decision 0, info 1, interaction 0, disruption 0, learning 0
 * @attention-economics A loading indicator that reduces perceived wait by
 * holding the layout stable: the eye stays where the content will land instead
 * of watching it reflow in. It must never demand attention -- it is a quiet
 * promise that content is coming, not an event. Reserve it for genuinely
 * pending content; a skeleton over an empty state reads as a broken load.
 * @trust-building Honest feedback that content is loading reduces uncertainty
 * anxiety; matching the skeleton's shape to the real content keeps the promise,
 * and holding the layout means nothing jumps when the content arrives.
 * @accessibility Purely decorative: the root carries a constant
 * `aria-hidden="true"` so the placeholder is absent from the accessibility tree
 * (a screen reader reads the real content, not the shimmer). The pulse honours
 * `prefers-reduced-motion` via `motion-reduce:animate-none`.
 *
 * A static score has nothing to subscribe to: this performance is pure
 * decoration application. No useBehavior, no memory, no bind -- classes and the
 * constant aria projection out, and -- because Skeleton is a decorative LEAF --
 * no slot and no children.
 *
 * @example
 * ```tsx
 * // Text line placeholder
 * <Skeleton className="h-4 w-48" />
 *
 * // Avatar placeholder
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
