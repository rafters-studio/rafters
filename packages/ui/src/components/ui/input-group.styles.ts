/**
 * Shadow DOM style definitions for InputGroup / InputGroupAddon web components.
 *
 * Parallel to input-group.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * InputGroup is a layout-composition element -- it wraps a slotted input and
 * optional start/end addon siblings, providing a group-level focus ring and
 * normalised slotted-input styling (flex-fill, no border, no outline).
 *
 * All token references go through tokenVar() -- no raw CSS custom-property
 * function literals appear in this module.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, pick, styleRule, stylesheet, tokenVar, when } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type InputGroupSize = 'sm' | 'default' | 'lg';
export type InputGroupAddonPosition = 'start' | 'end';
export type InputGroupAddonVariant = 'default' | 'filled';

export interface InputGroupStylesheetOptions {
  size?: InputGroupSize | undefined;
  disabled?: boolean | undefined;
}

export interface InputGroupAddonStylesheetOptions {
  position?: InputGroupAddonPosition | undefined;
  variant?: InputGroupAddonVariant | undefined;
}

// ============================================================================
// InputGroup Container Styles
// ============================================================================

/**
 * Base container declarations applied to the inner `.group` element.
 * The host remains a pure layout shell; visual chrome lives on the inner
 * wrapper so consumers can target `:host(:focus-within) .group` unambiguously.
 */
export const inputGroupContainerBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  width: '100%',
  'border-radius': tokenVar('radius-md'),
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': tokenVar('color-input'),
  'background-color': tokenVar('color-background'),
};

/**
 * Focus-within ring applied when any slotted descendant receives focus.
 * Double-ring layout: inner offset painted in the page background, outer
 * ring in the neutral ring token.
 */
export const inputGroupFocusWithin: CSSProperties = {
  outline: 'none',
  'box-shadow': `0 0 0 2px ${tokenVar('color-background')}, 0 0 0 4px ${tokenVar('color-ring')}`,
};

/**
 * Host-level disabled state -- translucent + not-allowed cursor.
 */
export const inputGroupDisabled: CSSProperties = {
  opacity: '0.5',
  cursor: 'not-allowed',
};

/**
 * Size-to-height map. Each size also tunes the shared font-size token used
 * by the slotted input inside the group.
 */
export const inputGroupSizeStyles: Record<InputGroupSize, CSSProperties> = {
  sm: {
    height: '2.25rem',
    'font-size': tokenVar('font-size-label-small'),
  },
  default: {
    height: '2.5rem',
    'font-size': tokenVar('font-size-body-small'),
  },
  lg: {
    height: '2.75rem',
    'font-size': tokenVar('font-size-body-medium'),
  },
};

// ============================================================================
// Slotted Input Normalisation
// ============================================================================

/**
 * Declarations merged into `::slotted(input), ::slotted(rafters-input)` so any
 * slotted control fills the group, loses its own border/outline, and inherits
 * the group-level padding and border radius.
 */
export const inputGroupSlottedInput: CSSProperties = {
  flex: '1',
  height: '100%',
  width: '100%',
  'background-color': 'transparent',
  border: 'none',
  outline: 'none',
  'padding-left': tokenVar('spacing-3'),
  'padding-right': tokenVar('spacing-3'),
  'border-radius': 'inherit',
};

// ============================================================================
// InputGroupAddon Styles
// ============================================================================

/**
 * Base addon declarations -- horizontal flex, centred, never shrinks, muted
 * foreground text, and gutter padding.
 */
export const inputGroupAddonBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'flex-shrink': '0',
  color: tokenVar('color-muted-foreground'),
  'padding-left': tokenVar('spacing-3'),
  'padding-right': tokenVar('spacing-3'),
};

export const inputGroupAddonStartStyles: CSSProperties = {
  'border-right-width': '1px',
  'border-right-style': 'solid',
  'border-right-color': tokenVar('color-input'),
};

export const inputGroupAddonEndStyles: CSSProperties = {
  'border-left-width': '1px',
  'border-left-style': 'solid',
  'border-left-color': tokenVar('color-input'),
};

export const inputGroupAddonFilledStyles: CSSProperties = {
  'background-color': tokenVar('color-muted'),
};

export const inputGroupAddonPositionStyles: Record<InputGroupAddonPosition, CSSProperties> = {
  start: inputGroupAddonStartStyles,
  end: inputGroupAddonEndStyles,
};

export const inputGroupAddonVariantStyles: Record<InputGroupAddonVariant, CSSProperties> = {
  default: {},
  filled: inputGroupAddonFilledStyles,
};

// ============================================================================
// Assembled Stylesheets
// ============================================================================

/**
 * Build the complete input-group stylesheet for a given configuration.
 *
 * Composition:
 *   :host                                -> display: block
 *   :host([data-disabled])               -> opacity + cursor (mirror for host)
 *   .group                               -> base border/radius/background + size height
 *   :host(:focus-within) .group          -> ring
 *   ::slotted(input), ::slotted(rafters-input) -> fill, no border, shared padding
 *   ::slotted([disabled])                -> cursor propagation
 *   @media reduced-motion                -> transition: none (guard placeholder)
 *
 * Unknown size silently falls back to `default`. Never throws.
 */
export function inputGroupStylesheet(options: InputGroupStylesheetOptions = {}): string {
  const { size, disabled } = options;

  const safeSize: InputGroupSize =
    size && size in inputGroupSizeStyles ? (size as InputGroupSize) : 'default';

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule(
      '.group',
      inputGroupContainerBase,
      pick(inputGroupSizeStyles, safeSize, 'default'),
      when(disabled, inputGroupDisabled),
    ),

    styleRule(':host(:focus-within) .group', inputGroupFocusWithin),

    styleRule(':host([data-disabled]) .group', inputGroupDisabled),

    styleRule('::slotted(input), ::slotted(rafters-input)', inputGroupSlottedInput),

    styleRule('::slotted([disabled])', { cursor: 'not-allowed' }),

    atRule('@media (prefers-reduced-motion: reduce)', styleRule('.group', { transition: 'none' })),
  );
}

/**
 * Build the complete input-group-addon stylesheet for a given configuration.
 *
 * Composition:
 *   :host                               -> display: flex (host participates in group row)
 *   .addon                              -> base flex + padding + muted fg + position border
 *   .addon (variant=filled)             -> muted background
 *
 * Unknown position silently falls back to `start`. Unknown variant silently
 * falls back to `default`. Never throws.
 */
export function inputGroupAddonStylesheet(options: InputGroupAddonStylesheetOptions = {}): string {
  const { position, variant } = options;

  const safePosition: InputGroupAddonPosition =
    position && position in inputGroupAddonPositionStyles
      ? (position as InputGroupAddonPosition)
      : 'start';

  const safeVariant: InputGroupAddonVariant =
    variant && variant in inputGroupAddonVariantStyles
      ? (variant as InputGroupAddonVariant)
      : 'default';

  return stylesheet(
    styleRule(':host', { display: 'flex' }),

    styleRule(
      '.addon',
      inputGroupAddonBase,
      pick(inputGroupAddonPositionStyles, safePosition, 'start'),
      pick(inputGroupAddonVariantStyles, safeVariant, 'default'),
    ),
  );
}
