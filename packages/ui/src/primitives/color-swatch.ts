/**
 * Color Swatch primitive
 * Applies OKLCH color styling and ARIA attributes to an element
 *
 * Framework-agnostic, SSR-safe. The caller provides the element
 * and color values; the primitive sets backgroundColor, role, and
 * aria-label. Gamut tier is an optional caller-provided label --
 * this primitive never computes gamut fitness.
 *
 * @example
 * ```typescript
 * const cleanup = createSwatch(el, { l: 0.6, c: 0.15, h: 250 });
 *
 * // later, on pointer move:
 * updateSwatch(el, { l: 0.7, c: 0.12, h: 260, tier: 'srgb' });
 *
 * // teardown
 * cleanup();
 * ```
 *
 * @internal-dependencies @rafters/color-utils
 */

import { oklchToCSS } from '@rafters/color-utils';
import type { CleanupFunction, GamutTier } from './types';

export interface SwatchOptions {
  /** OKLCH lightness (0-1) */
  l: number;
  /** OKLCH chroma (0-~0.4) */
  c: number;
  /** OKLCH hue (0-360) */
  h: number;
  /** Alpha channel (0-1, default 1) */
  alpha?: number;
  /** Gamut tier label (caller-provided, swatch just stores as data attribute) */
  tier?: GamutTier;
  /** Selected state */
  selected?: boolean;
}

/**
 * Build the oklch() CSS string from options
 */
export function toOklch(options: SwatchOptions): string {
  return oklchToCSS({ ...options, alpha: options.alpha ?? 1 });
}

/**
 * Build a human-readable aria-label for the swatch
 */
function toAriaLabel(options: SwatchOptions): string {
  const base = `Color: ${toOklch(options)}`;
  if (options.tier) {
    return `${base}, gamut: ${options.tier}`;
  }
  return base;
}

/**
 * Apply swatch styling and ARIA attributes to an element.
 * Returns a cleanup function that restores original state.
 */
export function createSwatch(element: HTMLElement, options: SwatchOptions): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const prevBackgroundColor = element.style.backgroundColor;
  const prevRole = element.getAttribute('role');
  const prevAriaLabel = element.getAttribute('aria-label');
  const prevGamutTier = element.getAttribute('data-gamut-tier');
  const prevSelected = element.getAttribute('data-selected');

  applySwatch(element, options);

  return () => {
    element.style.backgroundColor = prevBackgroundColor;

    restoreAttribute(element, 'role', prevRole);
    restoreAttribute(element, 'aria-label', prevAriaLabel);
    restoreAttribute(element, 'data-gamut-tier', prevGamutTier);
    restoreAttribute(element, 'data-selected', prevSelected);
  };
}

/**
 * Update an existing swatch without teardown/rebuild.
 * Useful for pointer tracking where options change frequently.
 */
export function updateSwatch(element: HTMLElement, options: SwatchOptions): void {
  if (typeof window === 'undefined') {
    return;
  }
  applySwatch(element, options);
}

/**
 * Apply styles and attributes to an element (shared by create and update)
 */
function applySwatch(element: HTMLElement, options: SwatchOptions): void {
  element.style.backgroundColor = toOklch(options);
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', toAriaLabel(options));

  if (options.tier) {
    element.setAttribute('data-gamut-tier', options.tier);
  } else {
    element.removeAttribute('data-gamut-tier');
  }

  if (options.selected) {
    element.setAttribute('data-selected', '');
  } else {
    element.removeAttribute('data-selected');
  }
}

/**
 * Restore an attribute to its previous value, or remove it if it was absent
 */
function restoreAttribute(element: HTMLElement, name: string, previous: string | null): void {
  if (previous === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previous);
  }
}
