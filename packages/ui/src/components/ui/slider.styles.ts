/**
 * Shadow DOM style definitions for Slider web component
 *
 * Parallel to slider.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * All token references go through tokenVar() -- no raw CSS custom-property
 * function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, styleRule, stylesheet, tokenVar, transition } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type SliderVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type SliderSize = 'sm' | 'default' | 'lg';

export type SliderOrientation = 'horizontal' | 'vertical';

export interface SliderStylesheetOptions {
  variant?: SliderVariant | undefined;
  size?: SliderSize | undefined;
  orientation?: SliderOrientation | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Variant -> color token mapping
// ============================================================================

/**
 * Maps a variant name to the design-token color used for the slider range
 * and thumb border. `default` aliases to `color-primary`.
 */
export const sliderVariantColorToken: Record<SliderVariant, string> = {
  default: 'color-primary',
  primary: 'color-primary',
  secondary: 'color-secondary',
  destructive: 'color-destructive',
  success: 'color-success',
  warning: 'color-warning',
  info: 'color-info',
  accent: 'color-accent',
};

/**
 * Maps a variant name to the design-token color used for the focus ring.
 * `default` aliases to `color-primary-ring`.
 */
export const sliderVariantRingToken: Record<SliderVariant, string> = {
  default: 'color-primary-ring',
  primary: 'color-primary-ring',
  secondary: 'color-secondary-ring',
  destructive: 'color-destructive-ring',
  success: 'color-success-ring',
  warning: 'color-warning-ring',
  info: 'color-info-ring',
  accent: 'color-accent-ring',
};

// ============================================================================
// Base Styles
// ============================================================================

export const sliderContainerBase: CSSProperties = {
  position: 'relative',
  display: 'flex',
  'touch-action': 'none',
  'user-select': 'none',
  'align-items': 'center',
};

export const sliderTrackBase: CSSProperties = {
  position: 'relative',
  'flex-grow': '1',
  overflow: 'hidden',
  'border-radius': '9999px',
  'background-color': tokenVar('color-muted'),
};

export const sliderRangeBase: CSSProperties = {
  position: 'absolute',
  'background-color': tokenVar('color-primary'),
};

