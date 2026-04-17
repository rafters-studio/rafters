/**
 * Shadow DOM style definitions for Switch web component
 *
 * Parallel to switch.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * All token references go through tokenVar() -- no raw CSS custom-property
 * function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import {
  atRule,
  pick,
  styleRule,
  stylesheet,
  tokenVar,
  transition,
} from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type SwitchVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type SwitchSize = 'sm' | 'default' | 'lg';

export interface SwitchStylesheetOptions {
  variant?: SwitchVariant | undefined;
  size?: SwitchSize | undefined;
  checked?: boolean | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Track Styles
// ============================================================================

export const switchTrackBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'flex-shrink': '0',
  'border-radius': '9999px',
  'border-width': '2px',
  'border-style': 'solid',
  'border-color': 'transparent',
  'background-color': tokenVar('color-input'),
  cursor: 'pointer',
  padding: '0',
  transition: transition(
    ['background-color'],
    tokenVar('motion-duration-base'),
    tokenVar('motion-ease-standard'),
  ),
};

export const switchTrackDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
};

export const switchTrackFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

// ============================================================================
// Thumb Styles
// ============================================================================

export const switchThumbBase: CSSProperties = {
  'pointer-events': 'none',
  display: 'block',
  'border-radius': '9999px',
  'background-color': tokenVar('color-background'),
  'box-shadow': '0 1px 2px 0 rgba(0,0,0,0.05)',
  transition: transition(
    ['transform'],
    tokenVar('motion-duration-base'),
    tokenVar('motion-ease-standard'),
  ),
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Per-variant track background color when the switch is in the checked
 * state. `default` aliases `color-primary`.
 */
export const switchVariantChecked: Record<SwitchVariant, CSSProperties> = {
  default: { 'background-color': tokenVar('color-primary') },
  primary: { 'background-color': tokenVar('color-primary') },
  secondary: { 'background-color': tokenVar('color-secondary') },
  destructive: { 'background-color': tokenVar('color-destructive') },
  success: { 'background-color': tokenVar('color-success') },
  warning: { 'background-color': tokenVar('color-warning') },
  info: { 'background-color': tokenVar('color-info') },
  accent: { 'background-color': tokenVar('color-accent') },
};

/**
 * Per-variant focus ring -- replaces the default `color-ring` token with the
 * variant-specific ring token. `default` aliases `color-primary-ring`.
 */
export const switchVariantFocusRing: Record<SwitchVariant, CSSProperties> = {
  default: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-primary-ring')}`,
  },
  primary: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-primary-ring')}`,
  },
  secondary: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-secondary-ring')}`,
  },
  destructive: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-destructive-ring')}`,
  },
  success: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-success-ring')}`,
  },
  warning: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-warning-ring')}`,
  },
  info: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-info-ring')}`,
  },
  accent: {
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-accent-ring')}`,
  },
};

// ============================================================================
// Size Styles
// ============================================================================

/**
 * Track/thumb dimensions and translation distance per size.
 * Translate distance is the thumb's `transform: translateX(...)` value when
 * the switch is checked; it equals (track width - thumb width - border*2).
 */
export const switchSizeStyles: Record<
  SwitchSize,
  { track: CSSProperties; thumb: CSSProperties; translate: string }
> = {
  sm: {
    track: { height: '1.25rem', width: '2.25rem' },
    thumb: { height: '1rem', width: '1rem' },
    translate: '1rem',
  },
  default: {
    track: { height: '1.5rem', width: '2.75rem' },
    thumb: { height: '1.25rem', width: '1.25rem' },
    translate: '1.25rem',
  },
  lg: {
    track: { height: '1.75rem', width: '3.5rem' },
    thumb: { height: '1.5rem', width: '1.5rem' },
    translate: '1.75rem',
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete switch stylesheet for a given configuration.
 *
 * Composition:
 *   :host                                  -> display: inline-flex
 *   .track                                 -> base track + size dimensions
 *   .track[data-state="checked"]           -> variant background color
 *   .track:disabled                        -> cursor + opacity
 *   .track:focus-visible                   -> variant focus ring
 *   .thumb                                 -> base thumb + size dimensions
 *   .track[data-state="checked"] .thumb    -> transform: translateX(translate)
 *   @media reduced-motion                  -> transition: none on track + thumb
 *
 * Unknown variant or size silently falls back to 'default'.
 */
export function switchStylesheet(options: SwitchStylesheetOptions = {}): string {
  const { variant = 'default', size = 'default' } = options;

  const safeVariant: SwitchVariant = variant in switchVariantChecked ? variant : 'default';
  const safeSize: SwitchSize = size in switchSizeStyles ? size : 'default';

  const sizeDef = switchSizeStyles[safeSize];
  const translate = sizeDef.translate;

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    // Base track rule with size dimensions applied.
    styleRule('.track', switchTrackBase, sizeDef.track),

    // Track variant background color when checked -- emitted as a separate
    // rule so that the base background color remains visible in the
    // stylesheet and the variant token takes effect at render time via
    // cascade keyed off the data-state attribute.
    styleRule('.track[data-state="checked"]', pick(switchVariantChecked, safeVariant, 'default')),

    // Disabled state on the native button element.
    styleRule('.track:disabled', switchTrackDisabled),

    // Focus ring -- variant-specific token replaces the default ring.
    styleRule(
      '.track:focus-visible',
      { outline: 'none' },
      pick(switchVariantFocusRing, safeVariant, 'default'),
    ),

    // Thumb base + dimensions. The thumb starts at translateX(0); the
    // checked rule below shifts it by the size-specific translate distance.
    styleRule('.thumb', switchThumbBase, sizeDef.thumb, { transform: 'translateX(0)' }),

    // Thumb translation when the track is in the checked state.
    styleRule('.track[data-state="checked"] .thumb', {
      transform: `translateX(${translate})`,
    }),

    // Reduced-motion guard: disable transitions on both track and thumb.
    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.track', { transition: 'none' }),
      styleRule('.thumb', { transition: 'none' }),
    ),
  );
}
