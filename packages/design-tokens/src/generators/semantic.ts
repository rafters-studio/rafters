/**
 * Semantic Color Generator
 *
 * Generates semantic color tokens using the single source of truth from defaults.ts.
 * All semantic mappings (primary, secondary, destructive, success, warning, info,
 * highlight, sidebar tokens, chart colors, etc.) are defined in DEFAULT_SEMANTIC_COLOR_MAPPINGS.
 *
 * Uses ColorReference to point to color families + positions, allowing
 * the underlying colors to change while semantic meaning stays consistent.
 *
 * Supports both light and dark mode references.
 *
 * Each token gets a generationRule so the dependency graph can auto-cascade
 * when the underlying color family changes:
 * - contrast:auto for foreground tokens (WCAG-safe pairing)
 * - state:hover/active/focus/disabled for state variants
 * - scale:N for direct position references (base, border, ring, subtle)
 */

import type { ColorReference, Token } from '@rafters/shared';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS, type SemanticColorMapping } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

/**
 * Helper to convert SemanticColorMapping to ColorReference for light mode
 */
function toColorRef(mapping: SemanticColorMapping): ColorReference {
  return { family: mapping.light.family, position: mapping.light.position };
}

/**
 * Get dark mode color reference from mapping
 */
function toDarkColorRef(mapping: SemanticColorMapping): ColorReference {
  return { family: mapping.dark.family, position: mapping.dark.position };
}

/**
 * Determine the generation rule for a semantic token based on its name and role.
 *
 * Pattern matching:
 * - *-foreground, *-text, *-contrast -> contrast:auto (WCAG pair lookup)
 * - *-hover -> state:hover
 * - *-active -> state:active
 * - *-focus -> state:focus
 * - *-disabled -> state:disabled
 * - everything else -> scale:position (direct reference)
 */
function deriveGenerationRule(name: string, lightRef: ColorReference): string {
  // Foreground/text tokens need WCAG contrast pairing
  if (name.endsWith('-foreground') || name.endsWith('-text') || name.endsWith('-contrast')) {
    return 'contrast:auto';
  }

  // State variant tokens
  if (name.endsWith('-hover') && !name.endsWith('-hover-foreground')) {
    return 'state:hover';
  }
  if (name.endsWith('-active') && !name.endsWith('-active-foreground')) {
    return 'state:active';
  }
  if (name.endsWith('-focus') && !name.endsWith('-focus-foreground')) {
    return 'state:focus';
  }
  if (name.endsWith('-disabled') && !name.endsWith('-disabled-foreground')) {
    return 'state:disabled';
  }

  // Everything else: direct scale position reference
  return `scale:${lightRef.position}`;
}

/**
 * Generate semantic color tokens from the single source of truth.
 *
 * Uses DEFAULT_SEMANTIC_COLOR_MAPPINGS from defaults.ts which contains
 * all semantic color definitions with proper color family references.
 *
 * Each token includes a generationRule so the registry's dependency graph
 * can automatically cascade changes when color families are updated.
 */
export function generateSemanticTokens(_config: ResolvedSystemConfig): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();

  for (const [name, mapping] of Object.entries(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
    const lightRef = toColorRef(mapping);
    const darkRef = toDarkColorRef(mapping);

    // dependsOn[0] = the color family token (for ColorValue/WCAG data access)
    // dependsOn[1] = dark mode position token (for Tailwind exporter)
    const familyDep = lightRef.family;
    const darkTokenName = `${darkRef.family}-${darkRef.position}`;
    const dependsOn: string[] = [familyDep];
    if (darkTokenName !== familyDep) {
      dependsOn.push(darkTokenName);
    }

    const generationRule = deriveGenerationRule(name, lightRef);

    tokens.push({
      name,
      value: lightRef, // Light mode is default value; dark mode lookup via dependsOn[1]
      category: 'color',
      namespace: 'semantic',
      semanticMeaning: mapping.meaning,
      usageContext: mapping.contexts,
      trustLevel: mapping.trustLevel,
      consequence: mapping.consequence,
      dependsOn,
      generationRule,
      description: `${mapping.meaning}. Light: ${lightRef.family}-${lightRef.position}, Dark: ${darkRef.family}-${darkRef.position}.`,
      generatedAt: timestamp,
      containerQueryAware: true,
      userOverride: null,
      usagePatterns: {
        do: mapping.do,
        never: mapping.never,
      },
      requiresConfirmation:
        mapping.consequence === 'destructive' || mapping.consequence === 'permanent',
    });
  }

  return {
    namespace: 'semantic',
    tokens,
  };
}
