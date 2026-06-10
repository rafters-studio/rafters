/**
 * Harmony generation for design systems using pure OKLCH hue rotation.
 *
 * Rule: harmonies are PURE HUE ROTATIONS. L and C are never mutated.
 * Only H changes. Every output goes through toNearestGamut() then roundOKLCH().
 */

import type { ColorHarmonies, OKLCH } from '@rafters/shared';
import { roundOKLCH } from './conversion';
import { toNearestGamut } from './gamut';
import { adjustHue } from './manipulation';

/** Clamp an OKLCH to sRGB gamut and round. */
function clampColor(color: OKLCH): OKLCH {
  return roundOKLCH(toNearestGamut(color).color);
}

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

  const positions = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const baseIndex = 6; // 600 position

  const lightness: Record<string, number> = {};

  for (let i = 0; i < baseIndex; i++) {
    const stepsFromBase = baseIndex - i;
    const totalLighterSteps = baseIndex;

    const t = (stepsFromBase / totalLighterSteps) ** 0.8;
    const calculatedL = baseLightness + (MAX_LIGHT - baseLightness) * t;

    const pos = positions[i];
    if (pos !== undefined) lightness[pos.toString()] = Math.min(MAX_LIGHT, calculatedL);
  }

  lightness['600'] = baseLightness;

  for (let i = baseIndex + 1; i < positions.length; i++) {
    const stepsFromBase = i - baseIndex;
    const totalDarkerSteps = positions.length - 1 - baseIndex;

    const t = stepsFromBase / totalDarkerSteps;
    const darkenAmount = (baseLightness - MIN_DARK) * t;
    const calculatedL = Math.max(MIN_DARK, baseLightness - darkenAmount);

    const pos = positions[i];
    if (pos !== undefined) lightness[pos.toString()] = calculatedL;
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

/**
 * Colors get cooler and lighter with distance
 * Applied to UI: background colors should be cooler/lighter, foreground warmer/darker
 */
export function calculateAtmosphericWeight(color: OKLCH): {
  distanceWeight: number; // 0 = background, 1 = foreground
  temperature: 'warm' | 'neutral' | 'cool';
  atmosphericRole: 'background' | 'midground' | 'foreground';
} {
  const hue = color.h;
  const warmHues = (hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360);
  const coolHues = hue >= 180 && hue <= 270;

  const lightnessWeight = color.l;

  let distanceWeight = 0;

  if (warmHues) {
    distanceWeight += 0.3;
  } else if (coolHues) {
    distanceWeight -= 0.2;
  }

  distanceWeight += (1 - lightnessWeight) * 0.4;
  distanceWeight += color.c * 1.5;

  distanceWeight = Math.max(0, Math.min(1, distanceWeight));

  const temperature = warmHues ? 'warm' : coolHues ? 'cool' : 'neutral';

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
  const chromaWeight = Math.min(1, color.c / 0.3);

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
