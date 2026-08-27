/**
 * Color analysis functions for perceptual color properties
 */

import type { OKLCH } from '@rafters/shared';
import { clamp01, normalizeHue, VIVID_CHROMA_CAP } from './internal/math.js';

/**
 * Determine if color is light or dark based on perceptual lightness
 * Uses OKLCH lightness with adjustments for chroma
 */
export function isLightColor(color: OKLCH): boolean {
  // Base threshold at 50% lightness
  let threshold = 0.5;

  // Adjust threshold based on chroma
  // High chroma colors appear darker due to the Helmholtz-Kohlrausch effect
  if (color.c > 0.15) {
    threshold += color.c * 0.3; // Increase threshold for high chroma
  }

  // Very low chroma colors are essentially gray, use simple lightness
  if (color.c < 0.05) {
    threshold = 0.5;
  }

  return color.l > threshold;
}

/**
 * Calculate color temperature (warm/cool/neutral).
 * Based on hue angle and chroma intensity.
 *
 * This is the package's only temperature classifier: everything that needs a
 * warm/cool/neutral verdict (including calculateAtmosphericWeight below) calls
 * it, so two parts of the same ColorValue can never disagree again.
 */
export function getColorTemperature(color: OKLCH): 'warm' | 'cool' | 'neutral' {
  // Very low chroma colors are neutral regardless of hue
  if (color.c < 0.04) {
    return 'neutral';
  }

  const hue = normalizeHue(color.h);

  // Define temperature ranges based on color theory
  // Warm: reds, oranges, yellows, warm purples
  // Cool: greens, cyans, blues, cool purples

  if (
    (hue >= 0 && hue <= 90) || // Red to yellow
    (hue >= 315 && hue < 360) // Red-purple to red
  ) {
    return 'warm';
  }

  if (hue >= 150 && hue <= 270) {
    // Green-cyan to blue-purple
    return 'cool';
  }

  // Boundary zones (yellow-green and purple-red) depend on specific hue
  if (hue > 90 && hue < 150) {
    // Yellow-green to green
    // More yellow = warm, more green = cool
    return hue < 120 ? 'warm' : 'cool';
  }

  if (hue > 270 && hue < 315) {
    // Purple to red-purple
    // More blue = cool, more red = warm
    return hue > 290 ? 'warm' : 'cool';
  }

  // Fallback for edge cases
  return 'neutral';
}

/**
 * Colors get cooler and lighter with distance
 * Applied to UI: background colors should be cooler/lighter, foreground warmer/darker
 *
 * Temperature comes from getColorTemperature -- the same verdict that lands in
 * ColorValue.analysis.temperature -- so the two never contradict each other.
 */
export function calculateAtmosphericWeight(color: OKLCH): {
  distanceWeight: number; // 0 = background, 1 = foreground
  temperature: 'warm' | 'neutral' | 'cool';
  atmosphericRole: 'background' | 'midground' | 'foreground';
} {
  const temperature = getColorTemperature(color);

  const lightnessWeight = color.l;

  let distanceWeight = 0;

  if (temperature === 'warm') {
    distanceWeight += 0.3;
  } else if (temperature === 'cool') {
    distanceWeight -= 0.2;
  }

  distanceWeight += (1 - lightnessWeight) * 0.4;
  distanceWeight += color.c * 1.5;

  distanceWeight = clamp01(distanceWeight);

  let atmosphericRole: 'background' | 'midground' | 'foreground';
  if (distanceWeight < 0.3) atmosphericRole = 'background';
  else if (distanceWeight < 0.7) atmosphericRole = 'midground';
  else atmosphericRole = 'foreground';

  return { distanceWeight, temperature, atmosphericRole };
}

/**
 * some colors feel "heavier" than others
 * Used for visual balance in UI layouts
 */
export function calculatePerceptualWeight(color: OKLCH): {
  weight: number; // 0-1, higher = more visual weight
  density: 'light' | 'medium' | 'heavy';
  balancingRecommendation: string;
} {
  const hue = color.h;
  let hueWeight = 0.5;

  if (hue >= 345 || hue <= 15)
    hueWeight = 0.9; // Red - heaviest
  else if (hue <= 45)
    hueWeight = 0.8; // Red-Orange
  else if (hue <= 75)
    hueWeight = 0.6; // Orange-Yellow
  else if (hue <= 105)
    hueWeight = 0.4; // Yellow-Green
  else if (hue <= 165)
    hueWeight = 0.3; // Green - lightest feeling
  else if (hue <= 225)
    hueWeight = 0.2; // Blue - very light feeling
  else if (hue <= 285)
    hueWeight = 0.35; // Blue-Purple
  else hueWeight = 0.5; // Purple-Red

  const lightnessWeight = 1 - color.l;
  const chromaWeight = Math.min(1, color.c / VIVID_CHROMA_CAP);

  const weight = lightnessWeight * 0.4 + chromaWeight * 0.35 + hueWeight * 0.25;

  let density: 'light' | 'medium' | 'heavy';

  if (weight < 0.3) {
    density = 'light';
  } else if (weight < 0.7) {
    density = 'medium';
  } else {
    density = 'heavy';
  }

  const balancingRecommendation = 'Balanced weight';

  return {
    weight,
    density,
    balancingRecommendation,
  };
}
