/**
 * Component Intelligence
 * Types and utilities for parsing component intelligence metadata from JSDoc comments
 *
 * Intelligence metadata captures design decisions and cognitive load information
 * embedded in component source files via JSDoc tags.
 */

import { parse, type Spec } from 'comment-parser';

// ==================== Types ====================

/**
 * Intelligence metadata extracted from component JSDoc comments
 * Named JSDocIntelligence to avoid conflict with ComponentIntelligence in types.ts
 */
export interface JSDocIntelligence {
  /** Cognitive load score (0-10 scale) */
  cognitiveLoad?: number;
  /** Attention economics guidance */
  attentionEconomics?: string;
  /** Accessibility requirements and guidance */
  accessibility?: string;
  /** Trust-building patterns */
  trustBuilding?: string;
  /** Semantic meaning and purpose */
  semanticMeaning?: string;
  /** Usage patterns with dos and nevers */
  usagePatterns?: {
    dos: string[];
    nevers: string[];
  };
}

/**
 * Component category for organization
 */
export type ComponentCategory =
  | 'layout'
  | 'form'
  | 'feedback'
  | 'navigation'
  | 'overlay'
  | 'data-display'
  | 'utility';

/**
 * Structured dependency information extracted from JSDoc tags
 */
export interface JSDocDependencies {
  /** Runtime dependencies from @dependencies tag */
  runtime: string[];
  /** Dev dependencies from @devDependencies tag */
  dev: string[];
  /** Internal workspace dependencies from @internal-dependencies tag */
  internal: string[];
}

/**
 * Full component metadata including intelligence
 */
export interface ComponentMetadata {
  /** Component file name (without extension) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Brief description from JSDoc */
  description?: string;
  /** Component category */
  category: ComponentCategory;
  /** Intelligence metadata */
  intelligence?: JSDocIntelligence;
  /** Available variants */
  variants: string[];
  /** Available sizes */
  sizes: string[];
  /** External dependencies */
  dependencies: string[];
  /** Primitive dependencies */
  primitives: string[];
  /** Structured dependency information from JSDoc tags */
  jsDocDependencies?: JSDocDependencies;
  /** Relative file path */
  filePath: string;
}

// ==================== Parser ====================

/**
 * Parse JSDoc comments from source to extract intelligence metadata
 */
export function parseJSDocIntelligence(source: string): JSDocIntelligence | undefined {
  const blocks = parse(source);
  if (blocks.length === 0) return undefined;

  const intelligence: JSDocIntelligence = {};
  let hasAnyField = false;

  // Process all JSDoc blocks
  for (const block of blocks) {
    for (const tag of block.tags) {
      const tagName = tag.tag.toLowerCase();
      const value = getTagValue(tag);

      switch (tagName) {
        case 'cognitive-load':
        case 'cognitiveload': {
          // Parse format: "6/10 - Description" or just "6"
          const match = value.match(/^(\d+)(?:\/10)?/);
          if (match?.[1]) {
            const num = Number.parseInt(match[1], 10);
            if (!Number.isNaN(num) && num >= 0 && num <= 10) {
              intelligence.cognitiveLoad = num;
              hasAnyField = true;
            }
          }
          break;
        }
        case 'attention-economics':
        case 'attentioneconomics':
          intelligence.attentionEconomics = value;
          hasAnyField = true;
          break;
        case 'accessibility':
          intelligence.accessibility = value;
          hasAnyField = true;
          break;
        case 'trust-building':
        case 'trustbuilding':
          intelligence.trustBuilding = value;
          hasAnyField = true;
          break;
        case 'semantic-meaning':
        case 'semanticmeaning':
          intelligence.semanticMeaning = value;
          hasAnyField = true;
          break;
        case 'usage-patterns':
        case 'usagepatterns':
          // Parse DO:/NEVER: patterns from value
          parseUsagePatternsInline(value, intelligence);
          hasAnyField = true;
          break;
        case 'do':
          if (!intelligence.usagePatterns) {
            intelligence.usagePatterns = { dos: [], nevers: [] };
          }
          intelligence.usagePatterns.dos.push(value);
          hasAnyField = true;
          break;
        case 'never':
          if (!intelligence.usagePatterns) {
            intelligence.usagePatterns = { dos: [], nevers: [] };
          }
          intelligence.usagePatterns.nevers.push(value);
          hasAnyField = true;
          break;
      }
    }
  }

  return hasAnyField ? intelligence : undefined;
}

/**
 * Parse usage patterns from inline format
 * Format: "DO: foo NEVER: bar DO: baz"
 */
function parseUsagePatternsInline(value: string, intelligence: JSDocIntelligence): void {
  if (!intelligence.usagePatterns) {
    intelligence.usagePatterns = { dos: [], nevers: [] };
  }

  // Match DO: patterns - use negative lookahead to match any chars except keywords
  const doMatches = value.matchAll(/DO:\s*((?:(?!DO:|NEVER:).)+?)(?=(?:DO:|NEVER:|$))/gi);
  for (const match of doMatches) {
    const text = match[1]?.trim();
    if (text) intelligence.usagePatterns.dos.push(text);
  }

  // Match NEVER: patterns - use negative lookahead to match any chars except keywords
  const neverMatches = value.matchAll(/NEVER:\s*((?:(?!DO:|NEVER:).)+?)(?=(?:DO:|NEVER:|$))/gi);
  for (const match of neverMatches) {
    const text = match[1]?.trim();
    if (text) intelligence.usagePatterns.nevers.push(text);
  }
}

