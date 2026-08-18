/**
 * Proportional container that maintains aspect ratio regardless of width
 *
 * @cognitive-load 1/10 - Invisible layout utility with no cognitive overhead
 * @attention-economics Structural element: Prevents layout shift, maintains visual consistency
 * @trust-building Consistent proportions prevent jarring layout shifts during loading
 * @accessibility Layout utility - content inside maintains its own accessibility
 * @semantic-meaning Ratio contexts: 1=avatars/icons, 4/3=photos, 16/9=video, custom=brand-specific
 *
 * @usage-patterns
 * DO: Use for images/videos to prevent layout shift
 * DO: Use for card thumbnails for consistent grids
 * DO: Use 16/9 for video embeds
 * DO: Use 1 (square) for avatar containers
 * NEVER: Use for text content
 * NEVER: Use when natural dimensions are acceptable
 * NEVER: Force awkward ratios on content
 *
 * @example
 * ```tsx
 * // 16:9 video container
 * <AspectRatio ratio={16 / 9}>
 *   <iframe src="https://youtube.com/embed/..." />
 * </AspectRatio>
 *
 * // Square image
 * <AspectRatio ratio={1}>
 *   <img src="/photo.jpg" alt="Photo" className="object-cover" />
 * </AspectRatio>
 *
 * // 4:3 thumbnail
 * <AspectRatio ratio={4 / 3}>
 *   <img src="/thumb.jpg" alt="Thumbnail" className="object-cover" />
 * </AspectRatio>
 * ```
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
