/**
 * Perceptual hue-bar warp
 * UI layout math for the hue-bar widget: maps a normalized bar position to a
 * hue angle and back. Not color-space math -- there is no @rafters/color-utils
 * analog. Pure, zero dependencies, zero side effects.
 */

// -- Perceptual hue warp --
// Sine warp gives reds/oranges (H~0-60) more bar space,
// compresses cyans (H~180). Derivative at t=0 is 0.1 (10x density).
const HUE_WARP_A = 0.9;
const TWO_PI = 2 * Math.PI;

/**
 * Convert a normalized bar position (0-1) to a hue angle (0-360).
 * Uses sine warp: g(t) = t - a * sin(2*pi*t) / (2*pi)
 */
export function hueFromBarPos(t: number): number {
  return (t - (HUE_WARP_A * Math.sin(TWO_PI * t)) / TWO_PI) * 360;
}

/**
 * Convert a hue angle (0-360) to a normalized bar position (0-1).
 * Newton's method inverse of hueFromBarPos, 10 iterations.
 */
export function barPosFromHue(h: number): number {
  const target = h / 360;
  let t = target;
  for (let i = 0; i < 10; i++) {
    const g = t - (HUE_WARP_A * Math.sin(TWO_PI * t)) / TWO_PI;
    const gp = 1 - HUE_WARP_A * Math.cos(TWO_PI * t);
    t = t - (g - target) / gp;
  }
  return Math.max(0, Math.min(1, t));
}
