/**
 * Semantic container component for layout structure and content boundaries
 *
 * @cognitive-load 0/10 - Invisible structure that reduces visual complexity
 * @attention-economics Neutral structural element: Controls content width and breathing room without competing for attention
 * @trust-building Predictable boundaries and consistent spacing patterns
 * @accessibility Semantic HTML elements with proper landmark roles for screen readers
 * @semantic-meaning Element-driven behavior: main=primary landmark, section=structural grouping, article=readable content with typography, aside=supplementary, div=no semantics
 *
 * @usage-patterns
 * DO: Use main for the primary content area (once per page)
 * DO: Use section for structural grouping within grids
 * DO: Use article for readable content - typography is automatic
 * DO: Use aside for supplementary content, add surface classes for depth
 * DO: Spacing happens inside (padding), not outside (no margins)
 * NEVER: Nest containers unnecessarily
 * NEVER: Use margins for spacing - let parent Grid handle gaps
 * NEVER: Use @container without w-full in flex/grid contexts (causes width collapse in Tailwind v4)
 *
 * @example
 * ```tsx
 * <Container as="main" size="6xl" padding="6">
 *   <Container as="article">
 *     <h1>Title</h1>
 *     <p>Typography just works.</p>
 *   </Container>
 * </Container>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  type ContainerBackground,
  containerArticleTypography,
  containerBackgroundClasses,
  containerGapClasses,
  containerPaddingClasses,
  containerSizeClasses,
  containerSizeGapScale,
} from './container.classes';

type ContainerElement = 'div' | 'main' | 'section' | 'article' | 'aside';

export type { ContainerBackground } from './container.classes';

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /** Semantic element - determines behavior and accessibility role */
  as?: ContainerElement;

  /**
   * Max-width constraint using Tailwind sizing
   * @default 'full' for main, undefined for others
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

  /**
   * Internal padding using Tailwind spacing scale
   * Spacing happens inside containers, not via margins
   */
  padding?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24';

  /**
   * Vertical flow gap between children.
   * When true, derives gap from size by walking the spacing scale positions.
   * When a spacing value, overrides the size-derived default.
   * Applies flex flex-col gap-{n} to create a vertical stack.
   */
  gap?: boolean | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24';

  /**
   * Enable container queries on this element
   * Children can use @container queries to respond to this container's size
   * @default true
   */
  query?: boolean;

  /**
   * Container query name for targeted queries
   * Use with @container/name in child styles
   */
  queryName?: string;

  // ============================================================================
  // Editable Props (R-202)
  // ============================================================================

  /**
   * Enable editing mode for block editor
   * Shows dashed outline and enables drop zone
   */
  editable?: boolean | undefined;

  /**
   * Background color preset
   * Allowed presets: 'none', 'muted', 'accent', 'card'
   */
  background?: ContainerBackground | undefined;

  /**
   * Show drop zone indicator for child blocks
   * Displays placeholder when container is empty in edit mode
   */
  showDropZone?: boolean | undefined;

  /**
   * Called when background changes in edit mode
   */
  onBackgroundChange?: ((background: ContainerBackground) => void) | undefined;
}

const sizeClasses = containerSizeClasses;
const paddingClasses = containerPaddingClasses;
const gapClasses = containerGapClasses;

/**
 * Size-to-gap mapping: walks through the spacing scale positions
 * from the component-padding tier (3-4) into the section-padding tier (5-12).
 * These are spacing SCALE POSITIONS, not pixel values -- Tailwind v4 resolves
 * gap-N to calc(var(--spacing) * N), so actual values track the design system's
 * baseSpacingUnit automatically.
 */
const sizeGapScale = containerSizeGapScale;
const articleTypography = containerArticleTypography;
const backgroundClasses = containerBackgroundClasses;

/**
 * Drop zone placeholder for empty containers in edit mode
 */
function DropZonePlaceholder() {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-4 text-muted-foreground">
      <span className="text-sm">Drop blocks here</span>
    </div>
  );
}

export const Container = React.forwardRef<HTMLElement, ContainerProps>(
  (
    {
      as: Element = 'div',
      size,
      padding,
      gap,
      query = true,
      queryName,
      editable,
      background,
      showDropZone,
      onBackgroundChange: _onBackgroundChange,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    // TODO: Implement background picker UI that calls _onBackgroundChange
    void _onBackgroundChange;

    const isArticle = Element === 'article';
    const isEmpty = React.Children.count(children) === 0;

    const resolvedGap = gap === true ? (size && sizeGapScale[size]) || '6' : gap || undefined;

    const classes = classy(
      // Container queries - w-full prevents width collapse when container-type: inline-size
      // is applied to flex/grid children (Tailwind v4 behavior)
      query && '@container w-full',

      // Size constraint
      size && sizeClasses[size],

      // Centering for sized containers
      size && size !== 'full' && 'mx-auto',

      // Padding
      padding && paddingClasses[padding],

      // Vertical flow with gap
      resolvedGap && gapClasses[resolvedGap],

      // Background (R-202)
      background && backgroundClasses[background],

      // Article gets typography
      isArticle && articleTypography,

      // Editable mode styling (R-202)
      editable && 'outline-2 outline-dashed outline-muted-foreground/30 outline-offset-2 rounded',

      // User classes
      className,
    );

    // Container query name via style
    const containerStyle: React.CSSProperties = {
      ...style,
      ...(queryName && { containerName: queryName }),
    };

    // Determine content to render
    const content = editable && showDropZone && isEmpty ? <DropZonePlaceholder /> : children;

    return React.createElement(
      Element,
      {
        ref,
        className: classes || undefined,
        style: Object.keys(containerStyle).length > 0 ? containerStyle : undefined,
        'data-editable': editable || undefined,
        'data-background': background || undefined,
        ...props,
      },
      content,
    );
  },
);

Container.displayName = 'Container';

export default Container;
