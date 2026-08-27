/**
 * OKLCH color conversion functions using colorjs.io
 */

import type { OKLCH } from '@rafters/shared';
import Color from 'colorjs.io';

/** Options for formatting an OKLCH color as a CSS `oklch()` string. */
export interface OklchToCSSOptions {
  /**
   * Decimal places applied to every emitted channel (L, C, H, and A when
   * present). Omitted means no rounding: channels are stringified as-is.
   */
  precision?: number;
}

/**
 * Convert OKLCH to a CSS oklch() function string.
 *
 * Emits `oklch(L C H)`, or `oklch(L C H / A)` when alpha is defined and not 1.
 * With no options and no alpha the output is byte-identical to the original
 * three-channel formatter -- design-tokens callers depend on that exact string.
 */
export function oklchToCSS(oklch: OKLCH, options?: OklchToCSSOptions): string {
  const precision = options?.precision;
  const format = (value: number): string =>
    precision === undefined ? String(value) : value.toFixed(precision);

  const base = `${format(oklch.l)} ${format(oklch.c)} ${format(oklch.h)}`;
  const { alpha } = oklch;
  if (alpha === undefined || alpha === 1) {
    return `oklch(${base})`;
  }
  return `oklch(${base} / ${format(alpha)})`;
}

/**
 * Convert hex string to OKLCH color object
 */
export function hexToOKLCH(hex: string): OKLCH {
  try {
    const color = new Color(hex);
    const oklch = color.to('oklch');

    // colorjs.io returns boxed `Number` objects (not primitives) for some
    // input formats (oklch() literals notably). Schemas downstream check
    // `typeof === 'number'` and reject boxed Numbers. Coerce to primitives
    // here so every consumer sees plain numbers.
    return {
      l: Number(oklch.coords[0] ?? 0),
      c: Number(oklch.coords[1] ?? 0),
      // Achromatic colors (grays) get NaN hue from colorjs.io, not undefined
      h: Number.isNaN(oklch.coords[2]) ? 0 : Number(oklch.coords[2] ?? 0),
      alpha: Number(oklch.alpha ?? 1),
    };
  } catch (_error) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
}

/**
 * Predicate-form CSS color parser. Returns the parsed OKLCH on success and
 * null on any parse failure (invalid format, missing channels, gibberish).
 *
 * Used by callers that need to test "is this string a color?" without a
 * try/catch around `hexToOKLCH` (which throws). Despite the historical name,
 * `hexToOKLCH` already accepts every CSS color format via colorjs.io --
 * `tryParseColor` is just the null-on-failure wrapper.
 */
export function tryParseColor(css: string): OKLCH | null {
  try {
    return hexToOKLCH(css);
  } catch {
    return null;
  }
}

/**
 * Round OKLCH values to standard precision for consistency
 * L and C: 3 decimal places (perceptually meaningful differentiation)
 * H: whole degrees, Alpha: 2 decimal places
 * Prevents floating point precision issues and optimizes cache keys
 */
export function roundOKLCH(oklch: OKLCH): OKLCH {
  return {
    l: Math.round(oklch.l * 1000) / 1000,
    c: Math.round(oklch.c * 1000) / 1000,
    // NaN hue from achromatic colors defaults to 0
    h: Number.isNaN(oklch.h) ? 0 : Math.round(oklch.h),
    alpha: oklch.alpha !== undefined ? Math.round(oklch.alpha * 100) / 100 : 1,
  };
}
