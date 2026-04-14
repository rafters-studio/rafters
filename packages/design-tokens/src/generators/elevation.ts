/**
 * Elevation Generator
 *
 * Generates elevation tokens that pair depth (z-index) with shadows.
 * This creates semantic "levels" that components can use for consistent
 * visual hierarchy across the design system.
 *
 * This generator is a pure function - it receives elevation definitions as input.
 * Default elevation values are provided by the orchestrator from defaults.ts.
 */

import type { Token } from '@rafters/shared';
import type { ElevationDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { ELEVATION_LEVELS } from './types.js';

/**
 * Generate elevation tokens from provided definitions
 */
export function generateElevationTokens(
  _config: ResolvedSystemConfig,
  elevationDefs: Record<string, ElevationDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const level of ELEVATION_LEVELS) {
    const def = elevationDefs[level];
    if (!def) continue;
    const scaleIndex = ELEVATION_LEVELS.indexOf(level);

    // Create composite elevation token
    tokens.push({
      name: `elevation-${level}`,
      value: JSON.stringify({
        depth: `var(--${def.depth})`,
        shadow: `var(--${def.shadow})`,
      }),
      category: 'elevation',
      namespace: 'elevation',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      elevationLevel: level,
      shadowToken: def.shadow,
      dependsOn: [def.depth, def.shadow],
      description: `${def.useCase}. Combines ${def.depth} with ${def.shadow}.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
      usagePatterns: {
        do: [
          `Use for ${def.contexts.slice(0, 2).join(', ')}`,
          'Apply both z-index and shadow together',
        ],
        never: [
          'Mix elevation levels within same component',
          'Use without considering stacking context',
        ],
      },
    });

    // Also create shorthand tokens for direct use
    tokens.push({
      name: `elevation-${level}-z`,
      value: `var(--${def.depth})`,
      category: 'elevation',
      namespace: 'elevation',
      semanticMeaning: `Z-index component of ${level} elevation`,
      dependsOn: [def.depth],
      description: `Z-index for ${level} elevation level.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });

    tokens.push({
      name: `elevation-${level}-shadow`,
      value: `var(--${def.shadow})`,
      category: 'elevation',
      namespace: 'elevation',
      semanticMeaning: `Shadow component of ${level} elevation`,
      dependsOn: [def.shadow],
      description: `Shadow for ${level} elevation level.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
    });
  }

  // Elevation scale reference
  tokens.push({
    name: 'elevation-scale',
    value: JSON.stringify({
      levels: Object.fromEntries(
        Object.entries(elevationDefs).map(([k, v]) => [k, { depth: v.depth, shadow: v.shadow }]),
      ),
      note: 'Each elevation level pairs z-index with appropriate shadow',
    }),
    category: 'elevation',
    namespace: 'elevation',
    semanticMeaning: 'Elevation scale reference',
    description: 'Complete elevation scale showing depth/shadow pairings.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'elevation',
    tokens,
  };
}
