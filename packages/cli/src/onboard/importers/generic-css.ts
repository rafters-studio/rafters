/**
 * Generic CSS Importer
 *
 * Fallback importer for CSS files with custom properties that don't match
 * specific frameworks like shadcn. Imports any CSS custom properties as tokens.
 */

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Token } from '@rafters/shared';
import { type CSSVariable, parseCSSFile } from '../css-parser.js';
import type { Importer, ImporterDetection, ImportResult, ImportWarning } from './types.js';

// Common CSS file locations to scan
const CSS_PATHS = [
  'styles/variables.css',
  'css/variables.css',
  'src/styles/variables.css',
  'src/css/variables.css',
  'styles/tokens.css',
  'css/tokens.css',
  'src/styles/tokens.css',
  'src/css/tokens.css',
  'styles/colors.css',
  'css/colors.css',
  'app/globals.css',
  'src/app/globals.css',
  'styles/globals.css',
  'src/styles/globals.css',
  'src/index.css',
  'index.css',
];

// Minimum variables needed for import
const MIN_VARIABLES = 3;

/**
 * Infer token category from variable name
 */
function inferCategory(name: string): string {
  const n = name.toLowerCase();

  // Radius patterns (check before color since 'border-radius' contains 'border')
  if (n.includes('radius') || n.includes('rounded')) {
    return 'radius';
  }

  // Shadow patterns (check before color)
  if (n.includes('shadow') || n.includes('elevation')) {
    return 'shadow';
  }

  // Color patterns
  if (
    n.includes('color') ||
    n.includes('bg') ||
    n.includes('background') ||
    n.includes('foreground') ||
    n.includes('text') ||
    n.includes('border') ||
    n.includes('primary') ||
    n.includes('secondary') ||
    n.includes('accent') ||
    n.includes('muted') ||
    n.includes('destructive') ||
    n.includes('success') ||
    n.includes('warning') ||
    n.includes('error') ||
    n.includes('info')
  ) {
    return 'color';
  }

  // Spacing patterns
  if (
    n.includes('space') ||
    n.includes('spacing') ||
    n.includes('gap') ||
    n.includes('margin') ||
    n.includes('padding')
  ) {
    return 'spacing';
  }

  // Typography patterns
  if (n.includes('font') || n.includes('line-height') || n.includes('letter-spacing')) {
    return 'typography';
  }

  // Animation/motion patterns
  if (
    n.includes('duration') ||
    n.includes('delay') ||
    n.includes('ease') ||
    n.includes('transition') ||
    n.includes('animation')
  ) {
    return 'motion';
  }

  // Z-index patterns
  if (n.includes('z-index') || n.includes('zindex') || n.includes('layer')) {
    return 'z-index';
  }

  return 'misc';
}

/**
 * Infer namespace from category
 */
function inferNamespace(category: string): string {
  switch (category) {
    case 'color':
      return 'color';
    case 'spacing':
      return 'spacing';
    case 'typography':
      return 'typography';
    case 'radius':
      return 'radius';
    case 'shadow':
      return 'shadow';
    case 'motion':
      return 'motion';
    case 'z-index':
      return 'layout';
    default:
      return 'misc';
  }
}

/**
 * Normalize variable name to token name
 * Removes -- prefix and converts to kebab-case
 */
function normalizeTokenName(varName: string): string {
  return varName.replace(/^--/, '');
}

/**
 * Convert a CSS variable to a Rafters token
 */
function variableToToken(
  variable: CSSVariable,
  isDarkVariant: boolean,
): { token: Token; warning?: ImportWarning } {
  const baseName = normalizeTokenName(variable.name);
  const tokenName = isDarkVariant ? `${baseName}-dark` : baseName;
  const category = inferCategory(baseName);
  const namespace = inferNamespace(category);

  const token: Token = {
    name: tokenName,
    value: variable.value,
    category,
    namespace,
    userOverride: null,
    semanticMeaning: `Imported from CSS variable ${variable.name}`,
    usageContext: isDarkVariant ? ['dark mode'] : ['light mode', 'default'],
    containerQueryAware: true,
  };

  return { token };
}

export const genericCSSImporter: Importer = {
  metadata: {
    id: 'generic-css',
    name: 'Generic CSS',
    description: 'Import design tokens from CSS custom properties',
    filePatterns: ['*.css'],
    priority: 10, // Low priority - fallback importer
  },

  async detect(projectPath: string): Promise<ImporterDetection> {
    const detection: ImporterDetection = {
      canImport: false,
      confidence: 0,
      detectedBy: [],
      sourcePaths: [],
    };

    // Try each potential CSS file location
    for (const cssPath of CSS_PATHS) {
      const fullPath = join(projectPath, cssPath);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed = parseCSSFile(content);

        // Skip if this looks like shadcn (let shadcn importer handle it)
        if (parsed.sourceType === 'shadcn') {
          continue;
        }

        // Need minimum number of variables
        if (parsed.variables.length >= MIN_VARIABLES) {
          detection.canImport = true;
          // Lower confidence than shadcn since this is a fallback
          detection.confidence = 0.5 + Math.min(parsed.variables.length / 100, 0.3);
          detection.detectedBy.push(
            `${parsed.variables.length} CSS variables in ${basename(cssPath)}`,
          );
          detection.sourcePaths.push(fullPath);
          detection.context = { parsed };
          return detection;
        }
      } catch (err) {
        // Only skip for "file not found" errors
        if (
          err instanceof Error &&
          'code' in err &&
          (err.code === 'ENOENT' || err.code === 'ENOTDIR')
        ) {
          continue;
        }
        throw err;
      }
    }

    return detection;
  },

  async import(_projectPath: string, detection: ImporterDetection): Promise<ImportResult> {
    const tokens: Token[] = [];
    const warnings: ImportWarning[] = [];
    let variablesProcessed = 0;
    let skipped = 0;

    // Use cached parsed result if available
    let parsed: ReturnType<typeof parseCSSFile>;

    if (detection.context?.parsed) {
      parsed = detection.context.parsed as ReturnType<typeof parseCSSFile>;
    } else {
      const sourcePath = detection.sourcePaths[0];
      if (!sourcePath) {
        return {
          tokens: [],
          warnings: [{ level: 'error', message: 'No source path found' }],
          source: 'generic-css',
          variablesProcessed: 0,
          tokensCreated: 0,
          skipped: 0,
        };
      }

      let content: string;
      try {
        content = await readFile(sourcePath, 'utf-8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          tokens: [],
          warnings: [{ level: 'error', message: `Failed to read CSS file: ${message}` }],
          source: 'generic-css',
          variablesProcessed: 0,
          tokensCreated: 0,
          skipped: 0,
        };
      }

      try {
        parsed = parseCSSFile(content);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          tokens: [],
          warnings: [{ level: 'error', message: `Failed to parse CSS: ${message}` }],
          source: 'generic-css',
          variablesProcessed: 0,
          tokensCreated: 0,
          skipped: 0,
        };
      }
    }

    // Track seen token names to avoid duplicates (prefer light mode)
    const seenNames = new Set<string>();

    for (const variable of parsed.variables) {
      variablesProcessed++;

      const isDark = variable.context === 'dark' || variable.context === 'media';
      const result = variableToToken(variable, isDark);

      // Skip duplicates
      if (seenNames.has(result.token.name)) {
        skipped++;
        continue;
      }
      seenNames.add(result.token.name);

      tokens.push(result.token);
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return {
      tokens,
      warnings,
      source: 'generic-css',
      variablesProcessed,
      tokensCreated: tokens.length,
      skipped,
    };
  },
};
