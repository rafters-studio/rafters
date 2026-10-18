/**
 * Color Generator
 *
 * Generates color family tokens with 11-position scale.
 *
 * Every family is a `ColorValue` built by color-utils' `buildColorValue`
 * (see `buildFamily`). This module builds no scale and computes no
 * accessibility metadata of its own; it only turns finished families into
 * tokens. Default seeds are provided by the orchestrator from defaults.ts.
 */

import { buildColorValue, oklchToCSS } from '@rafters/color-utils';
import type { ColorValue, Token } from '@rafters/shared';
import type { ColorSeedEntry } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { COLOR_SCALE_POSITIONS } from './types.js';

/**
 * Build one colour family from its seed. The only fields set after
 * `buildColorValue` are `name` (the family name), `token` and `use`.
 */
export function buildFamily(name: string, entry: ColorSeedEntry): ColorValue {
  const built = buildColorValue(entry.seed, { token: name, use: entry.description });
  return { ...built, name };
}

/**
 * Generate color family tokens from finished families, keyed by family name.
 */
export function generateColorTokens(
  _config: ResolvedSystemConfig,
  families: Record<string, ColorValue>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const [name, colorFamily] of Object.entries(families)) {
    const description = colorFamily.use;

    // Create individual scale position tokens
    for (const [scaleIndex, position] of COLOR_SCALE_POSITIONS.entries()) {
      const oklch = colorFamily.scale[scaleIndex];
      if (!oklch) continue;

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
