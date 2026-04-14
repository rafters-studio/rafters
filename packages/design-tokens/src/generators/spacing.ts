/**
 * Spacing Generator
 *
 * Generates spacing tokens using mathematical progressions from @rafters/math-utils.
 * Default uses minor-third (1.2) ratio for harmonious, connected feel.
 *
 * This generator is a pure function - it receives spacing multipliers as input.
 * Default spacing values are provided by the orchestrator from defaults.ts.
 */

import { generateProgression, getRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { SPACING_SCALE } from './types.js';

/**
 * Generate spacing tokens from provided multipliers
 */
export function generateSpacingTokens(
  config: ResolvedSystemConfig,
  spacingMultipliers: Record<string, number>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseSpacingUnit, progressionRatio } = config;

  // Get the actual ratio value for reference
  const ratioValue = getRatio(progressionRatio);

  // Generate the progression for reference (used in documentation)
  const progression = generateProgression(progressionRatio as 'minor-third', {
    baseValue: baseSpacingUnit,
    steps: 10,
    includeZero: true,
  });

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

  // Generate tokens for each scale position
  for (const scale of SPACING_SCALE) {
    const multiplier = spacingMultipliers[scale];
    if (multiplier === undefined) continue;
    const value = baseSpacingUnit * multiplier;
    const scaleIndex = SPACING_SCALE.indexOf(scale);

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
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue,
      baseUnit: baseSpacingUnit,
      sample: progression.map((v) => Math.round(v * 100) / 100),
    }),
    category: 'spacing',
    namespace: 'spacing',
    semanticMeaning: 'Metadata about the spacing progression system',
    description: `Spacing uses ${progressionRatio} progression (ratio ${ratioValue}) from base ${baseRem}rem. Sample values: ${progression
      .slice(0, 5)
      .map((v) => Math.round(v))
      .join(', ')}...`,
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