/**
 * Extract the full value from a JSDoc tag (name + description)
 */
function getTagValue(tag: Spec): string {
  const parts: string[] = [];
  if (tag.name) parts.push(tag.name);
  if (tag.description) parts.push(tag.description);
  return parts.join(' ').trim();
}

/**
 * Parse description from JSDoc (first line before tags)
 */
export function parseDescription(source: string): string | undefined {
  const blocks = parse(source);
  if (blocks.length === 0) return undefined;

  const description = blocks[0]?.description;
  return description ? description.trim() : undefined;
}

// ==================== Extraction Utilities ====================

/**
 * Extract variants from component source
 * Looks for variant prop type definitions
 */
export function extractVariants(source: string): string[] {
  // Match variant type like: variant?: 'default' | 'secondary' | 'destructive'
  const match = source.match(/variant\??\s*:\s*(['"][^'"]+['"](?:\s*\|\s*['"][^'"]+['"])*)/);

  if (!match?.[1]) return ['default'];

  const values: string[] = [];
  const allMatches = [...match[1].matchAll(/['"]([^'"]+)['"]/g)];

  for (const m of allMatches) {
    const val = m[1];
    if (val) values.push(val);
  }

  return values.length > 0 ? values : ['default'];
}

/**
 * Extract sizes from component source
 */
export function extractSizes(source: string): string[] {
  // Match size type like: size?: 'sm' | 'default' | 'lg'
  const match = source.match(/size\??\s*:\s*(['"][^'"]+['"](?:\s*\|\s*['"][^'"]+[''])*)/);

  if (!match?.[1]) return ['default'];

  const values: string[] = [];
  const allMatches = [...match[1].matchAll(/['"]([^'"]+)['"]/g)];

  for (const m of allMatches) {
    const val = m[1];
    if (val) values.push(val);
  }

  return values.length > 0 ? values : ['default'];
}

/**
 * Extract external dependencies from imports
 */
export function extractDependencies(source: string): string[] {
  const deps: string[] = [];
  const allMatches = [...source.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)];

  for (const match of allMatches) {
    const pkg = match[1];
    // Only include external packages, not relative imports
    if (pkg && !pkg.startsWith('.') && !pkg.startsWith('/')) {
      if (!deps.includes(pkg)) {
        deps.push(pkg);
      }
    }
  }

  return deps;
}

/**
 * Extract primitive dependencies from source
 */
export function extractPrimitiveDependencies(source: string): string[] {
  const primitives: string[] = [];
  const allMatches = [...source.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)];

  for (const match of allMatches) {
    const pkg = match[1];
    // Check if it's a primitive import
    if (pkg && (pkg.includes('/primitives/') || pkg.includes('../primitives/'))) {
      const primitiveName = pkg
        .split('/')
        .pop()
        ?.replace(/\.(ts|tsx)$/, '');
      if (primitiveName && !primitives.includes(primitiveName)) {
        primitives.push(primitiveName);
      }
    }
  }

  return primitives;
}

/** Maps lowercase JSDoc tag names to their JSDocDependencies field */
const DEP_TAG_MAP: Record<string, keyof JSDocDependencies> = {
  dependencies: 'runtime',
  devdependencies: 'dev',
  'internal-dependencies': 'internal',
  internaldependencies: 'internal',
};

/**
 * Extract structured dependency information from JSDoc tags
 *
 * Parses three dependency tags from JSDoc comments:
 * - @dependencies - runtime dependencies (e.g., nanostores@^0.11.0)
 * - @devDependencies - dev dependencies
 * - @internal-dependencies - internal workspace dependencies (e.g., @rafters/color-utils)
 *
 * Values are split on whitespace. Tags present but empty produce empty arrays.
 * Missing tags also produce empty arrays.
 */
export function extractJSDocDependencies(source: string): JSDocDependencies {
  const result: JSDocDependencies = { runtime: [], dev: [], internal: [] };
  const blocks = parse(source);
  if (blocks.length === 0) return result;

  for (const block of blocks) {
    for (const tag of block.tags) {
      const field = DEP_TAG_MAP[tag.tag.toLowerCase()];
      if (!field) continue;

      const value = getTagValue(tag).trim();
      if (value) {
        const tokens = value.split(/\s+/).filter(Boolean);
        const validTokens: string[] = [];
        for (const token of tokens) {
          if (token.startsWith('(')) break;
          validTokens.push(token);
        }
        result[field].push(...validTokens);
      }
    }
  }

  return {
    runtime: [...new Set(result.runtime)],
    dev: [...new Set(result.dev)],
    internal: [...new Set(result.internal)],
  };
}

/**
 * Convert kebab-case to Title Case
 */
export function toDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
