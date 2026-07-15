/**
 * Custom-styled scrollable container with consistent cross-browser appearance
 *
 * @cognitive-load 2/10 - Transparent utility that enhances without demanding attention
 * @attention-economics Invisible enhancement: Scrollbars should guide without distracting
 * @trust-building Consistent scroll behavior builds familiarity; never hijack expected scroll patterns
 * @accessibility Preserve native keyboard scrolling; don't hide scrollbars entirely
 * @semantic-meaning Constrained viewport for overflow content; use when content exceeds container
 *
 * @usage-patterns
 * DO: Use for fixed-height containers with overflow content
 * DO: Use for sidebars, dropdowns, and modal content
 * DO: Preserve native scroll feel (momentum, keyboard)
 * DO: Make scrollbar visible when content overflows
 * NEVER: Use JavaScript scroll hijacking
 * NEVER: Hide scrollbars completely (a11y issue)
 * NEVER: Override native scroll physics
 *
 * @example
 * ```tsx
 * // Vertical scroll area
 * <ScrollArea className="h-72 w-48 rounded-md border">
 *   <div className="p-4">
 *     {items.map(item => (
 *       <div key={item.id}>{item.name}</div>
 *     ))}
 *   </div>
 * </ScrollArea>
 *
 * // Horizontal scroll area
 * <ScrollArea orientation="horizontal" className="w-96 whitespace-nowrap">
 *   <div className="flex gap-4 p-4">
 *     {images.map(img => (
 *       <img key={img.id} src={img.src} className="w-40" />
 *     ))}
 *   </div>
 * </ScrollArea>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  scrollAreaBaseClasses,
  scrollAreaOrientationClasses,
  scrollAreaScrollbarBaseClasses,
  scrollBarBaseClasses,
  scrollBarOrientationClasses,
  scrollBarThumbClasses,
} from './scroll-area.classes';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Scroll direction: vertical, horizontal, or both */
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Scrollbar orientation */
  orientation?: 'vertical' | 'horizontal';
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={classy(
          scrollAreaBaseClasses,
          scrollAreaScrollbarBaseClasses,
          scrollAreaOrientationClasses[orientation],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ScrollArea.displayName = 'ScrollArea';

/**
 * Decorative scrollbar track component for custom scrollbar implementations
 *
 * Note: This component is provided for cases where CSS-only scrollbar styling
 * is insufficient. Prefer using ScrollArea with native CSS scrollbar styling.
 */
export const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={classy(
          scrollBarBaseClasses,
          scrollBarOrientationClasses[orientation],
          className,
        )}
        {...props}
      >
        <div className={scrollBarThumbClasses} />
      </div>
    );
  },
);

ScrollBar.displayName = 'ScrollBar';
