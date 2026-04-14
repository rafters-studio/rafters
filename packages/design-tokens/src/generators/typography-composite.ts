/**
 * Typography Composite Generator
 *
 * Generates composite typography tokens -- one per semantic role.
 * Each token stores the full typographic treatment (family, size, weight,
 * line-height, tracking) as structured JSON data. The exporter reads
 * these composites to generate @utility classes.
 *
 * Same pattern as semantic.ts for colors: reads from a single source of
 * truth in defaults.ts, produces Token objects with rich intelligence metadata.
 */

import type { Token } from '@rafters/shared';
import {
  DEFAULT_TYPOGRAPHY_COMPOSITE_MAPPINGS,
  TYPOGRAPHY_ROLE_CONSUMERS,
  type TypographyCompositeMapping,
} from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

/**
 * Map a font-family role to the token it depends on.
 */
function familyRoleToDependency(role: TypographyCompositeMapping['fontFamily']): string {
  switch (role) {
    case 'heading':
      return 'font-heading';
    case 'body':
      return 'font-body';
    case 'code':
      return 'font-code';
  }
}

/**
 * Generate composite typography tokens from the single source of truth.
 *
 * Uses DEFAULT_TYPOGRAPHY_COMPOSITE_MAPPINGS from defaults.ts which contains
 * all typography role definitions with property references.
 */
export function generateTypographyCompositeTokens(_config: ResolvedSystemConfig): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const [name, mapping] of Object.entries(DEFAULT_TYPOGRAPHY_COMPOSITE_MAPPINGS)) {
    // Typography accessibility validation deferred to #1246 (typography package).
    const familyDep = familyRoleToDependency(mapping.fontFamily);

    const dependsOn = [
      familyDep,
      `font-size-${mapping.fontSize}`,
      `font-weight-${mapping.fontWeight}`,
      `line-height-${mapping.lineHeight}`,
      `letter-spacing-${mapping.letterSpacing}`,
    ];

    const compositeValue = JSON.stringify({
      fontFamily: mapping.fontFamily,
      fontSize: mapping.fontSize,
      fontWeight: mapping.fontWeight,
      lineHeight: mapping.lineHeight,
      letterSpacing: mapping.letterSpacing,
      ...(mapping.responsive ? { responsive: mapping.responsive } : {}),
    });

    const consumers = TYPOGRAPHY_ROLE_CONSUMERS[name] ?? [];

    tokens.push({
      name,
      value: compositeValue,
      category: 'typography',
      namespace: 'typography-composite',
      semanticMeaning: mapping.meaning,
      usageContext: mapping.contexts,
      trustLevel: mapping.trustLevel,
      consequence: mapping.consequence,
      dependsOn,
      applicableComponents: consumers,
      containerQueryAware: true,
      generateUtilityClass: true,
      description: `Typography composite: font-${mapping.fontFamily} text-${mapping.fontSize} font-${mapping.fontWeight}. ${mapping.meaning}`,
      generatedAt: timestamp,
      userOverride: null,
      usagePatterns: {
        do: mapping.do,
        never: mapping.never,
      },
    });
  }

  return {
    namespace: 'typography-composite',
    tokens,
  };
}
