/**
 * Shadow DOM style definitions for Empty web component
 *
 * Parallel to empty.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 * Token values via tokenVar() -- never raw var() literals.
 *
 * This issue scopes to the outer <rafters-empty> container. The child
 * selectors (.empty-icon, .empty-title, .empty-description, .empty-action)
 * are emitted here for future sibling web components or ::slotted targeting
 * of light-tree children.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { styleRule, stylesheet, tokenVar } from '../../primitives/classy-wc';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Outer container base styles.
 * Mirrors emptyBaseClasses: flex flex-col items-center justify-center
 * gap-4 py-12 text-center.
 */
export const emptyBase: CSSProperties = {
  display: 'flex',
  'flex-direction': 'column',
  'align-items': 'center',
  'justify-content': 'center',
  gap: tokenVar('spacing-4'),
  'padding-top': tokenVar('spacing-12'),
  'padding-bottom': tokenVar('spacing-12'),
  'text-align': 'center',
};

// ============================================================================
// Sub-component Styles
// ============================================================================

/**
 * Icon wrapper styles.
 * Mirrors emptyIconClasses: text-muted-foreground [&>svg]:h-12 [&>svg]:w-12.
 * Descendant-svg sizing uses a child combinator on svg.
 */
export const emptyIcon: CSSProperties = {
  color: tokenVar('color-muted-foreground'),
};

export const emptyIconSvg: CSSProperties = {
  height: tokenVar('spacing-12'),
  width: tokenVar('spacing-12'),
};

/**
 * Title styles.
 * Mirrors emptyTitleClasses: text-title-medium text-foreground.
 */
export const emptyTitle: CSSProperties = {
  'font-size': tokenVar('font-size-title-medium'),
  color: tokenVar('color-foreground'),
};

/**
 * Description styles.
 * Mirrors emptyDescriptionClasses: max-w-sm text-body-small text-muted-foreground.
 * Tailwind max-w-sm resolves to 24rem; there is no direct size-* token for
 * that value, so we emit the literal to preserve visual parity with the React
 * and Astro targets.
 */
export const emptyDescription: CSSProperties = {
  'max-width': '24rem',
  'font-size': tokenVar('font-size-body-small'),
  color: tokenVar('color-muted-foreground'),
};

/**
 * Action wrapper styles.
 * Mirrors emptyActionClasses: empty -- no explicit declarations needed.
 * Reserved for future sibling web components.
 */
export const emptyAction: CSSProperties = {};

// ============================================================================
// Assembled Stylesheet
// ============================================================================

/**
 * Build the complete empty stylesheet.
 *
 * Emits the outer .empty container plus selectors for future icon/title/
 * description/action child components. The child selectors are harmless
 * noise until sibling web components ship, but having them in the adopted
 * sheet now means consumers can ::slotted() target them without a follow-up.
 */
export function emptyStylesheet(): string {
  return stylesheet(
    styleRule(':host', { display: 'block' }),

    styleRule('.empty', emptyBase),

    styleRule('.empty-icon', emptyIcon),
    styleRule('.empty-icon > svg', emptyIconSvg),

    styleRule('.empty-title', emptyTitle),

    styleRule('.empty-description', emptyDescription),
  );
}
