/**
 * Spacing Generator
 *
 * The scale is `baseSpacingUnit * progressionRatio^n`, counting UP from position
 * 0. Before #2031 the ratio was resolved, a sequence computed, and then thrown
 * away -- values came from a literal multiplier table copied from Tailwind
 * while every token still advertised `progressionSystem: minor-third`. That was
 * the #384 regression, and it made spacing the only namespace off the shared
 * curve that every other anchor derives from.
 *
 * TWO RULES THE MATH DOES NOT SUPPLY, both operator rulings:
 *
 * 1. NO NEGATIVE POSITIONS. The base is the floor, not the middle of a range.
 *    A step below it is a value smaller than the unit everything is built from.
 *    Hairlines and focus rings are not small spacing -- they belong to their own
 *    namespaces, which carry their own floors.
 * 2. ROUNDING IS THE DEFAULT, AND IT ROUNDS THE MULTIPLIER. Raw progression
 *    values are fractional almost everywhere (1.2, 1.44, 1.73), a raster has no
 *    half pixel to render into, and a fractional multiplier would put a `.25`
 *    in a token name. Positions that collide after rounding are dropped rather
 *    than shipped twice, so a tight ratio yields fewer rungs than positions.
 */

import { ratioValue, resolveRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { ScaleBounds } from './defaults.js';
import { progressionFrom } from './progression.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

/**
 * The emitted scale, as multipliers of the base.
 *
 * Position 0 IS the base. Values round to whole pixels and duplicates collapse,
 * so a tight ratio on a small base yields FEWER rungs than positions -- that
 * loss is real and visible in the token count, not silently papered over.
 */
export function spacingMultipliers(ratioVal: number, bounds: ScaleBounds): number[] {
  // The multiplier is what steps, not the pixel. Rounding the pixel and
  // dividing back out manufactures quarters -- 17px on a 4px base is multiplier
  // 4.25, and `spacing-4.25` breaks anything reading a token name as a number.
  // Stepping the multiplier keeps every name an integer and every emitted value
  // a clean multiple of the base.
  return progressionFrom(bounds.floor, ratioVal, bounds.ceiling);
}

/**
 * Token name for a multiplier. The name IS the multiplier, unchanged from
 * before #2031 -- `spacing-4` still means `base * 4`, and every name is an
 * integer because the multiplier is.
 */
function scaleName(multiplier: number): string {
  return String(multiplier);
}

/**
 * Generate spacing tokens from provided multipliers
 */
export function generateSpacingTokens(
  config: ResolvedSystemConfig,
  bounds: ScaleBounds,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseSpacingUnit, progressionRatio } = config;

  const ratio = resolveRatio(progressionRatio);
  const ratioVal = ratioValue(ratio);
  const multipliers = spacingMultipliers(ratioVal, bounds);

  // Base unit token - the foundation everything else derives from
  // Convert px to rem (assuming 16px root font size)
  const baseRem = baseSpacingUnit / 16;

  tokens.push({
    name: 'spacing-base',
    value: `${baseRem}rem`,
    category: 'spacing',
    namespace: 'spacing',
    semanticMeaning: 'Foundation spacing unit - all spacing derives from this value',
    usageContext: ['base-unit', 'calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    description: `Base spacing unit (${baseRem}rem / ${baseSpacingUnit}px at 16px root). Multiply by scale values for actual spacing.`,
    generatedAt: timestamp,
    containerQueryAware: true,
    userOverride: null,
    usagePatterns: {
      do: [
        'Reference in calculations for consistent spacing',
        'Use as the multiplier base for custom spacing',
      ],
      never: [
        'Use directly in components without scaling',
        'Override without understanding the ripple effects',
      ],
    },
  });

  // Position 0 is the base. `0` is prepended as the null value -- not a scale
  // position, the absence of one.
  for (const multiplier of [0, ...multipliers]) {
    const scale = scaleName(multiplier);
    const value = baseSpacingUnit * multiplier;
    const scaleIndex = multipliers.indexOf(multiplier) + 1;

    // Determine semantic meaning based on value
    let meaning: string;
    let usageContext: string[];

    if (multiplier === 0) {
      meaning = 'Zero spacing - remove all spacing';
      usageContext = ['reset', 'collapse'];
    } else if (multiplier <= 1) {
      meaning = 'Micro spacing for tight layouts and inline elements';
      usageContext = ['inline-spacing', 'icon-gaps', 'tight-layouts'];
    } else if (multiplier <= 4) {
      meaning = 'Small spacing for component internals and related elements';
      usageContext = ['component-padding', 'related-elements', 'form-fields'];
    } else if (multiplier <= 12) {
      meaning = 'Medium spacing for section separation and breathing room';
      usageContext = ['section-padding', 'card-padding', 'list-gaps'];
    } else if (multiplier <= 32) {
      meaning = 'Large spacing for major section breaks and layout gaps';
      usageContext = ['layout-gaps', 'section-margins', 'page-padding'];
    } else {
      meaning = 'Extra large spacing for page-level layout and hero sections';
      usageContext = ['hero-spacing', 'page-margins', 'major-sections'];
    }

    const remValue = value / 16;
    // Use calc() with var() so changing spacing-base cascades via CSS
    const cssValue =
      multiplier === 0
        ? '0'
        : multiplier === 1
          ? 'var(--rafters-spacing-base)'
          : `calc(var(--rafters-spacing-base) * ${multiplier})`;
    tokens.push({
      name: `spacing-${scale}`,
      value: cssValue,
      category: 'spacing',
      namespace: 'spacing',
      // Intentionally no binding: spacing tokens use CSS calc(var(--spacing-base) * N)
      // and the BROWSER resolves the cascade at render time. A registry-side binding
      // would compute eagerly and emit a static value, defeating the runtime cascade.
      semanticMeaning: meaning,
      usageContext,
      scalePosition: scaleIndex,
      progressionSystem: progressionRatio as 'minor-third',
      mathRelationship: `${baseSpacingUnit} * ${multiplier}`,
      dependsOn: ['spacing-base'],
      generationRule: `calc({spacing-base} * ${multiplier})`,
      description: `Spacing at scale ${scale} = ${remValue}rem (${baseSpacingUnit}px × ${multiplier})`,
      generatedAt: timestamp,
      containerQueryAware: true,
      userOverride: null,
    });
  }

  // Add progression metadata token for reference
  tokens.push({
    name: 'spacing-progression',
    // The scale that actually shipped. Before #2031 this carried a `sample`
    // computed straight off the ratio while the tokens came from a table --
    // metadata describing a scale that did not exist.
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue: ratioVal,
      baseUnit: baseSpacingUnit,
      multipliers,
    }),
    category: 'spacing',
    namespace: 'spacing',
    semanticMeaning: 'Metadata about the spacing progression system',
    description: `Spacing is ${baseSpacingUnit}px x ${progressionRatio} (${ratioVal})^n from position 0, rounded to whole pixels: ${multipliers.length} rungs, ${baseSpacingUnit}px to ${Math.round(baseSpacingUnit * (multipliers[multipliers.length - 1] ?? 1))}px.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: [
        'Reference when adding custom spacing values',
        'Use ratio for deriving new consistent values',
      ],
      never: ['Use raw values in production CSS'],
    },
  });

  return {
    namespace: 'spacing',
    tokens,
  };
}
