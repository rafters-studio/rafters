/**
 * Shadow DOM style definitions for Item web component
 *
 * Parallel to item.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 * Token values via var() from the shared token stylesheet.
 *
 * All token references go through tokenVar(); no raw var() literals.
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

export type ItemSize = 'default' | 'sm' | 'lg';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Base item declarations shared across every size.
 * Mirrors itemBaseClasses from item.classes.ts.
 */
export const itemBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  gap: '0.75rem',
  'border-radius': tokenVar('radius-md'),
  cursor: 'default',
  'user-select': 'none',
  outline: 'none',
  'background-color': 'transparent',
  color: tokenVar('color-foreground'),
  transition: transition(
    ['background-color', 'color'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

/**
 * Hover-state declarations applied when neither selected nor disabled.
 */
export const itemHover: CSSProperties = {
  'background-color': tokenVar('color-accent'),
  color: tokenVar('color-accent-foreground'),
};

/**
 * Selected-state declarations. Applied to the inner .item element when the
 * host carries the `selected` attribute.
 */
export const itemSelected: CSSProperties = {
  'background-color': tokenVar('color-accent'),
  color: tokenVar('color-accent-foreground'),
};

/**
 * Disabled-state declarations. Applied to the inner .item element when the
 * host carries the `disabled` attribute.
 */
export const itemDisabled: CSSProperties = {
  opacity: '0.5',
  'pointer-events': 'none',
  color: tokenVar('color-muted-foreground'),
};

/**
 * Focus-visible ring declarations for keyboard navigation. Uses accent
 * background plus a double-ring box-shadow for visibility on any surface.
 */
export const itemFocusVisible: CSSProperties = {
  'background-color': tokenVar('color-accent'),
  color: tokenVar('color-accent-foreground'),
  outline: 'none',
  'box-shadow': `0 0 0 1px ${tokenVar('color-background')}, 0 0 0 3px ${tokenVar('color-ring')}`,
};

// ============================================================================
// Size Styles
// ============================================================================

/**
 * Size declarations map per-size padding pairs and font-size tokens.
 * Mirrors itemSizeClasses from item.classes.ts.
 */
export const itemSizeStyles: Record<ItemSize, CSSProperties> = {
  default: {
    'padding-left': '0.75rem',
    'padding-right': '0.75rem',
    'padding-top': '0.5rem',
    'padding-bottom': '0.5rem',
    'font-size': tokenVar('font-size-body-small'),
  },
  sm: {
    'padding-left': '0.5rem',
    'padding-right': '0.5rem',
    'padding-top': '0.375rem',
    'padding-bottom': '0.375rem',
    'font-size': tokenVar('font-size-label-small'),
  },
  lg: {
    'padding-left': '1rem',
    'padding-right': '1rem',
    'padding-top': '0.75rem',
    'padding-bottom': '0.75rem',
    'font-size': tokenVar('font-size-body-medium'),
  },
};

// ============================================================================
// Sub-part Styles
// ============================================================================

/**
 * Icon slot wrapper -- prevents icon shrink and inherits text color.
 */
export const itemIcon: CSSProperties = {
  'flex-shrink': '0',
  color: 'currentColor',
  display: 'inline-flex',
  'align-items': 'center',
};

/**
 * Content wrapper -- stacks label and description vertically.
 */
export const itemContent: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  'min-width': '0',
  flex: '1 1 0%',
};

/**
 * Label slot -- truncates overflowing text.
 */
export const itemLabel: CSSProperties = {
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
};

/**
 * Description slot -- muted, smaller text with top spacing.
 */
export const itemDescription: CSSProperties = {
  overflow: 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
  color: tokenVar('color-muted-foreground'),
  'font-size': tokenVar('font-size-label-small'),
  'margin-top': '0.125rem',
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface ItemStylesheetOptions {
  size?: ItemSize | undefined;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * Build the complete item stylesheet for a given configuration.
 *
 * Unknown size keys fall back to 'default' via pick(). Never throws.
 * Emits a hover rule scoped to `.item:not([data-selected]):not([data-disabled]):hover`,
 * a focus-visible ring, selected and disabled state rules, and a
 * prefers-reduced-motion block that neutralises the transition.
 */
export function itemStylesheet(options: ItemStylesheetOptions = {}): string {
  const { size, selected, disabled } = options;

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule(
      '.item',
      itemBase,
      pick(itemSizeStyles, size, 'default'),
      when(selected, itemSelected),
      when(disabled, itemDisabled),
    ),

    styleRule('.item:not([data-selected]):not([data-disabled]):hover', itemHover),

    styleRule('.item:focus-visible', itemFocusVisible),

    styleRule('.item-icon', itemIcon),
    styleRule('.item-content', itemContent),
    styleRule('.item-label', itemLabel),
    styleRule('.item-description', itemDescription),

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.item', { transition: 'none' })),
  );
}
