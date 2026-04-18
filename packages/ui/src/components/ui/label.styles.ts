/**
 * Shadow DOM style definitions for Label web component
 *
 * Parallel to label.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 * Token values via tokenVar() from the shared token stylesheet.
 *
 * All token references go through tokenVar(); no raw var() literals.
 *
 * NOTE: Tailwind's `peer-disabled:` pseudo-selectors from label.classes.ts
 * intentionally do NOT appear here. Those selectors depend on a sibling
 * <input> in the light tree; the shadow boundary breaks that association.
 * Consumers are responsible for reflecting disabled/required state outside
 * the shadow root.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { pick, styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Public Types
// ============================================================================

export type LabelVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Base label declarations shared across every variant.
 * Mirrors labelBaseClasses from label.classes.ts:
 *   - text-label-medium        -> font-size: var(--font-size-label-medium)
 *   - leading-none             -> line-height: 1
 *
 * The Tailwind `peer-disabled:` utilities are intentionally omitted; see the
 * file header for the rationale.
 */
export const labelBase: CSSProperties = {
  'font-size': tokenVar('font-size-label-medium'),
  'line-height': '1',
};

// ============================================================================
// Variant Styles
// ============================================================================

/**
 * Per-variant foreground colour, mirroring labelVariantClasses.
 * `muted` intentionally uses `color-muted-foreground` to match Tailwind's
 * `text-muted-foreground` utility.
 */
export const labelVariantStyles: Record<LabelVariant, CSSProperties> = {
  default: {
    color: tokenVar('color-foreground'),
  },
  primary: {
    color: tokenVar('color-primary'),
  },
  secondary: {
    color: tokenVar('color-secondary'),
  },
  destructive: {
    color: tokenVar('color-destructive'),
  },
  success: {
    color: tokenVar('color-success'),
  },
  warning: {
    color: tokenVar('color-warning'),
  },
  info: {
    color: tokenVar('color-info'),
  },
  muted: {
    color: tokenVar('color-muted-foreground'),
  },
  accent: {
    color: tokenVar('color-accent'),
  },
};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface LabelStylesheetOptions {
  variant?: LabelVariant | undefined;
}

/**
 * Build the complete label stylesheet for a given configuration.
 *
 * Unknown variant keys fall back to 'default' via pick(). Never throws.
 */
export function labelStylesheet(options: LabelStylesheetOptions = {}): string {
  const { variant } = options;

  return stylesheet(
    styleRule(':host', { display: 'inline-block' }),

    styleRule('.label', labelBase, pick(labelVariantStyles, variant, 'default')),
  );
}
