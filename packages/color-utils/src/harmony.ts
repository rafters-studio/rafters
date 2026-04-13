/**
 * Harmony generation for design systems using pure OKLCH hue rotation.
 *
 * Rule: harmonies are PURE HUE ROTATIONS. L and C are never mutated.
 * Only H changes. Every output goes through toNearestGamut() then roundOKLCH().
 */

import type { ColorHarmonies, OKLCH } from '@rafters/shared';
import { calculateWCAGContrast } from './accessibility';
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
 * Generate semantic color suggestions based on color theory and conventional expectations
 * Each semantic color gets multiple suggestions for user choice
 */
export function generateSemanticColorSuggestions(baseColor: OKLCH): {
  danger: OKLCH[];
  success: OKLCH[];
  warning: OKLCH[];
  info: OKLCH[];
} {
  // Danger colors - Red region (0-30 and 330-360) - Keep them vibrant, not dark
  const danger: OKLCH[] = [
    // Bright red
    roundOKLCH({
      l: Math.max(0.55, Math.min(0.7, baseColor.l + 0.1)),
      c: Math.min(0.25, baseColor.c * 1.2),
      h: 15,
      alpha: 1,
    }),
    // Warmer red
    roundOKLCH({
      l: Math.max(0.6, Math.min(0.75, baseColor.l + 0.15)),
      c: Math.min(0.22, baseColor.c * 1.1),
      h: 25,
      alpha: 1,
    }),
    // Cooler red
    roundOKLCH({
      l: Math.max(0.5, Math.min(0.65, baseColor.l + 0.05)),
      c: Math.min(0.23, baseColor.c * 1.15),
      h: 5,
      alpha: 1,
    }),
  ];

  // Success colors - Green region (120-150) - Make them brighter and more optimistic
  const success: OKLCH[] = [
    // Fresh green
    roundOKLCH({
      l: Math.max(0.6, Math.min(0.75, baseColor.l + 0.15)),
      c: Math.min(0.2, baseColor.c * 0.9),
      h: 135,
      alpha: 1,
    }),
    // Vibrant green
    roundOKLCH({
      l: Math.max(0.55, Math.min(0.7, baseColor.l + 0.1)),
      c: Math.min(0.22, baseColor.c * 1.0),
      h: 145,
      alpha: 1,
    }),
    // Bright green
    roundOKLCH({
      l: Math.max(0.65, Math.min(0.8, baseColor.l + 0.2)),
      c: Math.min(0.24, baseColor.c * 1.1),
      h: 125,
      alpha: 1,
    }),
  ];

  // Warning colors - Orange/Yellow region (30-70) - Keep these bright
  const warning: OKLCH[] = [
    // Orange
    roundOKLCH({
      l: Math.max(0.7, Math.min(0.8, baseColor.l + 0.15)),
      c: Math.min(0.2, baseColor.c * 0.95),
      h: 45,
      alpha: 1,
    }),
    // Amber
    roundOKLCH({
      l: Math.max(0.75, Math.min(0.85, baseColor.l + 0.2)),
      c: Math.min(0.18, baseColor.c * 0.9),
      h: 55,
      alpha: 1,
    }),
    // Yellow-orange
    roundOKLCH({
      l: Math.max(0.72, Math.min(0.82, baseColor.l + 0.17)),
      c: Math.min(0.19, baseColor.c * 0.92),
      h: 35,
      alpha: 1,
    }),
  ];

  // Info colors - Blue region (200-240) - Make them more vibrant, less muddy
  const info: OKLCH[] = [
    // Sky blue
    roundOKLCH({
      l: Math.max(0.6, Math.min(0.75, baseColor.l + 0.1)),
      c: Math.min(0.2, baseColor.c * 0.9),
      h: 220,
      alpha: 1,
    }),
    // Ocean blue
    roundOKLCH({
      l: Math.max(0.55, Math.min(0.7, baseColor.l + 0.05)),
      c: Math.min(0.22, baseColor.c * 1.0),
      h: 230,
      alpha: 1,
    }),
    // Electric blue
    roundOKLCH({
      l: Math.max(0.5, Math.min(0.65, baseColor.l)),
      c: Math.min(0.25, baseColor.c * 1.1),
      h: 240,
      alpha: 1,
    }),
  ];

  // Gamut-clamp every suggestion to sRGB so badges report gold, not fail.
  const clamp = (c: OKLCH): OKLCH => toNearestGamut(c).color;

  return {
    danger: danger.map(clamp),
    success: success.map(clamp),
    warning: warning.map(clamp),
    info: info.map(clamp),
  };
}

