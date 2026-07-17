/**
 * ScrollArea -- a custom-styled scroll container with consistent cross-browser
 * scrollbar appearance over native overflow. Compose content directly inside;
 * an optional decorative ScrollBar is available for cases where CSS-only
 * scrollbar styling is insufficient. Native scroll (momentum, keyboard, focus
 * order) is never hijacked -- the score only decorates.
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Invisible enhancement: the scrollbar guides without
 * distracting. A scroll surface never announces itself; the content it frames
 * drives attention. Never hijack the expected scroll pattern.
 * @trust-building Consistent, native scroll behaviour builds familiarity --
 * momentum, keyboard scrolling, and focus order stay the browser's. Predictable
 * boundaries, no surprise interactivity: a scroll surface is a viewport, not a
 * control.
 * @accessibility Native keyboard scrolling is preserved untouched; scrollbars
 * are styled, never hidden (hiding them entirely is an accessibility defect).
 * The surface projects no ARIA -- semantics come from the content inside.
 * @semantic-meaning Constrained viewport for overflow content: use when content
 * exceeds a fixed-size container (sidebars, dropdowns, modal bodies).
 *
 * A pure static score has nothing to subscribe to: this performance is pure
 * decoration application. No useBehavior, no memory, no bind -- config in,
 * classes out, children through.
 *
 * @example
 * ```tsx
 * // Vertical scroll area
 * <ScrollArea className="h-72 w-48 rounded-md border">
 *   <div className="p-4">
 *     {items.map((item) => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *   </div>
 * </ScrollArea>
 *
 * // Horizontal scroll area
 * <ScrollArea orientation="horizontal" className="w-96 whitespace-nowrap">
 *   <div className="flex gap-4 p-4">
 *     {images.map((img) => (
 *       <img key={img.id} src={img.src} className="w-40" alt={img.alt} />
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import type {
  ScrollAreaConfig,
  ScrollAreaOrientation,
  ScrollBarOrientation,
} from './scroll-area.behavior';
import { scrollAreaClasses, scrollBarClasses } from './scroll-area.classes';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Scroll direction: vertical (default), horizontal, or both. */
  orientation?: ScrollAreaOrientation;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    const config: ScrollAreaConfig = { orientation };
    const classes = scrollAreaClasses(config, {});

    // No effects and no optional parts -- nothing ever calls getPart, so the
    // ref is a plain forward. The score projects nothing, so there is no aria
    // to spread; native scroll is the whole contract.
    return (
      <div
        ref={ref}
        data-part="root"
        className={classy(classes.root, className) || undefined}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ScrollArea.displayName = 'ScrollArea';

export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Scrollbar orientation. Default vertical. */
  orientation?: ScrollBarOrientation;
}

/**
 * Decorative scrollbar track for custom-scrollbar implementations (shadcn's
 * ScrollBar surface). Prefer ScrollArea's native CSS scrollbar styling; reach
 * for this only when CSS-only styling is insufficient. Carries no behaviour --
 * a plain wrapper over the shared class strings, not a declared part.
 */
export const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    const classes = scrollBarClasses(orientation);
    return (
      <div
        ref={ref}
        data-slot="scroll-bar"
        data-orientation={orientation}
        className={classy(classes.bar, className)}
        {...props}
      >
        <div data-slot="scroll-thumb" className={classes.thumb} />
      </div>
    );
  },
);

ScrollBar.displayName = 'ScrollBar';

export default ScrollArea;
