/**
 * Shadow DOM style definitions for AspectRatio web component
 *
 * Parallel to aspect-ratio.classes.ts. Same semantic structure,
 * CSS property maps instead of Tailwind class strings.
 *
 * The `aspect-ratio` CSS property is data-driven (caller-supplied number)
 * so it lives on the `.aspect-ratio` rule composed inside the stylesheet
 * rather than inline on the element. Slotted descendants receive fill
 * declarations via `::slotted(*)` because Tailwind's `[&>*]` descendant
 * selectors from the React/Astro classes.ts cannot cross the shadow
 * boundary.
 *
 * All token references go through tokenVar(); no raw var() literals
 * appear outside the classy-wc primitives.
 */

import type { CSSProperties } from '../../primitives/classy-wc';
import { styleRule, stylesheet } from '../../primitives/classy-wc';

// ============================================================================
// Base Styles
// ============================================================================

/**
 * Host block layout. AspectRatio is a full-width proportional container.
 */
export const aspectRatioHostBase: CSSProperties = {
  display: 'block',
  position: 'relative',
  width: '100%',
};

/**
 * Inner wrapper base. Carries the `aspect-ratio` property the consumer
 * requested. Width is inherited from the host.
 */
export const aspectRatioInnerBase: CSSProperties = {
  position: 'relative',
  width: '100%',
};

/**
 * Slotted-child fill rule -- shadow-DOM equivalent of the React target's
 * `[&>*]:absolute [&>*]:inset-0 [&>*]:h-full [&>*]:w-full` selectors.
 * `object-fit: cover` matches the common `<img>` / `<iframe>` use case
 * documented on aspect-ratio.tsx.
 */
export const aspectRatioSlottedFill: CSSProperties = {
  position: 'absolute',
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
  width: '100%',
  height: '100%',
  'object-fit': 'cover',
};

// ============================================================================
// Ratio Parsing
// ============================================================================

/**
 * Parse a raw ratio input into a positive number.
 *
 * Accepted formats:
 *  - `"16/9"` -> 16 / 9 = 1.7777...
 *  - `"1.778"` -> 1.778
 *  - `1` (numeric) -> 1
 *
 * Non-positive or non-numeric values silently fall back to 1, matching
 * the behaviour documented on the React target (`ratio = 1` default).
 */
export function parseRatio(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 1;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? input : 1;
  }
  const trimmed = input.trim();
  if (trimmed === '') return 1;
  if (trimmed.includes('/')) {
    const [rawNum, rawDen] = trimmed.split('/');
    const num = Number(rawNum);
    const den = Number(rawDen);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 1;
    const quotient = num / den;
    return quotient > 0 ? quotient : 1;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

// ============================================================================
// Assembled Stylesheet
// ============================================================================

export interface AspectRatioStylesheetOptions {
  ratio?: string | number | null | undefined;
}

/**
 * Build the complete aspect-ratio stylesheet for a given ratio.
 *
 * Emits:
 *   - `:host` host-level block layout
 *   - `.aspect-ratio` inner wrapper carrying the resolved `aspect-ratio`
 *     CSS property
 *   - `::slotted(*)` fill rule so slotted `<img>` / `<iframe>` / other
 *     children fill the container (shadow-boundary equivalent of the
 *     React target's `[&>*]` selectors)
 *
 * Non-positive or non-numeric ratio values silently fall back to 1.
 * Never throws.
 */
export function aspectRatioStylesheet(options: AspectRatioStylesheetOptions = {}): string {
  const ratio = parseRatio(options.ratio);

  return stylesheet(
    styleRule(':host', aspectRatioHostBase),

    styleRule('.aspect-ratio', aspectRatioInnerBase, {
      'aspect-ratio': String(ratio),
    }),

    styleRule('::slotted(*)', aspectRatioSlottedFill),
  );
}
