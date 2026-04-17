/**
 * Shadow DOM style definitions for Toggle web component
 *
 * Parallel to toggle.classes.ts. Same semantic structure,
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
  when,
} from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type ToggleVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'accent'
  | 'outline'
  | 'ghost';

export type ToggleSize = 'sm' | 'default' | 'lg';

export interface ToggleStylesheetOptions {
  variant?: ToggleVariant | undefined;
  size?: ToggleSize | undefined;
  pressed?: boolean | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Base toggle declarations shared across every variant and size.
 * Mirrors toggleBaseClasses from toggle.classes.ts.
 */
export const toggleBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'border-radius': tokenVar('radius-md'),
  'font-size': tokenVar('font-size-label-large'),
  'background-color': 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  'user-select': 'none',
  'white-space': 'nowrap',
  'border-width': '0',
  'border-style': 'solid',
  'border-color': 'transparent',
  transition: transition(
    ['background-color', 'color', 'transform'],
    tokenVar('motion-duration-base'),
    tokenVar('motion-ease-standard'),
  ),
};

/**
 * Disabled-state declarations. Applied either via the host's `disabled`
 * attribute (composed into the base rule) or via `:disabled` on the inner
 * button for defensive coverage.
 */
export const toggleDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
  'pointer-events': 'none',
};

/**
 * Focus-visible ring -- neutral double-ring matching the rest of the
 * Rafters form-control surface.
 */
export const toggleFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Unpressed base per variant. Toggles read as neutral affordances until
 * pressed, so semantic variants keep a transparent background. The
 * `outline` variant adds a 1px input-coloured border.
 */
export const toggleVariantStyles: Record<ToggleVariant, CSSProperties> = {
  default: {
    'background-color': 'transparent',
  },
  primary: {
    'background-color': 'transparent',
  },
  secondary: {
    'background-color': 'transparent',
  },
  destructive: {
    'background-color': 'transparent',
  },
  success: {
    'background-color': 'transparent',
  },
  warning: {
    'background-color': 'transparent',
  },
  info: {
    'background-color': 'transparent',
  },
  accent: {
    'background-color': 'transparent',
  },
  outline: {
    'background-color': 'transparent',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': tokenVar('color-input'),
  },
  ghost: {
    'background-color': 'transparent',
  },
};

/**
 * Pressed (data-state="on") background + foreground pair per variant.
 * Semantic variants map to their own `-foreground` pair. The neutral
 * outline/ghost variants fall back to the accent pair.
 */
export const toggleVariantPressed: Record<ToggleVariant, CSSProperties> = {
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
  outline: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
  ghost: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
};

/**
 * Hover background per variant when not pressed. All semantic variants
 * share the muted hover surface; ghost alone hovers to the accent pair
 * so it reads as actionable without a frame.
 */
export const toggleVariantHover: Record<ToggleVariant, CSSProperties> = {
  default: {
    'background-color': tokenVar('color-muted'),
  },
  primary: {
    'background-color': tokenVar('color-muted'),
  },
  secondary: {
    'background-color': tokenVar('color-muted'),
  },
  destructive: {
    'background-color': tokenVar('color-muted'),
  },
  success: {
    'background-color': tokenVar('color-muted'),
  },
  warning: {
    'background-color': tokenVar('color-muted'),
  },
  info: {
    'background-color': tokenVar('color-muted'),
  },
  accent: {
    'background-color': tokenVar('color-muted'),
  },
  outline: {
    'background-color': tokenVar('color-muted'),
  },
  ghost: {
    'background-color': tokenVar('color-accent'),
    color: tokenVar('color-accent-foreground'),
  },
};

// ============================================================================
// Size Styles
// ============================================================================

/**
 * Size declarations map explicit heights and padding pairs.
 * Matches toggleSizeClasses from toggle.classes.ts.
 */
export const toggleSizeStyles: Record<ToggleSize, CSSProperties> = {
  sm: {
    height: '2.25rem',
    'padding-left': '0.625rem',
    'padding-right': '0.625rem',
  },
  default: {
    height: '2.5rem',
    'padding-left': '0.75rem',
    'padding-right': '0.75rem',
  },
  lg: {
    height: '2.75rem',
    'padding-left': '1.25rem',
    'padding-right': '1.25rem',
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete toggle stylesheet for a given configuration.
 *
 * Composition:
 *   :host                            -> display: inline-flex
 *   .toggle                          -> base + variant + size (+ disabled when set)
 *   .toggle:hover:not(:disabled)     -> variant hover surface (unpressed)
 *   .toggle:active                   -> scale(0.98) tactile feedback
 *   .toggle:focus-visible            -> neutral focus ring
 *   .toggle[data-state="on"]         -> pressed fill + foreground per variant
 *   .toggle:disabled                 -> disabled declarations
 *   @media reduced-motion            -> transition: none, transform: none
 *
 * Unknown variant/size falls back to 'default' via pick(). Never throws.
 */
export function toggleStylesheet(options: ToggleStylesheetOptions = {}): string {
  const { variant, size, pressed, disabled } = options;

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule(
      '.toggle',
      toggleBase,
      pick(toggleVariantStyles, variant, 'default'),
      pick(toggleSizeStyles, size, 'default'),
      when(pressed, pick(toggleVariantPressed, variant, 'default')),
      when(disabled, toggleDisabled),
    ),

    styleRule('.toggle:hover:not(:disabled)', pick(toggleVariantHover, variant, 'default')),

    styleRule('.toggle:active:not(:disabled)', { transform: 'scale(0.98)' }),

    styleRule('.toggle:focus-visible', toggleFocusVisible),

    styleRule('.toggle[data-state="on"]', pick(toggleVariantPressed, variant, 'default')),

    styleRule('.toggle:disabled', toggleDisabled),

    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.toggle', { transition: 'none' }),
      styleRule('.toggle:active:not(:disabled)', { transform: 'none' }),
    ),
  );
}
