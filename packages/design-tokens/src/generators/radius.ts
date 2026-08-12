/**
 * Border Radius Generator
 *
 * Radius derives FROM spacing. `radius-base` is
 * `calc(var(--rafters-spacing-base) * 1.5)`, so changing the spacing base
 * cascades into every radius token at runtime. The ratio steps on top of that
 * anchor are radius's own -- step -1 exists here even though spacing has no
 * negative positions -- because the anchor changed, not the step rule.
 */

import { ratioValue, resolveRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { RadiusDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { RADIUS_SCALE } from './types.js';

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;

const CORNER_NAMES: Record<string, string> = {
  tl: 'top-left',
  tr: 'top-right',
  bl: 'bottom-left',
  br: 'bottom-right',
};

/**
 * Generate border radius tokens from provided definitions.
 * Produces base tokens, per-corner tokens, and per-scale corner tokens
 * so a designer can override one corner and have it cascade everywhere.
 */
export function generateRadiusTokens(
  config: ResolvedSystemConfig,
  radiusDefs: Record<string, RadiusDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseRadius, progressionRatio } = config;

  const ratioVal = ratioValue(resolveRatio(progressionRatio));

  // The multiplier that anchors radius to spacing. `baseRadius` is already
  // `baseSpacingUnit * 1.5` from resolveConfig, so the multiplier is stable
  // across base changes. The CSS emission references the spacing var directly.
  // Rounded to 3 decimals, matching the convention at line 103.
  const radiusMultiplier = Math.round((baseRadius / config.baseSpacingUnit) * 1000) / 1000;

  // Base radius token -- derives from spacing
  tokens.push({
    name: 'radius-base',
    value: `calc(var(--rafters-spacing-base) * ${radiusMultiplier})`,
    category: 'radius',
    namespace: 'radius',
    semanticMeaning: 'Base border radius - derives from spacing base',
    usageContext: ['calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    dependsOn: ['spacing-base'],
    description: `Base radius = spacing-base * ${radiusMultiplier} (${baseRadius}px at base ${config.baseSpacingUnit}). Scale uses ${progressionRatio} progression (ratio ${ratioVal}).`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Reference as the calculation base'],
      never: ['Change without understanding scale impact'],
    },
  });

  // Per-corner base tokens -- default to radius-base, override individually
  for (const corner of CORNERS) {
    tokens.push({
      name: `radius-${corner}`,
      value: 'var(--rafters-radius-base)',
      category: 'radius',
      namespace: 'radius',
      semanticMeaning: `Base ${CORNER_NAMES[corner]} radius - override to affect all scales for this corner`,
      usageContext: ['designer-override'],
      dependsOn: ['radius-base'],
      description: `${CORNER_NAMES[corner]} radius. Defaults to radius-base. Set to 0 for a sharp corner on every component.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });
  }

  // Generate tokens for each scale position
  for (const scale of RADIUS_SCALE) {
    const def = radiusDefs[scale];
    if (!def) continue;
    const scaleIndex = RADIUS_SCALE.indexOf(scale);
    let value: string;
    let mathRelationship: string;

    if (def.step === 'none') {
      value = '0';
      mathRelationship = '0';
    } else if (def.step === 'full') {
      value = '9999px'; // Full radius stays in px as it's a special case
      mathRelationship = 'infinite (9999px)';
    } else if (def.step === 0) {
      value = 'var(--rafters-radius-base)';
      mathRelationship = `spacing-base * ${radiusMultiplier} (base)`;
    } else {
      // Use calc() with var() so changing radius-base cascades via CSS
      const multiplier = Math.round(ratioVal ** def.step * 1000) / 1000;
      value = `calc(var(--rafters-radius-base) * ${multiplier})`;
      mathRelationship = `base × ${ratioVal}^${def.step} (×${multiplier})`;
    }

    const scaleName = scale === 'DEFAULT' ? 'radius' : `radius-${scale}`;

    // Unified scale token (shorthand for all four corners)
    tokens.push({
      name: scaleName,
      value,
      category: 'radius',
      namespace: 'radius',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      progressionSystem: progressionRatio as 'minor-third',
      mathRelationship,
      dependsOn: def.step === 'none' || def.step === 'full' ? [] : ['radius-base'],
      description: `Border radius ${scale}: ${value} (${mathRelationship})`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });

    // Per-corner tokens at this scale position (skip none, full, and DEFAULT)
    if (def.step !== 'none' && def.step !== 'full' && scale !== 'DEFAULT') {
      const cornerMultiplier =
        def.step === 0 ? null : Math.round(ratioVal ** def.step * 1000) / 1000;

      for (const corner of CORNERS) {
        const cornerValue =
          cornerMultiplier === null
            ? `var(--rafters-radius-${corner})`
            : `calc(var(--rafters-radius-${corner}) * ${cornerMultiplier})`;

        tokens.push({
          name: `radius-${scale}-${corner}`,
          value: cornerValue,
          category: 'radius',
          namespace: 'radius',
          semanticMeaning: `${CORNER_NAMES[corner]} radius at ${scale} scale`,
          usageContext: def.contexts,
          scalePosition: scaleIndex,
          dependsOn: [`radius-${corner}`],
          description: `${CORNER_NAMES[corner]} radius ${scale}: derives from radius-${corner} base`,
          generatedAt: timestamp,
          containerQueryAware: false,
          userOverride: null,
        });
      }
    }
  }

  return {
    namespace: 'radius',
    tokens,
  };
}
