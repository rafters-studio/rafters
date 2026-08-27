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
  assembleWcagAccessibility,
  calculateAPCAContrast,
  CONTRAST_BLACK,
  CONTRAST_WHITE,
  minFontSizeForAPCA,
} from './accessibility.js';
import {
  calculateAtmosphericWeight,
  calculatePerceptualWeight,
  getColorTemperature,
  isLightColor,
} from './analysis.js';
import { generateHarmony, generateOKLCHScale } from './harmony.js';
import { generateColorName } from './naming/index.js';
import { SCALE_POSITIONS } from './scale-positions.js';
import { generateSemanticColorSuggestions } from './semantic.js';

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

  // WCAG accessibility (pair matrices + on-white/on-black) via the shared
  // assembler; APCA is layered on below, builder-only.
  const wcagAccessibility = assembleWcagAccessibility(scale, oklch);
  const apcaOnWhite = calculateAPCAContrast(oklch, CONTRAST_WHITE);
  const apcaOnBlack = calculateAPCAContrast(oklch, CONTRAST_BLACK);

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
      ...wcagAccessibility,
      apca: {
        onWhite: apcaOnWhite,
        onBlack: apcaOnBlack,
        minFontSize: minFontSizeForAPCA(apcaOnWhite),
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
