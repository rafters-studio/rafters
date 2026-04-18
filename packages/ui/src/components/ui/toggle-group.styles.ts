/**
 * Shadow DOM style definitions for Toggle Group web component
 *
 * Parallel to toggle-group.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * The group host arranges its items in an inline-flex row (or column for
 * vertical orientation). Each item is a separate custom element with its
 * own per-instance stylesheet so variant/size/pressed state composes
 * independently per item.
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

export type ToggleGroupVariant = 'default' | 'outline';

export type ToggleGroupSize = 'sm' | 'default' | 'lg';

export type ToggleGroupOrientation = 'horizontal' | 'vertical';

export interface ToggleGroupStylesheetOptions {
  variant?: ToggleGroupVariant | undefined;
  orientation?: ToggleGroupOrientation | undefined;
}

export interface ToggleGroupItemStylesheetOptions {
  variant?: ToggleGroupVariant | undefined;
  size?: ToggleGroupSize | undefined;
  pressed?: boolean | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Group Styles
// ============================================================================

/**
 * Base group declarations shared across every variant.
 * Mirrors toggleGroupClasses from toggle-group.classes.ts.
 */
export const toggleGroupBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  gap: '0.25rem',
  'border-radius': tokenVar('radius-lg'),
};

/**
 * Additional declarations layered onto the group when the default variant
 * is active. The outline variant keeps the frame transparent.
 */
export const toggleGroupDefaultVariantStyles: CSSProperties = {
  'background-color': tokenVar('color-muted'),
  padding: tokenVar('spacing-1'),
};

// ============================================================================
// Item Styles
// ============================================================================

/**
 * Base item declarations shared across every variant and size. Mirrors
 * toggleGroupItemBaseClasses from toggle-group.classes.ts. Background stays
 * transparent by default; pressed/hover layer color on top.
 */
export const toggleGroupItemBase: CSSProperties = {
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
 * Focus-visible ring on items -- neutral double-ring matching the rest of
 * the Rafters form-control surface.
 */
export const toggleGroupItemFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

/**
 * Disabled-state declarations for items.
 */
export const toggleGroupItemDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
  'pointer-events': 'none',
};

/**
 * Pressed background + foreground pair for the default variant.
 * Elevates the pressed item above the muted group surface via a
 * white background and a tiny shadow.
 */
export const toggleGroupItemDefaultPressed: CSSProperties = {
  'background-color': tokenVar('color-background'),
  color: tokenVar('color-foreground'),
  'box-shadow': '0 1px 2px 0 rgba(0,0,0,0.05)',
};

/**
 * Pressed background + foreground pair for the outline variant.
 * Uses the accent pair so the pressed state reads as the primary
 * selection without a full-frame chip.
 */
export const toggleGroupItemOutlinePressed: CSSProperties = {
  'background-color': tokenVar('color-accent'),
  color: tokenVar('color-accent-foreground'),
};

/**
 * Unpressed base per variant. Outline paints a 1px input-coloured border
 * so items read as interactive chips even before selection.
 */
export const toggleGroupItemVariantStyles: Record<ToggleGroupVariant, CSSProperties> = {
  default: {
    'background-color': 'transparent',
  },
  outline: {
    'background-color': 'transparent',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': tokenVar('color-input'),
  },
};

/**
 * Pressed declarations per variant. Looked up by key; unknown variant
 * silently falls back to default via pick().
 */
export const toggleGroupItemVariantPressed: Record<ToggleGroupVariant, CSSProperties> = {
  default: toggleGroupItemDefaultPressed,
  outline: toggleGroupItemOutlinePressed,
};

/**
 * Hover background per variant when not pressed.
 */
export const toggleGroupItemVariantHover: Record<ToggleGroupVariant, CSSProperties> = {
  default: {
    'background-color': tokenVar('color-muted'),
    color: tokenVar('color-muted-foreground'),
  },
  outline: {
    'background-color': tokenVar('color-muted'),
    color: tokenVar('color-muted-foreground'),
  },
};

