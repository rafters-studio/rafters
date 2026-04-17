/**
 * Shadow DOM style definitions for Separator web component
 *
 * Parallel to separator.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 * Token values via tokenVar() from the shared token stylesheet.
 *
 * All token references go through tokenVar(); no raw var() literals.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { pick, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type SeparatorOrientation = 'horizontal' | 'vertical';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Base separator declarations shared across both orientations.
 * Mirrors separatorBaseClasses from separator.classes.ts
 * (`shrink-0 bg-border`).
 */
export const separatorBase: CSSProperties = {
  'flex-shrink': '0',
  'background-color': tokenVar('color-border'),
};

// ============================================================================
// Orientation Styles
// ============================================================================

/**
 * Orientation-driven sizing declarations.
 * horizontal = 1px tall, fills available width.
 * vertical   = fills available height, 1px wide.
 */
export const separatorOrientationStyles: Record<SeparatorOrientation, CSSProperties> = {
  horizontal: {
    height: '1px',
    width: '100%',
  },
  vertical: {
    height: '100%',
    width: '1px',
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface SeparatorStylesheetOptions {
  orientation?: SeparatorOrientation | undefined;
}

/**
 * Build the complete separator stylesheet for a given configuration.
 *
 * Unknown orientation keys fall back to 'horizontal' via pick(). Never throws.
 * The inner `.separator` div carries both the base color and orientation
 * sizing rules. `:host` is block-level by default; orientation-specific
 * host sizing is left to the consumer so vertical separators stretch to
 * fill their flex/grid parent naturally.
 */
export function separatorStylesheet(options: SeparatorStylesheetOptions = {}): string {
  const { orientation } = options;

  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule(
      '.separator',
      separatorBase,
      pick(separatorOrientationStyles, orientation, 'horizontal'),
    ),
  );
}
