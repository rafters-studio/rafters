/**
 * Internal numeric helpers shared across the package.
 *
 * These are the idioms that were repeated inline in half a dozen modules:
 * clamping a channel, normalizing a hue angle, and the two chroma ceilings.
 * Not part of the public surface -- nothing here is re-exported from index.ts.
 */

/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Clamp a value into [0, 1] -- the range every OKLCH lightness and alpha lives in. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Normalize a hue angle into [0, 360), handling negative and over-wrapped input. */
export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/**
 * Upper bound for a chroma search: no OKLCH color in any display gamut we
 * care about exceeds this, so binary searches and bucket clamps start here.
 */
export const MAX_CHROMA = 0.4;

/**
 * Chroma ceiling for "as vivid as a generated color may get". Deliberately
 * lower than MAX_CHROMA and deliberately a separate constant: this is a design
 * cap on generated output, not a bound on what OKLCH can represent.
 */
export const VIVID_CHROMA_CAP = 0.3;
