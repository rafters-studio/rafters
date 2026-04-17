/**
 * Shadow DOM style definitions for Checkbox web component
 *
 * Parallel to checkbox.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * All token references go through tokenVar() -- no raw CSS custom-property
 * function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import {
  atRule,
  mixin,
  pick,
  styleRule,
  stylesheet,
  tokenVar,
  transition,
  when,
} from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type CheckboxVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent';

export type CheckboxSize = 'sm' | 'default' | 'lg';

export interface CheckboxStylesheetOptions {
  variant?: CheckboxVariant | undefined;
  size?: CheckboxSize | undefined;
  checked?: boolean | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Base declarations shared across every variant and size. Transparent
 * background; the checked state fills it via the checked rule below.
 */
export const checkboxBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'flex-shrink': '0',
  'border-width': '1px',
  'border-style': 'solid',
  'border-radius': tokenVar('radius-sm'),
  'background-color': 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  padding: '0',
  transition: transition(
    ['background-color', 'border-color', 'color'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

/**
 * Disabled-state declarations applied both at the host level (when the
 * `disabled` attribute is present) and via `:disabled` on the inner
 * <button> for defensive coverage.
 */
export const checkboxDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
  'pointer-events': 'none',
};

/**
 * Checked-state baseline declarations. The variant-specific `checked`
 * rule below adds the background-color/color token pair.
 */
export const checkboxCheckedBase: CSSProperties = {
  // No variant-agnostic declarations today; the variant-specific rule
  // sets the fill and foreground pair. Kept for future composability.
};

/**
 * Focus-visible ring declarations. The double-ring pattern (background
 * offset + ring colour) matches the button primitive.
 */
export const checkboxFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Unchecked-state border colour per variant. `default` aliases to
 * `color-primary`.
 */
export const checkboxVariantStyles: Record<CheckboxVariant, CSSProperties> = {
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
  accent: {
    'border-color': tokenVar('color-accent'),
  },
};

/**
 * Checked-state background + foreground pair per variant. `default`
 * aliases to `color-primary`.
 */
export const checkboxVariantChecked: Record<CheckboxVariant, CSSProperties> = {
  default: {
    'background-color': tokenVar('color-primary'),
    color: tokenVar('color-primary-foreground'),
  },
  primary: {
    'background-color': tokenVar('color-primary'),
    color: tokenVar('color-primary-foreground'),
  },
  secondary: {
    'background-color': tokenVar('color-secondary'),
    color: tokenVar('color-secondary-foreground'),
  },
  destructive: {
    'background-color': tokenVar('color-destructive'),
    color: tokenVar('color-destructive-foreground'),
  },
  success: {
    'background-color': tokenVar('color-success'),
    color: tokenVar('color-success-foreground'),
  },
  warning: {
    'background-color': tokenVar('color-warning'),
    color: tokenVar('color-warning-foreground'),
  },
  info: {
    'background-color': tokenVar('color-info'),
    color: tokenVar('color-info-foreground'),
  },
  accent: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
};

/**
 * Focus-visible ring factory for a variant-specific ring token. Each
 * variant replaces the neutral ring token with its own.
 */
function focusRingFor(ringToken: string): CSSProperties {
  return mixin({
    outline: 'none',
    'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar(ringToken)}`,
  });
}

/**
 * Focus-visible ring styles per variant. `default` aliases to
 * `color-primary-ring`.
 */
export const checkboxVariantFocusRing: Record<CheckboxVariant, CSSProperties> = {
  default: focusRingFor('color-primary-ring'),
  primary: focusRingFor('color-primary-ring'),
  secondary: focusRingFor('color-secondary-ring'),
  destructive: focusRingFor('color-destructive-ring'),
  success: focusRingFor('color-success-ring'),
  warning: focusRingFor('color-warning-ring'),
  info: focusRingFor('color-info-ring'),
  accent: focusRingFor('color-accent-ring'),
};

// ============================================================================
// Size Styles
// ============================================================================

/**
 * Size declarations for the box (host/button) and the icon (SVG).
 * Values mirror checkbox.classes.ts exactly.
 */
export const checkboxSizeStyles: Record<CheckboxSize, { box: CSSProperties; icon: CSSProperties }> =
  {
    sm: {
      box: { height: '0.875rem', width: '0.875rem' },
      icon: { height: '0.625rem', width: '0.625rem' },
    },
    default: {
      box: { height: '1rem', width: '1rem' },
      icon: { height: '0.75rem', width: '0.75rem' },
    },
    lg: {
      box: { height: '1.25rem', width: '1.25rem' },
      icon: { height: '1rem', width: '1rem' },
    },
  };

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete checkbox stylesheet for a given configuration.
 *
 * Composition:
 *   :host                          -> display: inline-flex
 *   .checkbox                      -> base + variant border + size box + optional disabled
 *   .checkbox[data-state="checked"]-> variant checked (bg + fg)
 *   .checkbox .icon                -> size icon
 *   .checkbox:focus-visible        -> variant-specific ring
 *   .checkbox:disabled             -> disabled declarations
 *   @media reduced-motion          -> transition: none on .checkbox
 *
 * Unknown variant or size values fall back to defaults
 * ('default', 'default') without throwing.
 */
export function checkboxStylesheet(options: CheckboxStylesheetOptions = {}): string {
  const { variant, size, checked, disabled } = options;

  const safeVariant: CheckboxVariant =
    variant && variant in checkboxVariantStyles ? variant : 'default';
  const safeSize: CheckboxSize = size && size in checkboxSizeStyles ? size : 'default';

  const sizePair = checkboxSizeStyles[safeSize];

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule(
      '.checkbox',
      checkboxBase,
      pick(checkboxVariantStyles, safeVariant, 'default'),
      sizePair.box,
      when(disabled, checkboxDisabled),
      when(checked, checkboxCheckedBase, pick(checkboxVariantChecked, safeVariant, 'default')),
    ),

    // Attribute-driven checked rule so browser state flips live without
    // re-composing the stylesheet. The composed `checked` flag above
    // covers the initial render when we know the value up front.
    styleRule(
      '.checkbox[data-state="checked"]',
      pick(checkboxVariantChecked, safeVariant, 'default'),
    ),

    styleRule('.checkbox .icon', sizePair.icon),

    styleRule('.checkbox:focus-visible', pick(checkboxVariantFocusRing, safeVariant, 'default')),

    styleRule('.checkbox:disabled', checkboxDisabled),

    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.checkbox', { transition: 'none' }),
    ),
  );
}
