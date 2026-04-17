/**
 * Shadow DOM style definitions for RadioGroup web component.
 *
 * Parallel to radio-group.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * All token references go through tokenVar() -- no raw CSS
 * custom-property function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 *
 * Two public stylesheet factories:
 *   - radioGroupStylesheet({ orientation }) for <rafters-radio-group>
 *   - radioItemStylesheet({ checked, disabled }) for <rafters-radio-item>
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, styleRule, stylesheet, tokenVar, transition } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type RadioOrientation = 'horizontal' | 'vertical';

export interface RadioGroupStylesheetOptions {
  orientation?: RadioOrientation | undefined;
}

export interface RadioItemStylesheetOptions {
  checked?: boolean | undefined;
  disabled?: boolean | undefined;
}

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Layout declarations for the group container keyed by orientation.
 * Vertical groups use grid for predictable row gutters; horizontal
 * groups use flex so wrapped items flow naturally.
 */
export const radioGroupBase: Record<RadioOrientation, CSSProperties> = {
  vertical: {
    display: 'grid',
    gap: tokenVar('spacing-2'),
  },
  horizontal: {
    display: 'flex',
    gap: tokenVar('spacing-2'),
  },
};

/**
 * Base declarations for the inner radio button element. Transparent
 * background; the indicator span fills it when checked.
 */
export const radioItemBase: CSSProperties = {
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'aspect-ratio': '1',
  height: '1rem',
  width: '1rem',
  'border-radius': '9999px',
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': tokenVar('color-primary'),
  color: tokenVar('color-primary'),
  'background-color': 'transparent',
  cursor: 'pointer',
  padding: '0',
  transition: transition(
    ['border-color', 'color'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

/**
 * Focus-visible ring declarations. Double-ring pattern matches the
 * checkbox/button primitives: background-offset inner ring plus the
 * shared focus ring token.
 */
export const radioItemFocusVisible: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

/**
 * Disabled-state declarations applied on the host and on the inner
 * <button>. Radios never submit when disabled.
 */
export const radioItemDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
};

/**
 * Indicator dot declarations. Shown when the item is checked;
 * hidden (display: none) otherwise. Fill uses currentColor so the
 * dot tracks the item foreground.
 */
export const radioItemIndicator: CSSProperties = {
  display: 'block',
  height: '0.5rem',
  width: '0.5rem',
  'border-radius': '9999px',
  'background-color': 'currentColor',
};

// ============================================================================
// Assembled Stylesheets
// ============================================================================

/**
 * Coerce an arbitrary orientation string into the narrow union.
 * Unknown values silently fall back to 'vertical' so arbitrary
 * attribute values never throw at composition time.
 */
function resolveOrientation(orientation: RadioOrientation | undefined): RadioOrientation {
  if (orientation === 'horizontal' || orientation === 'vertical') return orientation;
  return 'vertical';
}

/**
 * Build the group container stylesheet.
 *
 * Composition:
 *   :host                              -> radioGroupBase[orientation]
 *   @media reduced-motion              -> no-op for the group (items own transitions)
 *
 * Unknown orientation falls back to 'vertical'.
 */
export function radioGroupStylesheet(options: RadioGroupStylesheetOptions = {}): string {
  const orientation = resolveOrientation(options.orientation);

  return stylesheet(
    styleRule(':host', radioGroupBase[orientation]),

    atRule('@media (prefers-reduced-motion: reduce)', styleRule(':host', { transition: 'none' })),
  );
}

/**
 * Build the radio item stylesheet.
 *
 * Composition:
 *   :host                              -> display: inline-flex
 *   .radio                             -> base + optional disabled
 *   .radio:focus-visible               -> focus ring
 *   .radio:disabled                    -> disabled declarations
 *   .indicator                         -> indicator dot (display toggles on checked)
 *   @media reduced-motion              -> transition: none on .radio
 *
 * Unknown options fall back to uncontrolled defaults.
 */
export function radioItemStylesheet(options: RadioItemStylesheetOptions = {}): string {
  const { checked = false, disabled = false } = options;

  const indicatorRule: CSSProperties = {
    ...radioItemIndicator,
    display: checked ? 'block' : 'none',
  };

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule('.radio', radioItemBase, disabled ? radioItemDisabled : null),

    styleRule('.radio:focus-visible', radioItemFocusVisible),

    styleRule('.radio:disabled', radioItemDisabled),

    styleRule('.indicator', indicatorRule),

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.radio', { transition: 'none' })),
  );
}
