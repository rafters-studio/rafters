/**
 * Shared button-group layout class definitions
 *
 * Imported by button-group.tsx (React), button-group.astro (Astro), and the
 * button-group Web Component to keep the connected-border and focus-stacking
 * rules in one place, so every framework target shares the same semantic
 * surface. The Web Component renders its inner markup from these strings and
 * keeps only its irreducible :host / ::slotted shadow CSS inline.
 */

// ============================================================================
// Base Classes
// ============================================================================

/**
 * Always-on layout primitives for a button group container.
 * Orientation-specific flex-direction is appended by the consumer.
 */
export const buttonGroupBaseClasses = 'inline-flex';

/**
 * Per-orientation flex-direction utility.
 */
export const buttonGroupOrientationClasses: Record<string, string> = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

// ============================================================================
// Attached-Button Connected-Border Classes
// ============================================================================

/**
 * Connected-border rules for horizontal groups.
 *   - First child: clear right radius so it joins the next button.
 *   - Last child: clear left radius so it joins the prior button.
 *   - Middle children: clear both so they sit flush between neighbors.
 *   - Non-first children: negative left margin collapses the shared 1px border.
 */
export const buttonGroupHorizontalConnectedClasses = [
  '[&>*:first-child]:rounded-r-none',
  '[&>*:last-child]:rounded-l-none',
  '[&>*:not(:first-child):not(:last-child)]:rounded-none',
  '[&>*:not(:first-child)]:-ml-px',
].join(' ');

/**
 * Connected-border rules for vertical groups.
 *   - First child: clear bottom radius so it joins the next button.
 *   - Last child: clear top radius so it joins the prior button.
 *   - Middle children: clear both so they sit flush between neighbors.
 *   - Non-first children: negative top margin collapses the shared 1px border.
 */
export const buttonGroupVerticalConnectedClasses = [
  '[&>*:first-child]:rounded-b-none',
  '[&>*:last-child]:rounded-t-none',
  '[&>*:not(:first-child):not(:last-child)]:rounded-none',
  '[&>*:not(:first-child)]:-mt-px',
].join(' ');

// ============================================================================
// Focus Stacking
// ============================================================================

/**
 * Raise the currently focus-visible child above its neighbors so the focus
 * ring is not clipped by overlapping borders.
 */
export const buttonGroupFocusStackingClasses = '[&>*:focus-visible]:z-10';
