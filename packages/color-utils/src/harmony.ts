/**
 * Advanced harmony generation for design systems
 * Inspired by Leonardo's color theory approach
 */

import type { OKLCH } from '@rafters/shared';
import { calculateWCAGContrast } from './accessibility';
import { roundOKLCH } from './conversion';
import { toNearestGamut } from './gamut';
import { generateSurfaceColor } from './manipulation';

/**
 * Generate optimal gray color for a given palette
 * Uses perceptual averaging of the palette's chromatic content
 */
function generateOptimalGray(paletteColors: OKLCH[]): OKLCH {
  // Calculate average chroma and hue, weighted by lightness
  let totalChroma = 0;
  let totalHueX = 0;
  let totalHueY = 0;
  let totalWeight = 0;

  for (const color of paletteColors) {
    // Weight by lightness to favor mid-tone colors
    const weight = 1 - Math.abs(color.l - 0.5) * 2;

    totalChroma += color.c * weight;
    totalHueX += Math.cos((color.h * Math.PI) / 180) * color.c * weight;
    totalHueY += Math.sin((color.h * Math.PI) / 180) * color.c * weight;
    totalWeight += weight;
  }

  const avgChroma = totalWeight > 0 ? totalChroma / totalWeight : 0;
  const avgHue = Math.atan2(totalHueY, totalHueX) * (180 / Math.PI);
  const normalizedHue = ((avgHue % 360) + 360) % 360;

  // Generate a low-chroma gray with subtle color bias
  return roundOKLCH({
    l: 0.5, // Neutral mid-gray lightness
    c: Math.min(0.02, avgChroma * 0.1), // Very low chroma with palette influence
    h: normalizedHue,
    alpha: 1,
  });
}

/**
 * Generate a Rafters harmony plus optimal gray
 * Based on advanced color theory and perceptual optimization
 */
export function generateHarmony(baseColor: OKLCH): {
  base: OKLCH;
  complementary: OKLCH;
  analogous1: OKLCH; // +30° neighbor
  analogous2: OKLCH; // -30° neighbor
  triadic1: OKLCH; // +120°
  triadic2: OKLCH; // +240°
  tetradic1: OKLCH; // +90°
  tetradic2: OKLCH; // +180° (same as complementary)
  tetradic3: OKLCH; // +270°
  splitComplementary1: OKLCH; // +150°
  splitComplementary2: OKLCH; // +210°
  neutral?: OKLCH; // Optional calculated gray
} {
  const base = baseColor;

  // Traditional color theory relationships
  const complementary: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 180) % 360,
    l: baseColor.l > 0.5 ? 0.3 : 0.7, // Ensure contrast
    c: Math.min(0.3, baseColor.c * 1.2), // Boost chroma slightly
  };

  const analogous1: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 30) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l + 0.05)),
    c: baseColor.c * 0.9,
  };

  const analogous2: OKLCH = {
    ...baseColor,
    h: (baseColor.h - 30 + 360) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l - 0.05)),
    c: baseColor.c * 0.9,
  };

  const triadic1: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 120) % 360,
    l: Math.max(0.3, Math.min(0.7, baseColor.l - 0.1)),
    c: baseColor.c * 0.85,
  };

  const triadic2: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 240) % 360,
    l: Math.max(0.3, Math.min(0.7, baseColor.l + 0.1)),
    c: baseColor.c * 0.85,
  };

  const tetradic1: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 90) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l)),
    c: baseColor.c * 0.8,
  };

  const tetradic2 = complementary; // +180° is the same as complementary

  const tetradic3: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 270) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l)),
    c: baseColor.c * 0.8,
  };

  const splitComplementary1: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 150) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l + 0.1)),
    c: baseColor.c * 0.8,
  };

  const splitComplementary2: OKLCH = {
    ...baseColor,
    h: (baseColor.h + 210) % 360,
    l: Math.max(0.2, Math.min(0.8, baseColor.l - 0.1)),
    c: baseColor.c * 0.8,
  };

  // Generate optimal neutral gray from all harmonies
  const allColors = [
    base,
    complementary,
    analogous1,
    analogous2,
    triadic1,
    triadic2,
    tetradic1,
    tetradic3,
    splitComplementary1,
    splitComplementary2,
  ];
  const neutral = generateOptimalGray(allColors);

  return {
    base: roundOKLCH(base),
    complementary: roundOKLCH(complementary),
    analogous1: roundOKLCH(analogous1),
    analogous2: roundOKLCH(analogous2),
    triadic1: roundOKLCH(triadic1),
    triadic2: roundOKLCH(triadic2),
    tetradic1: roundOKLCH(tetradic1),
    tetradic2: roundOKLCH(tetradic2),
    tetradic3: roundOKLCH(tetradic3),
    splitComplementary1: roundOKLCH(splitComplementary1),
    splitComplementary2: roundOKLCH(splitComplementary2),
    neutral: roundOKLCH(neutral),
  };
}