/**
 * Generate intelligent background/foreground combinations for a color scale
 * Analyzes contrast ratios and suggests optimal pairings - Pure OKLCH
 */
function generateColorCombinations(colorScale: Record<string, OKLCH>) {
  const combinations: {
    background: OKLCH;
    foreground: OKLCH;
    backgroundTint: string;
    foregroundTint: string;
    contrastRatio: number;
    usage: 'primary' | 'secondary' | 'subtle';
  }[] = [];

  const lightBackgrounds = ['50', '100', '200'];
  const darkForegrounds = ['700', '800', '900'];

  for (const bgTint of lightBackgrounds) {
    for (const fgTint of darkForegrounds) {
      if (colorScale[bgTint] && colorScale[fgTint]) {
        const bgOklch = colorScale[bgTint];
        const fgOklch = colorScale[fgTint];

        const contrast = calculateWCAGContrast(bgOklch, fgOklch);

        combinations.push({
          background: bgOklch,
          foreground: fgOklch,
          backgroundTint: bgTint,
          foregroundTint: fgTint,
          contrastRatio: contrast,
          usage: contrast >= 7 ? 'primary' : contrast >= 4.5 ? 'secondary' : 'subtle',
        });
      }
    }
  }

  return combinations.sort((a, b) => b.contrastRatio - a.contrastRatio).slice(0, 6);
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
 * Generate semantic color system with intelligent background/foreground suggestions - Pure OKLCH
 * Currently unused but preserved for future semantic color system features
 * @internal
 */
export function generateSemanticColorSystem(baseColor: OKLCH) {
  const suggestions = generateSemanticColorSuggestions(baseColor);
  const semanticSystem: {
    [K in keyof typeof suggestions]: {
      colors: OKLCH[];
      scale: Record<string, OKLCH>;
      combinations?: ReturnType<typeof generateColorCombinations>;
    };
  } = {
    danger: { colors: suggestions.danger, scale: {} },
    success: { colors: suggestions.success, scale: {} },
    warning: { colors: suggestions.warning, scale: {} },
    info: { colors: suggestions.info, scale: {} },
  };

  for (const [semanticType, colors] of Object.entries(suggestions)) {
    if (colors.length > 0 && colors[0]) {
      const baseSemanticColor = colors[0];

      const colorScale = generateOKLCHScale(baseSemanticColor);
      const combinations = generateColorCombinations(colorScale);

      semanticSystem[semanticType as keyof typeof semanticSystem].scale = colorScale;
      semanticSystem[semanticType as keyof typeof semanticSystem].combinations = combinations;
    }
  }

  return semanticSystem;
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
 * how adjacent colors affect each other
 * Calculates optimal contrast relationships for UI hierarchies
 */
function calculateSimultaneousContrast(
  baseColor: OKLCH,
  adjacentColors: OKLCH[],
): {
  enhancedColor: OKLCH;
  contrastRatio: number;
  harmonicTension: number; // 0-1, aesthetic tension level
} {
  let avgLightness = 0;
  let avgChroma = 0;
  let avgHueX = 0;
  let avgHueY = 0;

  for (const color of adjacentColors) {
    avgLightness += color.l;
    avgChroma += color.c;
    avgHueX += Math.cos((color.h * Math.PI) / 180) * color.c;
    avgHueY += Math.sin((color.h * Math.PI) / 180) * color.c;
  }

  const count = adjacentColors.length;
  avgLightness /= count;
  avgChroma /= count;
  const avgHue = Math.atan2(avgHueY, avgHueX) * (180 / Math.PI);
  const normalizedAvgHue = ((avgHue % 360) + 360) % 360;

  let enhancedLightness = baseColor.l;
  let enhancedChroma = baseColor.c;
  let enhancedHue = baseColor.h;

  if (avgLightness > 0.6) {
    enhancedLightness = Math.max(0.1, baseColor.l - 0.2);
  } else if (avgLightness < 0.4) {
    enhancedLightness = Math.min(0.9, baseColor.l + 0.2);
  }

  if (avgChroma < 0.1) {
    enhancedChroma = Math.min(0.3, baseColor.c * 1.5);
  }

  const hueDifference = Math.abs(baseColor.h - normalizedAvgHue);
  if (hueDifference < 30) {
    enhancedHue = (baseColor.h + 15) % 360;
  }

  const enhancedColor = roundOKLCH({
    l: enhancedLightness,
    c: enhancedChroma,
    h: enhancedHue,
    alpha: baseColor.alpha,
  });

  const harmonicTension = Math.min(
    1,
    (Math.abs(enhancedLightness - avgLightness) +
      Math.abs(enhancedChroma - avgChroma) * 2 +
      Math.min(hueDifference, 360 - hueDifference) / 180) /
      3,
  );

  const contrastRatio = calculateWCAGContrast(
    { l: avgLightness, c: avgChroma, h: normalizedAvgHue, alpha: 1 },
    enhancedColor,
  );

  return {
    enhancedColor,
    contrastRatio,
    harmonicTension,
  };
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

/**
 * semantic color enhancement
 * Applies atmospheric perspective, simultaneous contrast, and perceptual weight
 */
export function generateSemanticColors(
  baseColor: OKLCH,
  semanticSuggestions: ReturnType<typeof generateSemanticColorSuggestions>,
) {
  const enhancedSystem: {
    [K in keyof typeof semanticSuggestions]: {
      colors: (OKLCH & {
        atmosphericWeight: ReturnType<typeof calculateAtmosphericWeight>;
        perceptualWeight: ReturnType<typeof calculatePerceptualWeight>;
        enhancedVersion?: OKLCH;
        harmonicTension?: number;
      })[];
      contextualRecommendations: string[];
    };
  } = {
    danger: { colors: [], contextualRecommendations: [] },
    success: { colors: [], contextualRecommendations: [] },
    warning: { colors: [], contextualRecommendations: [] },
    info: { colors: [], contextualRecommendations: [] },
  };

  const allSemanticColors = Object.values(semanticSuggestions).flat();
  const contextColors = [baseColor, ...allSemanticColors.slice(0, 3)];

  for (const [semanticType, colors] of Object.entries(semanticSuggestions)) {
    const enhancedColors = colors.map((color) => {
      const atmosphericWeight = calculateAtmosphericWeight(color);
      const perceptualWeight = calculatePerceptualWeight(color);

      const contrastAnalysis = calculateSimultaneousContrast(color, contextColors);

      return {
        ...roundOKLCH(color),
        atmosphericWeight,
        perceptualWeight,
        enhancedVersion: roundOKLCH(contrastAnalysis.enhancedColor),
        harmonicTension: contrastAnalysis.harmonicTension,
      };
    });

    const recommendations: string[] = [];

    const backgroundColors = enhancedColors.filter(
      (c) => c.atmosphericWeight.atmosphericRole === 'background',
    );
    const foregroundColors = enhancedColors.filter(
      (c) => c.atmosphericWeight.atmosphericRole === 'foreground',
    );

    if (backgroundColors.length > 0) {
      recommendations.push(`Use ${semanticType} backgrounds for subtle, receding elements`);
    }
    if (foregroundColors.length > 0) {
      recommendations.push(`Use ${semanticType} foregrounds for prominent, advancing elements`);
    }

    const heavyColors = enhancedColors.filter((c) => c.perceptualWeight.density === 'heavy');
    const lightColors = enhancedColors.filter((c) => c.perceptualWeight.density === 'light');

    if (heavyColors.length > 0) {
      recommendations.push(
        `Heavy ${semanticType} colors work best for critical actions and alerts`,
      );
    }
    if (lightColors.length > 0) {
      recommendations.push(
        `Light ${semanticType} colors ideal for backgrounds and subtle indicators`,
      );
    }

    const warmColors = enhancedColors.filter((c) => c.atmosphericWeight.temperature === 'warm');
    const coolColors = enhancedColors.filter((c) => c.atmosphericWeight.temperature === 'cool');

    if (warmColors.length > 0 && semanticType === 'danger') {
      recommendations.push('Warm danger colors create urgency and immediate attention');
    }
    if (coolColors.length > 0 && semanticType === 'info') {
      recommendations.push('Cool info colors convey calm, trustworthy information');
    }

    enhancedSystem[semanticType as keyof typeof enhancedSystem] = {
      colors: enhancedColors,
      contextualRecommendations: recommendations,
    };
  }

  return enhancedSystem;
}
