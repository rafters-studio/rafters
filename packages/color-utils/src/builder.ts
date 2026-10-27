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
  REFERENCE_STEP_INDEX,
} from './accessibility.js';
import {
  calculateAtmosphericWeight,
  calculatePerceptualWeight,
  getColorTemperature,
  isLightColor,
} from './analysis.js';
import {
  ceilingForSeed,
  getGamutTier,
  mapScaleToGamut,
  storedTier,
  toGamutCeiling,
} from './gamut.js';
import { boundSeedLightness, generateHarmony, generateOKLCHScale } from './harmony.js';
import { roundOKLCH } from './conversion.js';
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
  // The seed the family is built from: inside the lightness bounds first,
  // then, for a P3 seed above the ceiling (P3 not allowed), mapped into sRGB
  // before the scale is built. Every step, the seed's included, is then mapped
  // into the ceiling. Any move of the seed is recorded below.
  const bounded = boundSeedLightness(oklch);
  const ceiling = ceilingForSeed(bounded);
  const seed = getGamutTier(bounded) === 'p3' ? toGamutCeiling(bounded, ceiling) : bounded;

  // Generate the 11-position scale and map every step into the ceiling
  const scaleRecord = generateOKLCHScale(seed);
  const scale = mapScaleToGamut(
    SCALE_POSITIONS.map((pos) => scaleRecord[pos]).filter((v): v is OKLCH => v !== undefined),
    ceiling,
  );
  const gamut = scale.map(storedTier);

  // The seed lands on the 600 step. Any difference from the requested seed
  // (beyond the rounding every step gets) is a move, and is recorded.
  const landed = scale[REFERENCE_STEP_INDEX];
  const requested = roundOKLCH(oklch);
  const seedAdjusted: ColorValue['seedAdjusted'] =
    landed && (landed.l !== requested.l || landed.c !== requested.c || landed.h !== requested.h)
      ? {
          from: { ...oklch },
          to: { ...landed },
          reason: bounded !== oklch ? 'lightness-bounds' : 'gamut',
        }
      : undefined;

  return assembleColorValue(
    oklch,
    { scale, gamut, seedAdjusted, reference: landed ?? oklch },
    options,
  );
}

/** The scale half of a ColorValue, as a builder produced it. */
export interface BuiltScale {
  scale: OKLCH[];
  gamut: NonNullable<ColorValue['gamut']>;
  seedAdjusted: ColorValue['seedAdjusted'];
  /** The step the on-white and on-black figures are measured on. */
  reference: OKLCH;
}

/**
 * Assemble a ColorValue around a built scale: harmonies, accessibility,
 * analysis, weights, semantic suggestions and the name, all from the
 * requested colour. Shared by buildColorValue and createNormalizedScale so
 * both families carry the same intelligence.
 */
export function assembleColorValue(
  oklch: OKLCH,
  built: BuiltScale,
  options: BuildColorValueOptions,
): ColorValue {
  const { scale, gamut, seedAdjusted, reference } = built;

  // Generate harmonies
  const harmony = generateHarmony(oklch);

  // WCAG accessibility (pair matrices + on-white/on-black) via the shared
  // assembler, measured on the step the seed landed on (the same step
  // rebakeAccessibility uses); APCA is layered on below, builder-only.
  const wcagAccessibility = assembleWcagAccessibility(scale, reference);
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
    gamut,
    ...(seedAdjusted && { seedAdjusted }),
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
