/**
 * Measured constants for createNormalizedScale.
 *
 * Source: the hand-tuned palettes in platform's colour seed
 * (apps/api/seed/colors.json) -- Tailwind, Material, Open Color, Ant and
 * Chakra -- 66 chromatic palettes, each interpolated to 11 positions, median
 * across palettes, measured 2026-10-26. Radix is excluded: its light and dark
 * scales are mixed in the data. Every array runs lightest (50) to darkest (950).
 */

/**
 * Step lightness, by ladder.
 * deep: Tailwind, Ant and Chakra, 38 palettes (17, 12 and 9).
 * compact: Material and Open Color, 28 palettes (16 and 12).
 */
export const LIGHTNESS_LADDERS = {
  deep: [0.978, 0.942, 0.896, 0.827, 0.74, 0.67, 0.593, 0.52, 0.451, 0.392, 0.292],
  compact: [0.964, 0.925, 0.874, 0.811, 0.762, 0.719, 0.677, 0.644, 0.6, 0.543, 0.49],
} as const;

/**
 * Step chroma as a share of the sRGB chroma maximum at the step's lightness
 * and hue.
 * gamut: the maximum itself, by definition.
 * measured: all five systems, 66 palettes.
 */
export const CHROMA_SHARE = {
  gamut: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  measured: [0.97, 0.95, 0.92, 0.9, 0.94, 0.95, 0.97, 0.97, 0.97, 0.92, 0.94],
} as const;

/**
 * Hue drift in degrees, relative to the palette's middle step (500), keyed by
 * band centre hue (0 = red, 60 = amber, 90 = yellow, ... 330). All five
 * systems, 66 palettes; the count per band is HUE_DRIFT_SAMPLES.
 */
export const HUE_DRIFT_BANDS = {
  0: [-10.0, -9.1, -6.6, -4.6, -2.8, 0.0, -0.8, -2.2, -3.4, -4.6, -7.0],
  30: [-7.0, -4.0, -5.4, -3.8, -2.4, 0.0, 0.0, -0.4, -1.3, -2.1, -2.5],
  60: [25.5, 25.6, 22.4, 17.8, 10.2, 3.2, -2.4, -7.6, -11.1, -13.8, -16.0],
  90: [11.0, 10.1, 10.0, 8.6, 6.0, 1.5, -3.6, -10.3, -17.6, -24.8, -32.0],
  120: [-9.0, -7.2, -6.2, -4.0, -2.0, -0.5, 0.4, 1.0, 2.0, 2.0, 2.0],
  150: [4.0, 1.6, 1.6, 1.2, 0.7, 0.0, 0.2, 0.6, 1.5, 2.5, 2.0],
  180: [3.5, 2.6, 1.2, 1.2, 0.9, 0.5, 0.4, 1.0, 1.9, 1.5, 4.5],
  210: [-10.0, -9.3, -8.4, -6.6, -3.4, -1.5, 0.4, 0.4, 1.2, 2.2, 4.0],
  240: [-10.0, -8.1, -6.4, -7.0, -4.0, -1.0, 0.8, 2.6, 4.4, 6.1, 7.0],
  270: [-4.0, -3.5, -2.2, -0.8, 0.5, 0.2, 0.2, 0.4, 0.0, 1.0, 2.0],
  300: [7.0, 7.0, 6.2, 4.6, 2.6, 0.5, -1.2, -2.3, -2.5, -2.5, -2.5],
  330: [-2.0, -0.4, 0.0, 0.7, 1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0],
} as const;

/** Palettes per hue band behind HUE_DRIFT_BANDS (66 in all); 330 (pink) rests on 3. */
export const HUE_DRIFT_SAMPLES = {
  0: 5,
  30: 8,
  60: 6,
  90: 7,
  120: 5,
  150: 6,
  180: 4,
  210: 5,
  240: 5,
  270: 6,
  300: 6,
  330: 3,
} as const;
