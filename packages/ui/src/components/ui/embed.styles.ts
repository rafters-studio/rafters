/**
 * Shadow DOM style definitions for Embed web component
 *
 * Parallel to embed.classes.ts. Same semantic structure for the iframe
 * display path, CSS property maps instead of Tailwind class strings.
 *
 * Scope is reduced relative to the React target: the WC covers the iframe
 * provider path (YouTube, Vimeo, Twitch, generic) plus a fallback. The
 * Twitter-widget flow, editable URL input, drag/drop upload, and alignment
 * toolbar are React-only concerns and do NOT appear in this file.
 *
 * All token references go through tokenVar(); no raw var() literals appear
 * outside the classy-wc primitives. Motion tokens use --motion-duration-*
 * / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

/**
 * Accepted aspect-ratio keys for the <rafters-embed> host attribute.
 *
 * Unknown values fall back to '16:9' silently at the stylesheet boundary
 * (never throw).
 */
export type AspectRatioKey = '16:9' | '4:3' | '1:1' | '9:16';

// ============================================================================
// Aspect Ratio Map
// ============================================================================

/**
 * CSS aspect-ratio values keyed by AspectRatioKey. The CSS `aspect-ratio`
 * property accepts the `<width> / <height>` two-number syntax directly, so
 * these values are passed through to the `.embed` rule.
 */
export const aspectRatioValues: Record<AspectRatioKey, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1',
  '9:16': '9 / 16',
};

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Outer `.embed` wrapper base. Mirrors embedContainerClasses:
 *   "relative overflow-hidden rounded-lg bg-muted"
 *
 * Width fills the host; height comes from the aspect-ratio property set
 * on the same rule.
 */
export const embedBase: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  'border-radius': tokenVar('radius-lg'),
  'background-color': tokenVar('color-muted'),
  width: '100%',
};

/**
 * Inner `<iframe>` positioning. Mirrors embedIframeClasses:
 *   "absolute inset-0 h-full w-full border-0"
 */
export const embedIframeBase: CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
  width: '100%',
  height: '100%',
  'border-width': '0',
  'border-style': 'solid',
  'border-color': 'transparent',
};

/**
 * Fallback wrapper base. Mirrors embedFallbackClasses:
 *   "flex flex-col items-center justify-center rounded-lg border-2
 *    border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center"
 *
 * Note: the shadow-DOM surface cannot reference the half-opacity Tailwind
 * utilities directly; opacity pairs are resolved via color tokens with
 * `-muted-foreground` / `-muted` whole-token references. Parity with the
 * React target's opacity nuance is handled at the token layer, not here.
 */
export const embedFallbackBase: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  'align-items': 'center',
  'justify-content': 'center',
  'border-radius': tokenVar('radius-lg'),
  'border-width': '2px',
  'border-style': 'dashed',
  'border-color': tokenVar('color-muted-foreground'),
  'background-color': tokenVar('color-muted'),
  padding: '2rem',
  'text-align': 'center',
};

/**
 * Fallback message text. Mirrors embedFallbackMessageClasses:
 *   "mb-2 text-label-small font-medium text-muted-foreground"
 */
export const embedFallbackMessage: CSSProperties = {
  'margin-bottom': '0.5rem',
  'font-size': tokenVar('font-size-label-small'),
  'font-weight': '500',
  color: tokenVar('color-muted-foreground'),
};

/**
 * Fallback external link. Mirrors embedFallbackLinkClasses:
 *   "text-label-small text-primary underline underline-offset-4"
 */
export const embedFallbackLink: CSSProperties = {
  'font-size': tokenVar('font-size-label-small'),
  color: tokenVar('color-primary'),
  'text-decoration': 'underline',
  'text-underline-offset': '4px',
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface EmbedStylesheetOptions {
  aspectRatio?: AspectRatioKey | undefined;
}

/**
 * Build the complete embed stylesheet for a given configuration.
 *
 * Unknown aspectRatio keys fall back to '16:9' via pick(). Never throws.
 * Emits:
 *   - `:host` block layout so the embed takes full width by default
 *   - `.embed` outer wrapper with the resolved aspect-ratio
 *   - `.embed iframe` absolute-fill positioning
 *   - `.embed-fallback` fallback wrapper chrome
 *   - `.embed-fallback__message` fallback text styling
 *   - `.embed-fallback__link` fallback link styling
 */
export function embedStylesheet(options: EmbedStylesheetOptions = {}): string {
  const { aspectRatio } = options;

  return stylesheet(
    styleRule(':host', { display: 'block', width: '100%' }),

    styleRule('.embed', embedBase, {
      'aspect-ratio': pickAspectRatio(aspectRatio),
    }),

    styleRule('.embed iframe', embedIframeBase),

    styleRule('.embed-fallback', embedFallbackBase),

    styleRule('.embed-fallback__message', embedFallbackMessage),

    styleRule('.embed-fallback__link', embedFallbackLink),
  );
}

/**
 * Resolve an aspect-ratio input into its CSS value. Unknown keys fall
 * back to '16:9' silently. Never throws.
 */
function pickAspectRatio(key: AspectRatioKey | undefined): string {
  if (key && key in aspectRatioValues) return aspectRatioValues[key];
  return aspectRatioValues['16:9'];
}
