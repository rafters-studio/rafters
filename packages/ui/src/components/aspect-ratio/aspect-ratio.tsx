/**
 * AspectRatio -- the React performance of the static AspectRatio score.
 *
 * A static score has nothing to subscribe to: this performance is pure
 * decoration application. No useBehavior, no memory -- config in, classes out,
 * and the resolved `ratio` painted through the one inline style channel (an
 * arbitrary aspect-ratio value cannot be a literal utility class).
 *
 * @cognitive-load 1/10 -- Invisible layout utility with no cognitive overhead;
 * an author sets a proportion and forgets it. (matrix: score 1)
 * @attention-economics Structural element. Reserves space before content loads,
 * so nothing competes for attention by shifting the layout out from under it.
 * @trust-building Consistent proportions prevent jarring layout shifts during
 * loading -- the box holds while an image or embed streams in.
 * @accessibility Layout utility only; it projects no ARIA. The content inside
 * (image, iframe, video) carries its own accessible name and role.
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { type AspectRatioConfig, resolveRatio } from './aspect-ratio.behavior';
import { aspectRatioClasses } from './aspect-ratio.classes';

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width divided by height (e.g. 16 / 9 = 1.778). Defaults to 1 (square). */
  ratio?: number;
}

export const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 1, className, style, children, ...props }, ref) => {
    const config: AspectRatioConfig = { ratio };
    const classes = aspectRatioClasses(config, {});

    // The one style channel: the ratio is data-driven, so it rides inline
    // (aspectRatio is unitless in React, serialised as `aspect-ratio: 1.777`).
    const ratioStyle: React.CSSProperties = { ...style, aspectRatio: resolveRatio(config) };

    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(classes.root, className) || undefined}
        style={ratioStyle}
        {...props}
      >
        {children}
      </div>
    );
  },
);

AspectRatio.displayName = 'AspectRatio';

export default AspectRatio;
