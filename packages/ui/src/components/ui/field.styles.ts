/**
 * Shadow DOM style definitions for Field web component
 *
 * Parallel to field.classes.ts. Same semantic structure, CSS property maps
 * instead of Tailwind class strings. Field is a layout-composition wrapper:
 * flex column container stacks label + slotted control + helper/error.
 *
 * All token references go through tokenVar(); no raw var() literals.
 * Motion uses --motion-duration-* / --motion-ease-* only.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { atRule, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Container shell: flex column with consistent gap between label, control,
 * and helper/error. Mirrors `flex flex-col gap-2` from field.classes.ts.
 */
export const fieldContainerBase: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  gap: tokenVar('spacing-2'),
};

/**
 * Label typography: medium label ramp, medium weight, neutral foreground.
 */
export const fieldLabelBase: CSSProperties = {
  'font-size': tokenVar('font-size-label-medium'),
  'font-weight': '500',
  color: tokenVar('color-foreground'),
};

/**
 * Required indicator next to the label text. `aria-hidden` on the span keeps
 * screen readers from reading the asterisk; `aria-required` on the control
 * carries the semantic.
 */
export const fieldLabelRequiredMarker: CSSProperties = {
  color: tokenVar('color-destructive'),
  'margin-left': '0.25rem',
};

/**
 * Helper text shown under the control when no error is present.
 */
export const fieldDescriptionBase: CSSProperties = {
  'font-size': tokenVar('font-size-label-small'),
  color: tokenVar('color-muted-foreground'),
};

/**
 * Error text shown under the control; replaces description when set.
 */
export const fieldErrorBase: CSSProperties = {
  'font-size': tokenVar('font-size-label-small'),
  color: tokenVar('color-destructive'),
};

/**
 * Disabled state: dim the label while the slotted control carries the
 * native `disabled` attribute for interaction blocking.
 */
export const fieldDisabled: CSSProperties = {
  opacity: '0.5',
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface FieldStylesheetOptions {
  disabled?: boolean | undefined;
  error?: boolean | undefined;
}

/**
 * Build the complete field stylesheet for a given configuration.
 *
 * Unknown options fall back to the default layout. Never throws.
 * Emits :host display:block plus .container / .label / .required /
 * .description / .error rules and a prefers-reduced-motion block that
 * neutralises transitions on descendants.
 */
export function fieldStylesheet(options: FieldStylesheetOptions = {}): string {
  const { disabled, error } = options;

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule('.container', fieldContainerBase),

    styleRule('.label', fieldLabelBase, disabled ? fieldDisabled : null),

    styleRule('.label .required', fieldLabelRequiredMarker),

    styleRule('.description', fieldDescriptionBase),

    error ? styleRule('.error', fieldErrorBase) : '',

    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.container', { transition: 'none' }),
    ),
  );
}