/**
 * Size declarations map explicit heights and padding pairs.
 * Matches toggleGroupItemSizeClasses from toggle-group.classes.ts.
 */
export const toggleGroupItemSizeStyles: Record<ToggleGroupSize, CSSProperties> = {
  sm: {
    height: '2rem',
    'padding-left': '0.5rem',
    'padding-right': '0.5rem',
  },
  default: {
    height: '2.25rem',
    'padding-left': '0.75rem',
    'padding-right': '0.75rem',
  },
  lg: {
    height: '2.5rem',
    'padding-left': '1rem',
    'padding-right': '1rem',
  },
};

// ============================================================================
// Assembled Group Stylesheet
// ============================================================================

/**
 * Resolve orientation, silently falling back to horizontal for unknown values.
 */
function resolveOrientation(value: ToggleGroupOrientation | undefined): ToggleGroupOrientation {
  if (value === 'vertical') return 'vertical';
  return 'horizontal';
}

/**
 * Build the complete group stylesheet for a given configuration.
 *
 * Composition:
 *   :host                  -> display: inline-flex, flex-direction (row|column)
 *   .group                 -> base + optional default variant chrome
 */
export function toggleGroupStylesheet(options: ToggleGroupStylesheetOptions = {}): string {
  const { variant, orientation } = options;
  const resolvedOrientation = resolveOrientation(orientation);
  const resolvedVariant: ToggleGroupVariant = variant === 'outline' ? 'outline' : 'default';

  return stylesheet(
    styleRule(':host', {
      display: 'inline-flex',
      'flex-direction': resolvedOrientation === 'vertical' ? 'column' : 'row',
    }),

    styleRule(
      '.group',
      toggleGroupBase,
      when(resolvedVariant === 'default', toggleGroupDefaultVariantStyles),
      resolvedOrientation === 'vertical' ? { 'flex-direction': 'column' } : {},
    ),
  );
}

// ============================================================================
// Assembled Item Stylesheet
// ============================================================================

/**
 * Build the complete item stylesheet for a given configuration.
 *
 * Composition:
 *   :host                            -> display: inline-flex
 *   .item                            -> base + variant + size (+ disabled when set)
 *   .item:hover:not(:disabled)       -> variant hover surface (unpressed)
 *   .item:active:not(:disabled)      -> scale(0.98) tactile feedback
 *   .item:focus-visible              -> neutral focus ring
 *   .item[data-state="on"]           -> pressed fill + foreground per variant
 *   .item:disabled                   -> disabled declarations
 *   @media reduced-motion            -> transition: none, transform: none
 *
 * Unknown variant/size falls back to 'default' via pick(). Never throws.
 */
export function toggleGroupItemStylesheet(options: ToggleGroupItemStylesheetOptions = {}): string {
  const { variant, size, pressed, disabled } = options;

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule(
      '.item',
      toggleGroupItemBase,
      pick(toggleGroupItemVariantStyles, variant, 'default'),
      pick(toggleGroupItemSizeStyles, size, 'default'),
      when(pressed, pick(toggleGroupItemVariantPressed, variant, 'default')),
      when(disabled, toggleGroupItemDisabled),
    ),

    styleRule('.item:hover:not(:disabled)', pick(toggleGroupItemVariantHover, variant, 'default')),

    styleRule('.item:active:not(:disabled)', { transform: 'scale(0.98)' }),

    styleRule('.item:focus-visible', toggleGroupItemFocusVisible),

    styleRule('.item[data-state="on"]', pick(toggleGroupItemVariantPressed, variant, 'default')),

    styleRule('.item:disabled', toggleGroupItemDisabled),

    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.item', { transition: 'none' }),
      styleRule('.item:active:not(:disabled)', { transform: 'none' }),
    ),
  );
}
