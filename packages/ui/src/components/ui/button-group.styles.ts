/**
 * Shadow DOM style definitions for ButtonGroup web component
 *
 * Parallel to button-group.classes.ts. Same semantic structure (connected
 * borders, focus stacking, horizontal/vertical orientation) expressed as
 * CSS property maps and ::slotted() rules for a shadow root.
 *
 * All token references go through tokenVar() when used; no raw var()
 * literals. Motion hooks use --motion-duration-* / --motion-ease-* only
 * (this component defines no transitions, but the reduced-motion guard
 * is kept as a placeholder for pattern consistency).
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { styleRule, stylesheet } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type ButtonGroupOrientation = 'horizontal' | 'vertical';

export interface ButtonGroupStylesheetOptions {
  orientation?: ButtonGroupOrientation | undefined;
}

// ============================================================================
// Allowed Value Sets
// ============================================================================

const ORIENTATIONS: ReadonlyArray<ButtonGroupOrientation> = ['horizontal', 'vertical'];

export function isButtonGroupOrientation(value: unknown): value is ButtonGroupOrientation {
  return typeof value === 'string' && (ORIENTATIONS as ReadonlyArray<string>).includes(value);
}

// ============================================================================
// Base Styles
// ============================================================================

/**
 * :host layout primitive per orientation. Groups are inline-flex so they can
 * sit inline with surrounding content and so focus outlines on their children
 * are not clipped by a block formatting context.
 */
export const buttonGroupBase: Record<ButtonGroupOrientation, CSSProperties> = {
  horizontal: {
    display: 'inline-flex',
    'flex-direction': 'row',
  },
  vertical: {
    display: 'inline-flex',
    'flex-direction': 'column',
  },
};

// ============================================================================
// Connected-Border Styles (per orientation)
// ============================================================================

/**
 * Radius collapse rules for the first, last, and middle slotted elements.
 * Applied to whatever is slotted -- typically <rafters-button> or native
 * <button>, but the rules are element-agnostic.
 */
const horizontalFirst: CSSProperties = {
  'border-top-right-radius': '0',
  'border-bottom-right-radius': '0',
};

const horizontalLast: CSSProperties = {
  'border-top-left-radius': '0',
  'border-bottom-left-radius': '0',
};

const horizontalMiddle: CSSProperties = {
  'border-radius': '0',
};

const horizontalNeighbor: CSSProperties = {
  'margin-left': '-1px',
};

const verticalFirst: CSSProperties = {
  'border-bottom-right-radius': '0',
  'border-bottom-left-radius': '0',
};

const verticalLast: CSSProperties = {
  'border-top-right-radius': '0',
  'border-top-left-radius': '0',
};

const verticalMiddle: CSSProperties = {
  'border-radius': '0',
};

const verticalNeighbor: CSSProperties = {
  'margin-top': '-1px',
};

/**
 * Focus stacking -- raise the focused child above its neighbors so the
 * focus ring is not clipped by overlapping borders.
 */
const focusStacking: CSSProperties = {
  'z-index': '10',
};

// ============================================================================
// Orientation Rule Builders
// ============================================================================

function horizontalRules(): string {
  return stylesheet(
    styleRule('::slotted(*:first-child)', horizontalFirst),
    styleRule('::slotted(*:last-child)', horizontalLast),
    styleRule('::slotted(*:not(:first-child):not(:last-child))', horizontalMiddle),
    styleRule('::slotted(*:not(:first-child))', horizontalNeighbor),
    styleRule('::slotted(*:focus-visible)', focusStacking),
  );
}

function verticalRules(): string {
  return stylesheet(
    styleRule('::slotted(*:first-child)', verticalFirst),
    styleRule('::slotted(*:last-child)', verticalLast),
    styleRule('::slotted(*:not(:first-child):not(:last-child))', verticalMiddle),
    styleRule('::slotted(*:not(:first-child))', verticalNeighbor),
    styleRule('::slotted(*:focus-visible)', focusStacking),
  );
}

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete button-group stylesheet for a given orientation.
 *
 * Pure: identical options always yield identical output.
 * Unknown orientation silently falls back to 'horizontal'.
 */
export function buttonGroupStylesheet(options: ButtonGroupStylesheetOptions = {}): string {
  const orientation: ButtonGroupOrientation = isButtonGroupOrientation(options.orientation)
    ? options.orientation
    : 'horizontal';

  const slottedRules = orientation === 'vertical' ? verticalRules() : horizontalRules();

  return stylesheet(styleRule(':host', buttonGroupBase[orientation]), slottedRules);
}
