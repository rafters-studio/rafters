/**
 * Color Generator
 *
 * Generates color family tokens with 11-position scale.
 * Uses OKLCH color space for perceptually uniform lightness distribution.
 *
 * This generator is a pure function - it receives color scales as input.
 * Default scales are provided by the orchestrator from defaults.ts.
 */

import {
  calculateWCAGContrast,
  generateAccessibilityMetadata,
  generateOKLCHScale,
  oklchToCSS,
} from '@rafters/color-utils';
import type { ColorAccessibility, ColorValue, OKLCH, Token } from '@rafters/shared';
import type { ColorScaleInput, SemanticColorBase } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { COLOR_SCALE_POSITIONS } from './types.js';

/**
 * Reference lightness for the 500 position (mid-tone).
 * Used when generating scales from semantic color bases.
 */
const REFERENCE_LIGHTNESS = 0.55;

/**
 * Build a ColorScaleInput from a semantic color base.
 * Computes full 11-position scale using OKLCH contrast-based math.
 *
 * @param name - Semantic role name (e.g., "accent", "destructive")
 * @param base - Hue, chroma, and description for the color role
 * @returns ColorScaleInput with computed 11-position scale
 */
export function buildColorScaleFromBase(name: string, base: SemanticColorBase): ColorScaleInput {
  const baseColor: OKLCH = {
    l: REFERENCE_LIGHTNESS,
    c: base.chroma,
    h: base.hue,
    alpha: 1,
  };

  const scale = generateOKLCHScale(baseColor);

  return {
    name,
    scale,
    description: base.description,
  };
}

/**
 * Generate color family tokens from provided color scales
 */
export function generateColorTokens(
  _config: ResolvedSystemConfig,
  colorScales: ColorScaleInput[],
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const colorScale of colorScales) {
    const { name, scale, description } = colorScale;

    // Build the complete scale array for ColorValue
    const scaleArray: OKLCH[] = COLOR_SCALE_POSITIONS.map((pos) => scale[pos]).filter(
      (v): v is OKLCH => v !== undefined,
    );

    // Pre-compute accessibility metadata so plugins (state, contrast) can
    // walk the family's WCAG-AAA pair ladder without recomputing contrast
    // ratios at cascade time.
    const colorFamily: ColorValue = {
      name,
      scale: scaleArray,
      token: name,
      use: description ?? `${name} color palette for UI elements.`,
      accessibility: buildColorAccessibility(scaleArray),
    };

    // Create individual scale position tokens
    for (const position of COLOR_SCALE_POSITIONS) {
      const oklch = scale[position];
      if (!oklch) continue;
      const scaleIndex = COLOR_SCALE_POSITIONS.indexOf(position);

      tokens.push({
        name: `${name}-${position}`,
        value: oklchToCSS(oklch),
        category: 'color',
        namespace: 'color',
        semanticMeaning: `${name} shade at ${position} level - ${
          scaleIndex < 4
            ? 'light background range'
            : scaleIndex < 7
              ? 'mid-tone for borders and secondary text'
              : 'dark foreground range'
        }`,
        usageContext: getUsageContext(position),
        scalePosition: scaleIndex,
        progressionSystem: 'custom', // Color uses custom OKLCH lightness curve
        description: `${name} color at ${position} position (OKLCH L=${oklch.l})`,
        generatedAt: timestamp,
        containerQueryAware: true,
        userOverride: null,
      });
    }

    // Create the family token that holds all the intelligence
    tokens.push({
      name,
      value: colorFamily,
      category: 'color',
      namespace: 'color',
      semanticMeaning: `Complete ${name} color family with 11-position scale`,
      usageContext: ['backgrounds', 'borders', 'text', 'dividers', 'shadows', 'overlays'],
      description:
        description ??
        `${name} color family - all shades from light to dark for this color palette.`,
      generatedAt: timestamp,
      containerQueryAware: true,
      userOverride: null,
      usagePatterns: {
        do: [
          'Use 50-200 for light mode backgrounds',
          'Use 800-950 for dark mode backgrounds',
          'Use 400-600 for borders and dividers',
          'Use 900-950 for primary text in light mode',
          'Use 50-100 for primary text in dark mode',
        ],
        never: [
          'Mix scale positions that have insufficient contrast',
          'Use without checking accessibility against background',
        ],
      },
    });
  }

  return {
    namespace: 'color',
    tokens,
  };
}

const WHITE: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };
const BLACK: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };
const WCAG_AA_NORMAL = 4.5;
const WCAG_AAA_NORMAL = 7;
const FAMILY_REFERENCE_INDEX = 5; // The 500 position is the family anchor for onWhite/onBlack ratios.

function buildColorAccessibility(scale: OKLCH[]): ColorAccessibility {
  const meta = generateAccessibilityMetadata(scale);
  const reference = scale[FAMILY_REFERENCE_INDEX] ?? scale[0];
  if (!reference) {
    throw new Error('buildColorAccessibility: empty scale');
  }
  const onWhiteRatio = calculateWCAGContrast(reference, WHITE);
  const onBlackRatio = calculateWCAGContrast(reference, BLACK);
  return {
    wcagAA: meta.wcagAA,
    wcagAAA: meta.wcagAAA,
    onWhite: {
      wcagAA: onWhiteRatio >= WCAG_AA_NORMAL,
      wcagAAA: onWhiteRatio >= WCAG_AAA_NORMAL,
      contrastRatio: onWhiteRatio,
      aa: meta.onWhite.aa,
      aaa: meta.onWhite.aaa,
    },
    onBlack: {
      wcagAA: onBlackRatio >= WCAG_AA_NORMAL,
      wcagAAA: onBlackRatio >= WCAG_AAA_NORMAL,
      contrastRatio: onBlackRatio,
      aa: meta.onBlack.aa,
      aaa: meta.onBlack.aaa,
    },
  };
}

/**
 * Get usage context based on scale position
 */
function getUsageContext(position: string): string[] {
  const pos = parseInt(position, 10);

  if (pos <= 100) {
    return ['backgrounds', 'cards', 'surfaces', 'light-mode-bg'];
  }
  if (pos <= 300) {
    return ['secondary-backgrounds', 'hover-states', 'subtle-borders'];
  }
  if (pos <= 500) {
    return ['borders', 'dividers', 'disabled-states', 'placeholder-text'];
  }
  if (pos <= 700) {
    return ['secondary-text', 'icons', 'input-borders'];
  }
  return ['primary-text', 'headings', 'dark-mode-bg', 'high-contrast-elements'];
}
