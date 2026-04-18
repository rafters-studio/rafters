/**
 * Shadow DOM style definitions for InputOTP web component
 *
 * Parallel to input-otp.classes.ts. Same semantic structure,
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

export interface InputOtpStylesheetOptions {
  disabled?: boolean | undefined;
}

// ============================================================================
// Base Styles
// ============================================================================

export const inputOtpContainerBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  gap: tokenVar('spacing-2'),
};

export const inputOtpGroupBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
};

export const inputOtpSlotBase: CSSProperties = {
  position: 'relative',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  height: '2.25rem',
  width: '2.25rem',
  'border-top-width': '1px',
  'border-right-width': '1px',
  'border-bottom-width': '1px',
  'border-style': 'solid',
  'border-color': tokenVar('color-input'),
  'font-size': tokenVar('font-size-body-small'),
  'box-shadow': '0 1px 2px 0 rgba(0,0,0,0.05)',
  transition: transition(
    ['background-color', 'border-color', 'box-shadow'],
    tokenVar('motion-duration-fast'),
    tokenVar('motion-ease-standard'),
  ),
};

export const inputOtpSlotFirst: CSSProperties = {
  'border-left-width': '1px',
  'border-top-left-radius': tokenVar('radius-md'),
  'border-bottom-left-radius': tokenVar('radius-md'),
};

export const inputOtpSlotLast: CSSProperties = {
  'border-top-right-radius': tokenVar('radius-md'),
  'border-bottom-right-radius': tokenVar('radius-md'),
};

export const inputOtpSlotActive: CSSProperties = {
  'z-index': '10',
  'box-shadow': `0 0 0 1px ${tokenVar('color-ring')}`,
  'border-color': tokenVar('color-ring'),
};

export const inputOtpSlotFilled: CSSProperties = {
  color: tokenVar('color-foreground'),
};

export const inputOtpSlotDisabled: CSSProperties = {
  cursor: 'not-allowed',
  opacity: '0.5',
};

export const inputOtpSeparatorBase: CSSProperties = {
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  color: tokenVar('color-muted-foreground'),
};

export const inputOtpCaretBase: CSSProperties = {
  'pointer-events': 'none',
  position: 'absolute',
  inset: '0',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
};

export const inputOtpCaretBar: CSSProperties = {
  width: '0.0625rem',
  height: '1rem',
  'background-color': tokenVar('color-foreground'),
  animation: 'otp-blink 1s step-end infinite',
};

export const inputOtpHiddenInput: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  'white-space': 'nowrap',
  border: '0',
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete input-otp stylesheet for a given configuration.
 *
 * Composition:
 *   :host                         -> display: inline-flex
 *   .container                    -> flex container with gap
 *   .group                        -> flex group of slots
 *   .slot                         -> slot box with token-driven border + shadow
 *   .slot:first-of-type           -> left rounded + left border
 *   .slot:last-of-type            -> right rounded
 *   .slot[data-active]            -> ring + active border
 *   .slot[data-filled]            -> foreground color
 *   .caret                        -> centered absolute container
 *   .caret-bar                    -> blinking bar (animated)
 *   .separator                    -> muted-foreground centered
 *   .hidden-input                 -> sr-only style equivalent
 *   :host([data-disabled])        -> disabled cursor + opacity (when disabled)
 *   @keyframes otp-blink          -> declared in-sheet
 *   @media reduced-motion         -> transition + animation: none
 */
export function inputOtpStylesheet(options: InputOtpStylesheetOptions = {}): string {
  const { disabled = false } = options;

  return stylesheet(
    styleRule(':host', { display: 'inline-flex' }),

    styleRule('.container', inputOtpContainerBase),

    styleRule('.group', inputOtpGroupBase),

    styleRule('.slot', inputOtpSlotBase),

    styleRule('.slot:first-of-type', inputOtpSlotFirst),

    styleRule('.slot:last-of-type', inputOtpSlotLast),

    styleRule('.slot[data-active]', inputOtpSlotActive),

    styleRule('.slot[data-filled]', inputOtpSlotFilled),

    styleRule('.caret', inputOtpCaretBase),

    styleRule('.caret-bar', inputOtpCaretBar),

    styleRule('.separator', inputOtpSeparatorBase),

    styleRule('.hidden-input', inputOtpHiddenInput),

    disabled ? styleRule('.slot', inputOtpSlotDisabled) : '',

    // Keyframes for the caret blink animation. Declared in-sheet so the
    // animation resolves inside the shadow root without a global stylesheet.
    atRule('@keyframes otp-blink', styleRule('50%', { opacity: '0' })),

    atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule('.slot', { transition: 'none' }),
      styleRule('.caret-bar', { animation: 'none' }),
    ),
  );
}
