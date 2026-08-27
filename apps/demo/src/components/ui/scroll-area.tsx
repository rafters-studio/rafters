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
import classy from '@/lib/primitives/classy';
import type {
  ScrollAreaConfig,
  ScrollAreaOrientation,
  ScrollBarOrientation,
} from '@/components/ui/scroll-area.behavior';
import { scrollAreaClasses, scrollBarClasses } from '@/components/ui/scroll-area.classes';

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
