/**
 * Shadow DOM style definitions for Input web component
 *
 * Parallel to input.classes.ts. Same semantic structure,
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

export type InputVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

export type InputSize = 'sm' | 'default' | 'lg';

export interface InputStylesheetOptions {
  variant?: InputVariant | undefined;
  size?: InputSize | undefined;
}

// ============================================================================
// Variant -> color token mapping
// ============================================================================

/**
 * Maps a variant name to the design-token color used for the input border.
 * `default` aliases to `color-primary`; `muted` aliases to `color-input`.
 */
export const inputVariantBorderToken: Record<InputVariant, string> = {
  default: 'color-primary',
  primary: 'color-primary',
  secondary: 'color-secondary',
  destructive: 'color-destructive',
  success: 'color-success',
  warning: 'color-warning',
  info: 'color-info',
  muted: 'color-input',
  accent: 'color-accent',
};

/**
 * Maps a variant name to the design-token color used for the focus ring.
 * `default` aliases to `color-primary-ring`; `muted` aliases to `color-ring`.
 */
export const inputVariantRingToken: Record<InputVariant, string> = {
  default: 'color-primary-ring',
  primary: 'color-primary-ring',
  secondary: 'color-secondary-ring',
  destructive: 'color-destructive-ring',
  success: 'color-success-ring',
  warning: 'color-warning-ring',
  info: 'color-info-ring',
  muted: 'color-ring',
  accent: 'color-accent-ring',
};

// ============================================================================
// Base Styles
// ============================================================================

export const inputBase: CSSProperties = {
  display: 'inline-flex',
  width: '100%',
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': tokenVar('color-input'),
  'border-radius': tokenVar('radius-md'),
  'background-color': tokenVar('color-background'),
  color: tokenVar('color-foreground'),
  'padding-top': '0.5rem',
  'padding-bottom': '0.5rem',
  transition: transition(
    ['box-shadow', 'border-color'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

export const inputPlaceholder: CSSProperties = {
  color: tokenVar('color-muted-foreground'),
};

export const inputDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
};

/**
 * Base focus-visible styling. The variant-specific ring color is composed in
 * by `inputStylesheet()`, replacing `color-ring` with the variant ring token.
 */
export const inputFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

export const inputUserInvalid: CSSProperties = {
  'border-color': tokenVar('color-destructive'),
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-destructive-ring')}`,
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Per-variant overrides applied to the base `.input` rule.
 * Each variant overrides the border-color while the focus ring is composed
 * separately by `inputStylesheet()` based on the variant ring token.
 */
export const inputVariantStyles: Record<InputVariant, CSSProperties> = {
  default: {
    'border-color': tokenVar('color-primary'),
  },
  primary: {
    'border-color': tokenVar('color-primary'),
  },
  secondary: {
    'border-color': tokenVar('color-secondary'),
  },
  destructive: {
    'border-color': tokenVar('color-destructive'),
  },
  success: {
    'border-color': tokenVar('color-success'),
  },
  warning: {
    'border-color': tokenVar('color-warning'),
  },
  info: {
    'border-color': tokenVar('color-info'),
  },
  muted: {
    'border-color': tokenVar('color-input'),
  },
  accent: {
    'border-color': tokenVar('color-accent'),
  },
};

// ============================================================================
// Size Styles
// ============================================================================

export const inputSizeStyles: Record<InputSize, CSSProperties> = {
  sm: {
    height: '2rem',
    'padding-left': '0.5rem',
    'padding-right': '0.5rem',
    'font-size': tokenVar('font-size-label-small'),
  },
  default: {
    height: '2.5rem',
    padding: '0.75rem',
    'font-size': tokenVar('font-size-body-small'),
  },
  lg: {
    height: '3rem',
    padding: '1rem',
    'font-size': tokenVar('font-size-body-medium'),
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete input stylesheet for a given configuration.
 *
 * Composition:
 *   :host                     -> display: block
 *   .input                    -> base + variant border + size dimensions
 *   .input::placeholder       -> muted-foreground
 *   .input:disabled           -> cursor + opacity
 *   .input:focus-visible      -> outline + ring (variant-specific token)
 *   .input:user-invalid       -> destructive border + destructive ring
 *   @media reduced-motion     -> transition: none
 *
 * Unknown variant or size silently falls back to 'default'.
 */
export function inputStylesheet(options: InputStylesheetOptions = {}): string {
  const { variant = 'default', size = 'default' } = options;

  const safeVariant: InputVariant = variant in inputVariantStyles ? variant : 'default';
  const safeSize: InputSize = size in inputSizeStyles ? size : 'default';

  const ringToken = inputVariantRingToken[safeVariant];

  const focusRule: CSSProperties = {
    outline: 'none',
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar(ringToken)}`,
  };

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    // Base .input rule -- declares all token-driven defaults including
    // border-color: var(--color-input). The variant rule below overrides
    // border-color via the cascade with the variant-specific token.
    styleRule('.input', inputBase, pick(inputSizeStyles, safeSize, 'default')),

    // Variant border override -- emitted as a separate rule so that the base
    // token (color-input) remains visible in the stylesheet while the variant
    // token (e.g. color-primary) takes effect at render time via cascade.
    styleRule('.input', pick(inputVariantStyles, safeVariant, 'default')),

    styleRule('.input::placeholder', inputPlaceholder),
    styleRule('.input:disabled', inputDisabled),
    styleRule('.input:focus-visible', focusRule),
    styleRule('.input:user-invalid', inputUserInvalid),

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.input', { transition: 'none' })),
  );
}
