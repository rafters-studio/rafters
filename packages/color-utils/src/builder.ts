/**
 * ColorValue Builder
 *
 * Builds a complete ColorValue from an OKLCH input using pure math.
 * No AI, no network calls - just deterministic color calculations.
 *
 * This is the single source of truth for constructing ColorValue objects
 * with all computed properties (scale, harmonies, accessibility, etc.)
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import {
  calculateAPCAContrast,
  calculateWCAGContrast,
  generateAccessibilityMetadata,
} from './accessibility.js';
import { getColorTemperature, isLightColor } from './analysis.js';
import {
  calculateAtmosphericWeight,
  calculatePerceptualWeight,
  generateHarmony,
  generateOKLCHScale,
  generateSemanticColorSuggestions,
} from './harmony.js';
import { generateColorName } from './naming/index.js';

/** Standard scale positions used in design systems */
const SCALE_POSITIONS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
];

/** White reference color for contrast calculations */
const WHITE: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };

/** Black reference color for contrast calculations */
const BLACK: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };

/**
 * Options for building a ColorValue
 */
export interface BuildColorValueOptions {
  /**
   * Semantic token assignment (e.g., "primary", "destructive")
   */
  token?: string;

  /**
   * Scale position reference (e.g., "500", "400")
   */
  value?: string;

  /**
   * Human notes about the color choice
   */
  use?: string;

  /**
   * State mappings (e.g., { hover: "blue-900", focus: "blue-700" })
   */
  states?: Record<string, string>;
}

/**
 * Build a complete ColorValue from OKLCH using pure math calculations.
 *
 * This function computes:
 * - 11-position scale (50-950)
 * - Color harmonies (complementary, triadic, analogous, tetradic, monochromatic)
 * - Accessibility metadata (WCAG AA/AAA, APCA, contrast on white/black)
 * - Color analysis (temperature, lightness)
 * - Atmospheric and perceptual weights
 * - Semantic color suggestions (danger, success, warning, info)
 *
 * @param oklch - The base color in OKLCH format
 * @param options - Optional metadata (token, value, use, states)
 * @returns A complete ColorValue with all computed properties
 *
 * @example
 * ```ts
 * import { buildColorValue } from '@rafters/color-utils';
 *
 * const primary = buildColorValue(
 *   { l: 0.5, c: 0.15, h: 240, alpha: 1 },
 *   { token: 'primary', use: 'Brand primary color' }
 * );
 *
 * console.log(primary.name); // e.g., "slate-bold-sapphire"
 * console.log(primary.scale.length); // 11
 * console.log(primary.accessibility.onWhite.wcagAA); // true/false
 * ```
 */
export function buildColorValue(oklch: OKLCH, options: BuildColorValueOptions = {}): ColorValue {
  // Generate the 11-position scale
  const scaleRecord = generateOKLCHScale(oklch);
  const scale = SCALE_POSITIONS.map((pos) => scaleRecord[pos]).filter(
    (v): v is OKLCH => v !== undefined,
  );

  // Generate harmonies
  const harmony = generateHarmony(oklch);

  // Generate accessibility metadata from the scale
  const accessibilityMeta = generateAccessibilityMetadata(scale);

  // Calculate contrast ratios against white and black
  const contrastOnWhite = calculateWCAGContrast(oklch, WHITE);
  const contrastOnBlack = calculateWCAGContrast(oklch, BLACK);
  const apcaOnWhite = calculateAPCAContrast(oklch, WHITE);
  const apcaOnBlack = calculateAPCAContrast(oklch, BLACK);

  // Get color analysis
  const temperature = getColorTemperature(oklch);
  const light = isLightColor(oklch);

  // Get perceptual weights
  const atmospheric = calculateAtmosphericWeight(oklch);
  const perceptual = calculatePerceptualWeight(oklch);

  // Get semantic suggestions
  const semanticSuggestions = generateSemanticColorSuggestions(oklch);

  // Generate the color name
  const name = generateColorName(oklch);

  // Build the complete ColorValue
  const colorValue: ColorValue = {
    name,
    scale,
    tokenId: `color-${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`,

    // Optional metadata from options
    ...(options.token && { token: options.token }),
    ...(options.value && { value: options.value }),
    ...(options.use && { use: options.use }),
    ...(options.states && { states: options.states }),

    // Harmonies - pure hue rotation arrays
    harmonies: {
      complementary: harmony.complementary,
      triadic: harmony.triadic,
      analogous: harmony.analogous,
      tetradic: harmony.tetradic,
      splitComplementary: harmony.splitComplementary,
      monochromatic: harmony.monochromatic,
    },

    // Accessibility
    accessibility: {
      wcagAA: accessibilityMeta.wcagAA,
      wcagAAA: accessibilityMeta.wcagAAA,
      onWhite: {
        wcagAA: contrastOnWhite >= 4.5,
        wcagAAA: contrastOnWhite >= 7,
        contrastRatio: contrastOnWhite,
        aa: accessibilityMeta.onWhite.aa,
        aaa: accessibilityMeta.onWhite.aaa,
      },
      onBlack: {
        wcagAA: contrastOnBlack >= 4.5,
        wcagAAA: contrastOnBlack >= 7,
        contrastRatio: contrastOnBlack,
        aa: accessibilityMeta.onBlack.aa,
        aaa: accessibilityMeta.onBlack.aaa,
      },
      apca: {
        onWhite: apcaOnWhite,
        onBlack: apcaOnBlack,
        minFontSize: Math.abs(apcaOnWhite) >= 60 ? 16 : Math.abs(apcaOnWhite) >= 45 ? 24 : 32,
      },
    },

    // Analysis
    analysis: {
      temperature,
      isLight: light,
      name,
    },

    // Atmospheric weight
    atmosphericWeight: atmospheric,

    // Perceptual weight
    perceptualWeight: perceptual,

    // Semantic suggestions
    semanticSuggestions,
  };

  return colorValue;
}
