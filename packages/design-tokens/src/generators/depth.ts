/**
 * Depth Generator
 *
 * Generates z-index tokens for stacking context management.
 * Uses a semantic naming system rather than arbitrary numbers.
 *
 * This generator is a pure function - it receives depth definitions as input.
 * Default depth levels are provided by the orchestrator from defaults.ts.
 */

import type { Token } from '@rafters/shared';
import type { DepthDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { DEPTH_LEVELS } from './types.js';

/**
 * Generate depth (z-index) tokens from provided definitions
 */
export function generateDepthTokens(
  _config: ResolvedSystemConfig,
  depthDefs: Record<string, DepthDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const level of DEPTH_LEVELS) {
    const def = depthDefs[level];
    if (!def) continue;
    const scaleIndex = DEPTH_LEVELS.indexOf(level);

    tokens.push({
      name: `depth-${level}`,
      value: String(def.value),
      category: 'depth',
      namespace: 'depth',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      description: `Z-index ${def.value} for ${level} layer. ${def.stackingContext ? 'Creates new stacking context.' : 'In document flow.'}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      userOverride: null,
      usagePatterns: {
        do:
          level === 'base'
            ? ['Let elements flow naturally', 'Avoid z-index unless needed']
            : [`Use for ${def.contexts.join(', ')}`, 'Ensure proper isolation'],
        never: [
          'Use arbitrary z-index values',
          'Create z-index battles between components',
          'Skip levels without good reason',
        ],
      },
    });
  }

  // Add special depth tokens
  tokens.push({
    name: 'depth-below',
    value: '-1',
    category: 'depth',
    namespace: 'depth',
    semanticMeaning: 'Below base layer - backgrounds, decorative elements',
    usageContext: ['background-decorations', 'behind-content'],
    description: 'Z-index -1 for elements that should appear behind base content.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Use for decorative backgrounds', 'Use for pseudo-element layers'],
      never: ['Use for interactive elements', 'Rely on for critical content'],
    },
  });

  tokens.push({
    name: 'depth-max',
    value: '9999',
    category: 'depth',
    namespace: 'depth',
    semanticMeaning: 'Maximum layer - emergency overlay (e.g., dev tools)',
    usageContext: ['debug-overlays', 'emergency-ui'],
    description: 'Maximum z-index 9999 for special cases only.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
    usagePatterns: {
      do: ['Use only for dev/debug tools', 'Document why this is needed'],
      never: [
        'Use in production UI',
        'Use to "win" z-index conflicts',
        'Use without questioning if the architecture is wrong',
      ],
    },
  });

  // Reference token for intermediate values
  tokens.push({
    name: 'depth-scale',
    value: JSON.stringify({
      gap: 10,
      note: 'Each level has 10-unit gaps for intermediate values',
      levels: Object.fromEntries(Object.entries(depthDefs).map(([k, v]) => [k, v.value])),
    }),
    category: 'depth',
    namespace: 'depth',
    semanticMeaning: 'Depth scale reference',
    description: 'Reference for z-index scale structure. 10-unit gaps allow intermediate values.',
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'depth',
    tokens,
  };
}
