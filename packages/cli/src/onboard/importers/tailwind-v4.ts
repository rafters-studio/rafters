/**
 * Tailwind v4 Importer
 *
 * Imports design tokens from Tailwind v4 @theme blocks.
 * Tailwind v4 defines all tokens as CSS custom properties inside @theme,
 * making them straightforward to extract and map to Rafters tokens.
 */

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Token } from '@rafters/shared';
import { type CSSVariable, parseCSSFile } from '../css-parser.js';
import type { Importer, ImporterDetection, ImportResult, ImportWarning } from './types.js';

// CSS files where Tailwind v4 @theme blocks live
const TAILWIND_CSS_PATHS = [
  'app/globals.css',
  'src/app/globals.css',
  'src/index.css',
  'src/main.css',
  'src/styles.css',
  'src/styles/globals.css',
  'styles/globals.css',
  'app/app.css',
  'app/root.css',
  'theme.css',
  'src/theme.css',
];

/**
 * Tailwind v4 namespace -> Rafters category mapping.
 * Category and namespace are always identical in Tailwind v4 tokens.
 */
const NAMESPACE_MAP: Record<string, string> = {
  color: 'color',
  spacing: 'spacing',
  font: 'typography',
  text: 'typography',
  leading: 'typography',
  tracking: 'typography',
  'font-weight': 'typography',
  radius: 'radius',
  shadow: 'shadow',
  'inset-shadow': 'shadow',
  ease: 'motion',
  duration: 'motion',
  animate: 'motion',
  opacity: 'opacity',
  blur: 'effect',
};

// Sorted longest-first so "font-weight" matches before "font"
const SORTED_NAMESPACES = Object.keys(NAMESPACE_MAP).sort((a, b) => b.length - a.length);

/**
 * Extract the Tailwind namespace from a variable name.
 * Returns null for unmapped namespaces (breakpoint, container, perspective)
 * which are layout/viewport concerns, not design tokens.
 *
 * --color-primary-500 -> "color"
 * --spacing-4 -> "spacing"
 * --font-sans -> "font"
 */
function extractNamespace(varName: string): string | null {
  const name = varName.replace(/^--/, '');

  for (const ns of SORTED_NAMESPACES) {
    if (name.startsWith(`${ns}-`)) {
      return ns;
    }
  }

  return null;
}

/**
 * Build a Rafters token name from a Tailwind v4 variable.
 *
 * Tailwind v4 uses flat namespaced names:
 *   --color-primary-500  -> primary-500
 *   --spacing-4          -> 4
 *   --font-sans          -> sans
 *   --ease-in-out        -> motion-ease-in-out (motion namespace remapped)
 *   --duration-150       -> motion-duration-150 (motion namespace remapped)
 *   --inset-shadow-sm    -> inset-sm (prefixed to avoid collision with --shadow-sm)
 */
function buildTokenName(varName: string, twNamespace: string): string {
  const withoutPrefix = varName.replace(/^--/, '');
  const afterNamespace = withoutPrefix.slice(twNamespace.length + 1); // +1 for the dash

  // Motion tokens need rafters namespace prefix per feedback memory
  if (twNamespace === 'ease') {
    return `motion-ease-${afterNamespace}`;
  }
  if (twNamespace === 'duration') {
    return `motion-duration-${afterNamespace}`;
  }
  // Inset shadows get prefixed to avoid collision with shadow tokens
  if (twNamespace === 'inset-shadow') {
    return `inset-${afterNamespace}`;
  }

  return afterNamespace || withoutPrefix;
}

/**
 * Build an ImportResult with a single error warning and zero counters
 */
function errorResult(message: string, file?: string): ImportResult {
  const warning: ImportWarning = file
    ? { level: 'error', message, source: { file } }
    : { level: 'error', message };
  return {
    tokens: [],
    warnings: [warning],
    source: 'tailwind-v4',
    variablesProcessed: 0,
    tokensCreated: 0,
    skipped: 0,
  };
}

/**
 * Convert a Tailwind v4 CSS variable to a Rafters token
 */
function variableToToken(variable: CSSVariable): Token | null {
  const twNamespace = extractNamespace(variable.name);
  if (!twNamespace) return null;

  const category = NAMESPACE_MAP[twNamespace];
  if (!category) return null;

  return {
    name: buildTokenName(variable.name, twNamespace),
    value: variable.value,
    category,
    namespace: category,
    userOverride: null,
    semanticMeaning: `Imported from Tailwind v4 ${variable.name}`,
    usageContext:
      variable.context === 'dark' || variable.context === 'media'
        ? ['dark mode']
        : ['light mode', 'default'],
    containerQueryAware: true,
  };
}

export const tailwindV4Importer: Importer = {
  metadata: {
    id: 'tailwind-v4',
    name: 'Tailwind CSS v4',
    description: 'Import design tokens from Tailwind v4 @theme CSS custom properties',
    filePatterns: ['*.css'],
    priority: 90, // Higher than shadcn (80) since @theme is unambiguous
  },

  async detect(projectPath: string): Promise<ImporterDetection> {
    const detection: ImporterDetection = {
      canImport: false,
      confidence: 0,
      detectedBy: [],
      sourcePaths: [],
    };

    for (const cssPath of TAILWIND_CSS_PATHS) {
      const fullPath = join(projectPath, cssPath);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed = parseCSSFile(content);

        if (parsed.sourceType === 'tailwind-v4' && parsed.hasThemeBlock) {
          // Count theme variables for confidence
          const themeVars = parsed.variables.filter((v) => v.context === 'theme');

          detection.canImport = true;
          detection.confidence = 0.95; // @theme is very high signal
          detection.detectedBy.push(
            `@theme block with ${themeVars.length} variables in ${basename(cssPath)}`,
          );
          detection.sourcePaths.push(fullPath);
          detection.context = { parsed };
          return detection;
        }
      } catch (err) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err.code === 'ENOENT' || err.code === 'ENOTDIR')
        ) {
          continue;
        }
        // CSS parse errors skip the file instead of aborting the scan
        if (err instanceof Error && err.message.includes('parse')) {
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

    let parsed: ReturnType<typeof parseCSSFile>;

    if (detection.context?.parsed) {
      parsed = detection.context.parsed as ReturnType<typeof parseCSSFile>;
    } else {
      const sourcePath = detection.sourcePaths[0];
      if (!sourcePath) {
        return errorResult('No source path found');
      }

      let content: string;
      try {
        content = await readFile(sourcePath, 'utf-8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(`Failed to read CSS file: ${message}`, sourcePath);
      }

      try {
        parsed = parseCSSFile(content);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(`Failed to parse CSS: ${message}`, sourcePath);
      }
    }

    const seenKeys = new Set<string>();

    for (const variable of parsed.variables) {
      variablesProcessed++;

      const token = variableToToken(variable);
      if (!token) {
        skipped++;
        continue;
      }

      // Key by namespace+name to avoid cross-namespace collisions (shadow-sm vs radius-sm)
      const dedupeKey = `${token.namespace}:${token.name}`;
      if (seenKeys.has(dedupeKey)) {
        warnings.push({
          level: 'info',
          message: `Duplicate token ${dedupeKey} from ${variable.name}, keeping first occurrence`,
        });
        skipped++;
        continue;
      }
      seenKeys.add(dedupeKey);

      tokens.push(token);
    }

    return {
      tokens,
      warnings,
      source: 'tailwind-v4',
      variablesProcessed,
      tokensCreated: tokens.length,
      skipped,
    };
  },
};
