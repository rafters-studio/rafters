/**
 * Semantic container component for layout structure and content boundaries
 *
 * @cognitive-load 0/10 - Invisible structure that reduces visual complexity
 * @attention-economics Neutral structural element: Controls content width and breathing room without competing for attention
 * @trust-building Predictable boundaries and consistent spacing patterns
 * @accessibility Semantic HTML elements with proper landmark roles for screen readers
 * @semantic-meaning Element-driven behavior: main=primary landmark, header=page/section header, footer=page/section footer, section=structural grouping, article=readable content with typography, aside=supplementary, div=no semantics
 *
 * @usage-patterns
 * DO: Use main for the primary content area (once per page)
 * DO: Use header with position="sticky" and depth="navigation" for site headers
 * DO: Use footer for page or section footers
 * DO: Use section for structural grouping within grids
 * DO: Use article for readable content - typography is automatic
 * DO: Use aside for supplementary content, add surface classes for depth
 * DO: Spacing happens inside (padding), not outside (no margins)
 * NEVER: Nest containers unnecessarily
 * NEVER: Use margins for spacing - let parent Grid handle gaps
 * NEVER: Use @container without w-full in flex/grid contexts (causes width collapse in Tailwind v4)
 * NEVER: Write raw sticky/fixed/z-* utilities -- use position and depth props
 *
 * @example
 * ```tsx
 * <Container as="header" position="sticky" depth="navigation" fill="background" size="full" padding="4">
 *   <nav>Site navigation</nav>
 * </Container>
 * <Container as="main" size="6xl" padding="6">
 *   <Container as="article">
 *     <h1>Title</h1>
 *     <p>Typography just works.</p>
 *   </Container>
 * </Container>
 * <Container as="footer" padding="6">
 *   <p>Footer content</p>
 * </Container>
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import { resolveFillName } from '../../primitives/fill-resolver';
import {
  type ContainerBackground,
  type ContainerDepth,
  type ContainerPosition,
  containerArticleTypography,
  containerAutoEdgePadding,
  containerBackgroundClasses,
  containerDepthClasses,
  containerGapClasses,
  containerPaddingClasses,
  containerPositionClasses,
  containerSizeClasses,
  containerSizeGapScale,
} from './container.classes';

type ContainerElement = 'div' | 'main' | 'header' | 'footer' | 'section' | 'article' | 'aside';

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
   * CSS position behavior.
   * Use with depth for stacking: position="sticky" depth="navigation"
   */
  position?: ContainerPosition | undefined;

  /**
   * Stacking depth from the design system's z-depth scale.
   * Pass-through to z-depth-* utilities so agents never write raw z-index.
   */
  depth?: ContainerDepth | undefined;

  /**
   * Enable editing mode for block editor
   * Shows dashed outline and enables drop zone
   */
  editable?: boolean | undefined;

  /**
   * Background color preset (legacy enum)
   * Allowed presets: 'none', 'muted', 'accent', 'card', 'primary'
   * @deprecated Prefer the `fill` prop -- a signature over the color
   * vocabulary with Tailwind's slash-opacity and two-stop gradients.
   */
  background?: ContainerBackground | undefined;

  /**
   * Fill signature over the color vocabulary (#1637):
   * `word` (solid -- role words pair their foreground: fill="primary"),
   * `word/alpha` (Tailwind slash-opacity: fill="muted/50"),
   * `word-to-word` (two-stop gradient: fill="primary-to-primary/0").
   * Words are roles, families, or family-positions; invalid signatures
   * resolve to nothing. Blur, blend, and direction are not fill's job --
   * they are plain Tailwind utilities. Takes precedence over `background`.
   */
  fill?: string | undefined;

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
      position,
      depth,
      editable,
      background,
      fill,
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

    // Fill wins over background when both are set -- fill is the endorsed
    // path and should replace the legacy enum without breaking existing markup.
    const fillClasses = fill ? resolveFillName(fill, 'surface') : '';

    const classes = classy(
      // Container queries - w-full prevents width collapse when container-type: inline-size
      // is applied to flex/grid children (Tailwind v4 behavior)
      query && '@container w-full',

      // Size constraint
      size && sizeClasses[size],

      // Centering for sized containers
      size && size !== 'full' && 'mx-auto',

      // Padding -- explicit prop overrides, otherwise CQ-responsive edge padding for sized containers
      padding ? paddingClasses[padding] : size && size !== 'full' && containerAutoEdgePadding,

      // Vertical flow with gap
      resolvedGap && gapClasses[resolvedGap],

      // Fill signature (surface context) takes precedence over legacy background
      fillClasses,

      // Background (R-202) -- legacy prop, suppressed only when the fill
      // actually resolved (an invalid fill must not strand the surface
      // with no background at all)
      !fillClasses && background && backgroundClasses[background],

      // Position
      position && containerPositionClasses[position],

      // Depth (z-index from the design system scale)
      depth && containerDepthClasses[depth],

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
        'data-fill': fill || undefined,
        ...props,
      },
      content,
    );
  },
);

Container.displayName = 'Container';

export default Container;