export const sliderThumbBase: CSSProperties = {
  position: 'absolute',
  display: 'block',
  'border-radius': '9999px',
  'border-width': '2px',
  'border-style': 'solid',
  'border-color': tokenVar('color-primary'),
  'background-color': tokenVar('color-background'),
  cursor: 'grab',
  transition: transition(
    ['transform', 'box-shadow'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

export const sliderThumbFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

export const sliderDisabled: CSSProperties = {
  opacity: '0.5',
  'pointer-events': 'none',
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Per-variant overrides. Each variant maps the range fill `background-color`
 * and thumb `border-color` to the variant color token. The `ring` entry
 * captures the variant-specific focus-ring color token; the final
 * `:focus-visible` rule is composed in `sliderStylesheet()` using the
 * variant ring token.
 */
export const sliderVariantStyles: Record<
  SliderVariant,
  { range: CSSProperties; thumb: CSSProperties; ring: CSSProperties }
> = {
  default: {
    range: { 'background-color': tokenVar('color-primary') },
    thumb: { 'border-color': tokenVar('color-primary') },
    ring: { '--rafters-slider-ring': tokenVar('color-primary-ring') },
  },
  primary: {
    range: { 'background-color': tokenVar('color-primary') },
    thumb: { 'border-color': tokenVar('color-primary') },
    ring: { '--rafters-slider-ring': tokenVar('color-primary-ring') },
  },
  secondary: {
    range: { 'background-color': tokenVar('color-secondary') },
    thumb: { 'border-color': tokenVar('color-secondary') },
    ring: { '--rafters-slider-ring': tokenVar('color-secondary-ring') },
  },
  destructive: {
    range: { 'background-color': tokenVar('color-destructive') },
    thumb: { 'border-color': tokenVar('color-destructive') },
    ring: { '--rafters-slider-ring': tokenVar('color-destructive-ring') },
  },
  success: {
    range: { 'background-color': tokenVar('color-success') },
    thumb: { 'border-color': tokenVar('color-success') },
    ring: { '--rafters-slider-ring': tokenVar('color-success-ring') },
  },
  warning: {
    range: { 'background-color': tokenVar('color-warning') },
    thumb: { 'border-color': tokenVar('color-warning') },
    ring: { '--rafters-slider-ring': tokenVar('color-warning-ring') },
  },
  info: {
    range: { 'background-color': tokenVar('color-info') },
    thumb: { 'border-color': tokenVar('color-info') },
    ring: { '--rafters-slider-ring': tokenVar('color-info-ring') },
  },
  accent: {
    range: { 'background-color': tokenVar('color-accent') },
    thumb: { 'border-color': tokenVar('color-accent') },
    ring: { '--rafters-slider-ring': tokenVar('color-accent-ring') },
  },
};

// ============================================================================
// Size Styles (horizontal orientation)
// ============================================================================

export const sliderSizeStyles: Record<SliderSize, { track: CSSProperties; thumb: CSSProperties }> =
  {
    sm: {
      track: { height: '0.25rem' },
      thumb: { height: '1rem', width: '1rem' },
    },
    default: {
      track: { height: '0.5rem' },
      thumb: { height: '1.25rem', width: '1.25rem' },
    },
    lg: {
      track: { height: '0.75rem' },
      thumb: { height: '1.5rem', width: '1.5rem' },
    },
  };

// ============================================================================
// Size Styles (vertical orientation -- height/width swapped for track only)
// ============================================================================

export const sliderVerticalSizeStyles: Record<
  SliderSize,
  { track: CSSProperties; thumb: CSSProperties }
> = {
  sm: {
    track: { width: '0.25rem', height: '100%' },
    thumb: { height: '1rem', width: '1rem' },
  },
  default: {
    track: { width: '0.5rem', height: '100%' },
    thumb: { height: '1.25rem', width: '1.25rem' },
  },
  lg: {
    track: { width: '0.75rem', height: '100%' },
    thumb: { height: '1.5rem', width: '1.5rem' },
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete slider stylesheet for a given configuration.
 *
 * Composition:
 *   :host                                   -> display: block
 *   .container                              -> flex container (orientation-aware)
 *   .container[data-disabled]               -> opacity + pointer-events:none
 *   .track                                  -> track height + background
 *   .range                                  -> range fill (variant-aware)
 *   .thumb                                  -> thumb base + border (variant)
 *   .thumb:hover                            -> scale 1.1
 *   .thumb:active                           -> scale 1.05
 *   .thumb:focus-visible                    -> outline + ring (variant)
 *   @media reduced-motion                   -> transition: none
 *
 * Unknown variant, size, or orientation silently fall back to defaults
 * ('default', 'default', 'horizontal') without throwing.
 */
export function sliderStylesheet(options: SliderStylesheetOptions = {}): string {
  const { variant, size, orientation, disabled } = options;

  const safeVariant: SliderVariant =
    variant && variant in sliderVariantStyles ? variant : 'default';
  const safeSize: SliderSize = size && size in sliderSizeStyles ? size : 'default';
  const safeOrientation: SliderOrientation = orientation === 'vertical' ? 'vertical' : 'horizontal';

  const ringToken = sliderVariantRingToken[safeVariant];

  const variantFocusRule: CSSProperties = {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar(ringToken)}`,
  };

  const containerOrientation: CSSProperties =
    safeOrientation === 'vertical'
      ? { 'flex-direction': 'column', height: '100%' }
      : { 'flex-direction': 'row', width: '100%' };

  const sizeMap = safeOrientation === 'vertical' ? sliderVerticalSizeStyles : sliderSizeStyles;

  const variantStyle = sliderVariantStyles[safeVariant];
  const sizeStyle = sizeMap[safeSize];

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule('.container', sliderContainerBase, containerOrientation),

    styleRule('.container[data-disabled]', sliderDisabled),

    styleRule('.track', sliderTrackBase, sizeStyle.track),

    styleRule('.range', sliderRangeBase, variantStyle.range),

    styleRule('.thumb', sliderThumbBase, sizeStyle.thumb, variantStyle.thumb),

    styleRule('.thumb:hover', { transform: 'scale(1.1)' }),

    styleRule('.thumb:active', { transform: 'scale(1.05)' }),

    // Base focus-visible rule -- references color-ring as the generic token
    // so the default stylesheet always emits it. Variant-specific rings
    // override via the cascade in the next rule.
    styleRule('.thumb:focus-visible', sliderThumbFocusVisible),

    // Variant focus-visible override -- replaces the base ring token with
    // the variant-specific ring (e.g. color-primary-ring, color-destructive-ring).
    styleRule('.thumb:focus-visible', variantFocusRule),

    disabled ? styleRule('.container', sliderDisabled) : '',

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.thumb', { transition: 'none' })),
  );
}