/**
 * Generate Rafters semantic harmony by mapping traditional color theory to design system roles
 * Uses Leonardo theory to intelligently assign traditional harmonies to UI semantics
 */
export function generateRaftersHarmony(baseColor: OKLCH): {
  primary: OKLCH;
  secondary: OKLCH;
  tertiary: OKLCH;
  accent: OKLCH;
  highlight: OKLCH;
  surface: OKLCH;
  neutral: OKLCH;
} {
  // Get traditional color theory harmonies
  const harmony = generateHarmony(baseColor);

  // Map traditional harmonies to Rafters semantic roles using Leonardo theory
  // Primary = the base color (user's choice)
  const primary = harmony.base;

  // Secondary = split-complementary for sophisticated contrast without clash
  const secondary = harmony.splitComplementary1;

  // Tertiary = triadic for visual interest while maintaining harmony
  const tertiary = harmony.triadic1;

  // Accent = complementary for maximum contrast and attention
  const accent = harmony.complementary;

  // Highlight = analogous for subtle emphasis and cohesion
  const highlight = harmony.analogous1;

  // Surface = desaturated version of base for backgrounds
  const surface = generateSurfaceColor(harmony.base);

  // Neutral = calculated optimal gray
  const neutral = harmony.neutral; // Generated by generateHarmony
  if (!neutral) {
    throw new Error('Neutral color not generated in harmony');
  }

  // Gamut-clamp all roles to sRGB so downstream badges/scales stay valid.
  const clamp = (c: OKLCH): OKLCH => toNearestGamut(roundOKLCH(c)).color;

  return {
    primary: clamp(primary),
    secondary: clamp(secondary),
    tertiary: clamp(tertiary),
    accent: clamp(accent),
    highlight: clamp(highlight),
    surface: clamp(surface),
    neutral: clamp(neutral),
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
  // Danger colors - Red region (0-30° and 330-360°) - Keep them vibrant, not dark
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

  // Success colors - Green region (120-150°) - Make them brighter and more optimistic
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

  // Warning colors - Orange/Yellow region (30-70°) - Keep these bright
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

  // Info colors - Blue region (200-240°) - Make them more vibrant, less muddy
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
  // The raw hue+chroma combos above often exceed sRGB at their lightness.
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

  // Define usage patterns based on lightness contrast
  const lightBackgrounds = ['50', '100', '200']; // Light tints for backgrounds
  const darkForegrounds = ['700', '800', '900']; // Dark tints for text

  // Primary combinations: Light backgrounds with dark foregrounds
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

  // Sort by contrast ratio (highest first) and return top combinations
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

  // Too light - won't generate useful darker shades
  if (l > 0.85) {
    return {
      isValid: false,
      reason: 'Color too light for scale generation',
      suggestedLightness: 0.7,
    };
  }

  // Too dark - won't generate useful lighter tints
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
 * Generate lightness progression based on target contrast ratios
 * Optimized for both light and dark mode accessibility
 * Target ratios: 1.01, 1.45, 2.05, 3.0, 4.54, 7.0, 10.86, 11.86, 12.86, 13.86
 */
function generateContrastBasedLightness(baseLightness: number): Record<string, number> {
  // Reference backgrounds for contrast calculations
  const WHITE_L = 1.0; // White background lightness
  const BLACK_L = 0.0; // Black background lightness

  // Target contrast ratios for each scale step
  const targetContrasts: Record<string, number | null> = {
    '50': 1.01, // Ultra-subtle (dark mode borders)
    '100': 1.45, // Subtle (dark mode disabled text)
    '200': 2.05, // Functional (dark mode secondary UI)
    '300': 3.0, // Large text AA minimum
    '400': 4.54, // Normal text AA (light mode)
    '500': null, // Crossover - avoid this zone
    '600': 7.0, // Normal text AAA
    '700': 10.86, // High contrast
    '800': 11.86, // Higher contrast
    '900': 12.86, // Maximum usable
    '950': 13.86, // Absolute maximum
  };

  const lightness: Record<string, number> = {};

  // Helper function to estimate lightness for target contrast on given background
  function lightnessForContrast(targetRatio: number, _backgroundL: number, onDark = false): number {
    // More accurate approximation of WCAG contrast requirements
    // WCAG formula: (L1 + 0.05) / (L2 + 0.05) where L1 > L2

    if (onDark) {
      // For dark backgrounds (L ≈ 0), we want: (L + 0.05) / (0 + 0.05) = targetRatio
      // So: L = (targetRatio * 0.05) - 0.05
      const calculatedL = targetRatio * 0.05 - 0.05;
      return Math.max(0.05, Math.min(0.98, calculatedL));
    }
    // For light backgrounds (L ≈ 1), we want: (1 + 0.05) / (L + 0.05) = targetRatio
    // So: L = (1.05 / targetRatio) - 0.05
    const calculatedL = 1.05 / targetRatio - 0.05;
    return Math.max(0.01, Math.min(0.95, calculatedL));
  }

  // Generate scale values
  for (const [step, targetRatio] of Object.entries(targetContrasts)) {
    if (targetRatio === null) {
      // 500 is the problematic crossover - use base or interpolated value
      lightness[step] = baseLightness;
      continue;
    }

    let calculatedL: number;

    if (Number.parseInt(step, 10) <= 400) {
      // Light scale (50-400): These should be light colors for use on dark backgrounds
      // High step numbers = higher contrast = lighter colors
      calculatedL = lightnessForContrast(targetRatio, BLACK_L, true);

      // Light steps should progress from very light (50) to medium-light (400)
      const stepNum = Number.parseInt(step, 10);
      if (stepNum === 50)
        calculatedL = 0.98; // Nearly white
      else if (stepNum === 100)
        calculatedL = 0.95; // Very light
      else if (stepNum === 200)
        calculatedL = 0.9; // Light
      else if (stepNum === 300)
        calculatedL = 0.8; // Medium-light
      else if (stepNum === 400) calculatedL = 0.7; // Still light but usable
    } else {
      // Dark scale (600-950): These should be dark colors for use on light backgrounds
      // High step numbers = higher contrast = darker colors
      calculatedL = lightnessForContrast(targetRatio, WHITE_L, false);

      // Dark steps should progress from medium-dark (600) to very dark (950)
      const stepNum = Number.parseInt(step, 10);
      if (stepNum === 600)
        calculatedL = 0.4; // Medium-dark
      else if (stepNum === 700)
        calculatedL = 0.25; // Dark
      else if (stepNum === 800)
        calculatedL = 0.15; // Very dark
      else if (stepNum === 900)
        calculatedL = 0.08; // Nearly black
      else if (stepNum === 950) calculatedL = 0.04; // Almost black
    }

    lightness[step] = Math.max(0.005, Math.min(0.98, calculatedL));
  }

  return lightness;
}

/**
 * Generate OKLCH color scale from base color optimized for accessibility
 * Creates 50-950 scale with contrast-based lightness progression
 * Optimized for both light and dark mode usage patterns
 */
export function generateOKLCHScale(baseColor: OKLCH): Record<string, OKLCH> {
  // Validate input color for scale generation
  const validation = validateScaleGeneration(baseColor);

  if (!validation.isValid) {
    // Scale generation warning: validation.reason
    // Note: Logging removed to keep utility library environment-agnostic
    // Continue with suggested lightness or original
    const adjustedColor = validation.suggestedLightness
      ? { ...baseColor, l: validation.suggestedLightness }
      : baseColor;
    return generateOKLCHScale(adjustedColor);
  }

  // Generate contrast-based lightness progression
  const lightnessSteps = generateContrastBasedLightness(baseColor.l);

  const scale: Record<string, OKLCH> = {};

  for (const [step, lightness] of Object.entries(lightnessSteps)) {
    // Adjust chroma based on lightness to maintain perceptual uniformity
    let adjustedChroma = baseColor.c;

    // Enhanced chroma adjustment for contrast-based scaling
    if (lightness > 0.9) {
      // Ultra-light tints (50-100): Very low chroma for subtle UI elements
      adjustedChroma *= 0.15;
    } else if (lightness > 0.8) {
      // Light tints (200): Reduced chroma for backgrounds
      adjustedChroma *= 0.25;
    } else if (lightness > 0.6) {
      // Medium-light (300-400): Moderate chroma for functional elements
      adjustedChroma *= 0.7;
    } else if (lightness < 0.15) {
      // Very dark shades (800-950): Reduced chroma to prevent muddiness
      adjustedChroma *= 0.8;
    } else if (lightness < 0.3) {
      // Dark shades (700): Slightly reduced chroma for text clarity
      adjustedChroma *= 0.9;
    }
    // 500-600 range: Keep original chroma for maximum color expression

    scale[step] = roundOKLCH({
      l: lightness,
      c: Math.max(0.01, adjustedChroma), // Ensure minimum chroma
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

  // For each semantic type, generate a scale from the first suggestion and analyze combinations
  for (const [semanticType, colors] of Object.entries(suggestions)) {
    if (colors.length > 0 && colors[0]) {
      const baseSemanticColor = colors[0]; // Use first suggestion

      // Generate OKLCH scale
      const colorScale = generateOKLCHScale(baseSemanticColor);

      // Analyze combinations
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
  // warm colors advance, cool colors recede
  const hue = color.h;
  const warmHues = (hue >= 0 && hue <= 60) || (hue >= 300 && hue <= 360); // Red-Yellow range
  const coolHues = hue >= 180 && hue <= 270; // Blue-Cyan range

  // Higher lightness and lower chroma = more atmospheric (distant)
  const lightnessWeight = color.l; // 0-1, higher = more distant

  // Calculate distance weight (0 = far/background, 1 = near/foreground)
  let distanceWeight = 0;

  if (warmHues) {
    distanceWeight += 0.3; // Warm colors advance
  } else if (coolHues) {
    distanceWeight -= 0.2; // Cool colors recede
  }

  distanceWeight += (1 - lightnessWeight) * 0.4; // Darker = closer
  distanceWeight += color.c * 1.5; // Higher chroma = closer

  // Clamp between 0-1
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
  // Average the adjacent colors to understand the context
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

  // colors shift away from their context
  // If surrounded by light colors, make this darker and more chromatic
  // If surrounded by dark colors, make this lighter

  let enhancedLightness = baseColor.l;
  let enhancedChroma = baseColor.c;
  let enhancedHue = baseColor.h;

  // Lightness contrast enhancement
  if (avgLightness > 0.6) {
    // Surrounded by light colors - make this darker
    enhancedLightness = Math.max(0.1, baseColor.l - 0.2);
  } else if (avgLightness < 0.4) {
    // Surrounded by dark colors - make this lighter
    enhancedLightness = Math.min(0.9, baseColor.l + 0.2);
  }

  // Chroma contrast enhancement
  if (avgChroma < 0.1) {
    // Surrounded by gray colors - increase chroma
    enhancedChroma = Math.min(0.3, baseColor.c * 1.5);
  }

  // Hue contrast - slight shift away from average context hue
  const hueDifference = Math.abs(baseColor.h - normalizedAvgHue);
  if (hueDifference < 30) {
    // Too close to context - shift slightly
    enhancedHue = (baseColor.h + 15) % 360;
  }

  const enhancedColor = roundOKLCH({
    l: enhancedLightness,
    c: enhancedChroma,
    h: enhancedHue,
    alpha: baseColor.alpha,
  });

  // Calculate harmonic tension (aesthetic interest)
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
  // Factors that increase perceptual weight:
  // 1. Lower lightness (darker colors feel heavier)
  // 2. Higher chroma (saturated colors demand attention)
  // 3. Warm hues (red/orange feel heavier than blue/green)
  // 4. Certain hues have inherent weight (red > orange > yellow > green > blue > purple)

  const hue = color.h;
  let hueWeight = 0.5; // Default neutral weight

  // Hue weight based on Leonardo's observations
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

  // Combine factors
  const lightnessWeight = 1 - color.l; // Invert: darker = heavier
  const chromaWeight = Math.min(1, color.c / 0.3); // Normalize chroma

  const weight = lightnessWeight * 0.4 + chromaWeight * 0.35 + hueWeight * 0.25;

  let density: 'light' | 'medium' | 'heavy';

  if (weight < 0.3) {
    density = 'light';
  } else if (weight < 0.7) {
    density = 'medium';
  } else {
    density = 'heavy';
  }

  // Mark for AI to generate contextual balancing recommendations
  // AI will have access to the weight value and density to generate intelligent guidance
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

  // Create context from base color and other semantics for simultaneous contrast
  const allSemanticColors = Object.values(semanticSuggestions).flat();
  const contextColors = [baseColor, ...allSemanticColors.slice(0, 3)];

  for (const [semanticType, colors] of Object.entries(semanticSuggestions)) {
    const enhancedColors = colors.map((color) => {
      const atmosphericWeight = calculateAtmosphericWeight(color);
      const perceptualWeight = calculatePerceptualWeight(color);

      // Apply simultaneous contrast enhancement
      const contrastAnalysis = calculateSimultaneousContrast(color, contextColors);

      return {
        ...roundOKLCH(color),
        atmosphericWeight,
        perceptualWeight,
        enhancedVersion: roundOKLCH(contrastAnalysis.enhancedColor),
        harmonicTension: contrastAnalysis.harmonicTension,
      };
    });

    // Generate contextual recommendations based on Leonardo's principles
    const recommendations: string[] = [];

    // Atmospheric perspective recommendations
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

    // Perceptual weight recommendations
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

    // Temperature-based recommendations
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
