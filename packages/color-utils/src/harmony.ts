/**
 * Harmony generation for design systems using pure OKLCH hue rotation.
 *
 * Rule: harmonies are PURE HUE ROTATIONS. L and C are never mutated.
 * Only H changes. Every output goes through toNearestGamut() then roundOKLCH().
 */

import type { ColorHarmonies, OKLCH } from '@rafters/shared';
import { roundOKLCH } from './conversion.js';
import { clampColor } from './gamut.js';
import { adjustHue } from './manipulation.js';
import { POSITION_TO_INDEX, SCALE_POSITIONS } from './scale-positions.js';

/**
 * Generate pure OKLCH harmony arrays from a base color.
 *
 * Counts (per the spec):
 * - complementary: 1 color (+180)
 * - triadic: 3 colors (base, +120, +240)
 * - analogous: 6 colors (-45, -30, -15, +15, +30, +45)
 * - tetradic: 4 colors (base, +90, +180, +270)
 * - splitComplementary: 3 colors (base, +150, +210)
 * - monochromatic: 6 colors (same hue, L steps at 0.15/0.30/0.45/0.60/0.75/0.90,
 *     chroma reduced at extremes)
 *
 * L and C are preserved exactly from the base color in all hue-rotation harmonies.
 */
export function generateHarmony(baseColor: OKLCH): ColorHarmonies {
  const base = clampColor(baseColor);

  // complementary: 1 color at +180
  const complementary = clampColor(adjustHue(baseColor, 180));

  // triadic: base, +120, +240
  const triadic: OKLCH[] = [
    base,
    clampColor(adjustHue(baseColor, 120)),
    clampColor(adjustHue(baseColor, 240)),
  ];

  // analogous: -45, -30, -15, +15, +30, +45
  const analogous: OKLCH[] = [
    clampColor(adjustHue(baseColor, -45)),
    clampColor(adjustHue(baseColor, -30)),
    clampColor(adjustHue(baseColor, -15)),
    clampColor(adjustHue(baseColor, 15)),
    clampColor(adjustHue(baseColor, 30)),
    clampColor(adjustHue(baseColor, 45)),
  ];

  // tetradic: base, +90, +180, +270
  const tetradic: OKLCH[] = [
    base,
    clampColor(adjustHue(baseColor, 90)),
    clampColor(adjustHue(baseColor, 180)),
    clampColor(adjustHue(baseColor, 270)),
  ];

  // splitComplementary: base, +150, +210
  const splitComplementary: OKLCH[] = [
    base,
    clampColor(adjustHue(baseColor, 150)),
    clampColor(adjustHue(baseColor, 210)),
  ];

  // monochromatic: 6 steps at fixed L values, same H, chroma reduced at extremes
  const MONO_LIGHTNESS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9] as const;
  const monochromatic: OKLCH[] = MONO_LIGHTNESS.map((l) => {
    // Reduce chroma at extreme ends to avoid gamut clipping artifacts
    const c = l <= 0.15 || l >= 0.9 ? baseColor.c * 0.5 : baseColor.c;
    return clampColor({ ...baseColor, l, c });
  });

  return {
    complementary,
    triadic,
    analogous,
    tetradic,
    splitComplementary,
    monochromatic,
  };
}

/**
 * Validate if a color is suitable for scale generation
 * Too light or too dark colors don't generate useful scales
 */
function validateScaleGeneration(baseColor: OKLCH): {
  isValid: boolean;
  reason?: string;
  suggestedLightness?: number;
} {
  const l = baseColor.l;

  if (l > 0.85) {
    return {
      isValid: false,
      reason: 'Color too light for scale generation',
      suggestedLightness: 0.7,
    };
  }

  if (l < 0.15) {
    return {
      isValid: false,
      reason: 'Color too dark for scale generation',
      suggestedLightness: 0.4,
    };
  }

  return { isValid: true };
}

/**
 * Generate lightness progression using mathematical functions.
 * Base color positioned at 600, with 6 lighter steps above + 4 darker + 950.
 * Power curve (t^0.8) for tints creates natural spacing weighted toward white.
 * Linear progression for shades keeps darkening predictable.
 */
function generateLightnessProgression(baseLightness: number): Record<string, number> {
  const MAX_LIGHT = 0.95;
  const MIN_DARK = 0.05;

  const positions = SCALE_POSITIONS;
  const baseIndex = POSITION_TO_INDEX['600'] ?? 6;

  const lightness: Record<string, number> = {};

  for (let i = 0; i < baseIndex; i++) {
    const stepsFromBase = baseIndex - i;
    const totalLighterSteps = baseIndex;

    const t = (stepsFromBase / totalLighterSteps) ** 0.8;
    const calculatedL = baseLightness + (MAX_LIGHT - baseLightness) * t;

    const pos = positions[i];
    if (pos !== undefined) lightness[pos] = Math.min(MAX_LIGHT, calculatedL);
  }

  lightness['600'] = baseLightness;

  for (let i = baseIndex + 1; i < positions.length; i++) {
    const stepsFromBase = i - baseIndex;
    const totalDarkerSteps = positions.length - 1 - baseIndex;

    const t = stepsFromBase / totalDarkerSteps;
    const darkenAmount = (baseLightness - MIN_DARK) * t;
    const calculatedL = Math.max(MIN_DARK, baseLightness - darkenAmount);

    const pos = positions[i];
    if (pos !== undefined) lightness[pos] = calculatedL;
  }

  return lightness;
}

/**
 * Generate OKLCH color scale from base color.
 * Creates 50-950 scale with mathematical lightness progression anchored at 600.
 * Chroma reduced only at extreme lightness to avoid perceptual artifacts.
 */
export function generateOKLCHScale(baseColor: OKLCH): Record<string, OKLCH> {
  const validation = validateScaleGeneration(baseColor);

  if (!validation.isValid) {
    const adjustedColor = validation.suggestedLightness
      ? { ...baseColor, l: validation.suggestedLightness }
      : baseColor;
    return generateOKLCHScale(adjustedColor);
  }

  const lightnessSteps = generateLightnessProgression(baseColor.l);

  const scale: Record<string, OKLCH> = {};

  for (const [step, lightness] of Object.entries(lightnessSteps)) {
    let adjustedChroma = baseColor.c;

    if (lightness > 0.9) {
      adjustedChroma *= 0.3;
    } else if (lightness < 0.15) {
      adjustedChroma *= 0.6;
    }

    scale[step] = roundOKLCH({
      l: lightness,
      c: adjustedChroma,
      h: baseColor.h,
      alpha: baseColor.alpha,
    });
  }

  return scale;
}
