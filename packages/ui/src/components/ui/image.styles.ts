/**
 * Shadow DOM style definitions for Image web component
 *
 * Parallel to image.classes.ts. Same semantic structure for the static
 * display path (figure + img + optional figcaption), CSS property maps
 * instead of Tailwind class strings.
 *
 * Scope is reduced relative to the React target: the WC covers the static
 * display surface only. Upload/drag-drop/paste handlers, loading and error
 * overlays, the alignment toolbar, and the contentEditable caption are
 * React-only concerns and do NOT appear in this file.
 *
 * All token references go through tokenVar(); no raw var() literals appear
 * outside the classy-wc primitives. Motion tokens use --motion-duration-*
 * / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { pick, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

/**
 * Token-based image size presets. Matches image.tsx / image.classes.ts.
 *
 * Unknown values fall back to 'full' silently at the stylesheet boundary
 * (never throw).
 */
export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

/**
 * Horizontal alignment options for the figure. Matches image.tsx /
 * image.classes.ts.
 *
 * Unknown values fall back to 'center' silently at the stylesheet
 * boundary (never throw).
 */
export type ImageAlignment = 'left' | 'center' | 'right';

// ============================================================================
// Size Map
// ============================================================================

/**
 * Image size preset to max-width value. Values mirror the Tailwind
 * `max-w-*` scale consumed by image.classes.ts:
 *   xs  -> 20rem, sm  -> 24rem, md  -> 28rem, lg  -> 32rem,
 *   xl  -> 36rem, 2xl -> 42rem, full -> 100%
 */
export const imageSizeValues: Record<ImageSize, string> = {
  xs: '20rem',
  sm: '24rem',
  md: '28rem',
  lg: '32rem',
  xl: '36rem',
  '2xl': '42rem',
  full: '100%',
};

// ============================================================================
// Alignment Map
// ============================================================================

/**
 * Horizontal alignment rules expressed as auto-margin CSS properties.
 * Mirrors the Tailwind `mr-auto` / `mx-auto` / `ml-auto` utilities from
 * image.classes.ts.
 */
export const imageAlignmentStyles: Record<ImageAlignment, CSSProperties> = {
  left: {
    'margin-left': '0',
    'margin-right': 'auto',
  },
  center: {
    'margin-left': 'auto',
    'margin-right': 'auto',
  },
  right: {
    'margin-left': 'auto',
    'margin-right': '0',
  },
};

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Outer `<figure>` base. Mirrors imageBaseClasses + responsive width.
 * The `max-width` declaration is filled in per-instance by imageStylesheet()
 * based on the resolved size. The `margin` pair is filled in from
 * imageAlignmentStyles.
 */
export const imageFigureBase: CSSProperties = {
  position: 'relative',
  'border-width': '0',
  'border-style': 'solid',
  'border-color': 'transparent',
  'margin-top': '0',
  'margin-bottom': '0',
};

/**
 * Inner `<img>` element. Mirrors imageImgClasses:
 *   "block w-full h-auto"
 *
 * A rounded corner on the image wrapper would require an extra DOM node;
 * the React target wraps the img in a `relative overflow-hidden rounded-lg`
 * div to enable that. The WC omits the wrapper div to keep the DOM minimal
 * for the static display path.
 */
export const imageImgBase: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
  'border-radius': tokenVar('radius-lg'),
};

/**
 * Optional `<figcaption>`. Mirrors imageCaptionClasses:
 *   "mt-2 text-center text-sm text-muted-foreground"
 */
export const imageCaptionBase: CSSProperties = {
  'margin-top': '0.5rem',
  'text-align': 'center',
  'font-size': tokenVar('font-size-label-small'),
  color: tokenVar('color-muted-foreground'),
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface ImageStylesheetOptions {
  size?: ImageSize | undefined;
  alignment?: ImageAlignment | undefined;
}

/**
 * Build the complete image stylesheet for a given configuration.
 *
 * Unknown size keys fall back to 'full' silently; unknown alignment keys
 * fall back to 'center' silently. Never throws. Emits:
 *   - `:host` block layout so the figure resolves its own max-width
 *   - `.image` figure wrapper with the resolved max-width and alignment
 *     auto-margins
 *   - `.image img` inner image scaling
 *   - `.image-caption` caption text styling
 */
export function imageStylesheet(options: ImageStylesheetOptions = {}): string {
  const { size, alignment } = options;

  return stylesheet(
    styleRule(':host', { display: 'block', width: '100%' }),

    styleRule(
      '.image',
      imageFigureBase,
      {
        'max-width': pickSize(size),
      },
      pick(imageAlignmentStyles, alignment, 'center'),
    ),

    styleRule('.image img', imageImgBase),

    styleRule('.image-caption', imageCaptionBase),
  );
}

/**
 * Resolve a size input into its CSS max-width value. Unknown keys fall
 * back to 'full' silently. Never throws.
 */
function pickSize(key: ImageSize | undefined): string {
  if (key && key in imageSizeValues) return imageSizeValues[key];
  return imageSizeValues.full;
}
