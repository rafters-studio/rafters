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
 * Tailwind v4 namespace -> Rafters category/namespace mapping
 */
interface NamespaceMapping {
  category: string;
  namespace: string;
}

const NAMESPACE_MAP: Record<string, NamespaceMapping> = {
  color: { category: 'color', namespace: 'color' },
  spacing: { category: 'spacing', namespace: 'spacing' },
  font: { category: 'typography', namespace: 'typography' },
  text: { category: 'typography', namespace: 'typography' },
  leading: { category: 'typography', namespace: 'typography' },
  tracking: { category: 'typography', namespace: 'typography' },
  'font-weight': { category: 'typography', namespace: 'typography' },
  radius: { category: 'radius', namespace: 'radius' },
  shadow: { category: 'shadow', namespace: 'shadow' },
  'inset-shadow': { category: 'shadow', namespace: 'shadow' },
  ease: { category: 'motion', namespace: 'motion' },
  duration: { category: 'motion', namespace: 'motion' },
  animate: { category: 'motion', namespace: 'motion' },
  opacity: { category: 'opacity', namespace: 'opacity' },
  blur: { category: 'effect', namespace: 'effect' },
};

// Namespaces to skip -- these are layout/viewport concerns, not design tokens
const SKIP_NAMESPACES = new Set(['breakpoint', 'container', 'perspective']);

/**
 * Extract the Tailwind namespace from a variable name.
 * --color-primary-500 -> "color"
 * --spacing-4 -> "spacing"
 * --font-sans -> "font"
 */
function extractNamespace(varName: string): string | null {
  const name = varName.replace(/^--/, '');

  // Try longest match first (font-weight before font)
  const candidates = Object.keys(NAMESPACE_MAP).sort((a, b) => b.length - a.length);
  for (const ns of candidates) {
    if (name.startsWith(`${ns}-`)) {
      return ns;
    }
  }

  // Check skip list
  for (const skip of SKIP_NAMESPACES) {
    if (name.startsWith(`${skip}-`)) {
      return null;
    }
  }

  return null;
}

/**
 * Build a Rafters token name from a Tailwind v4 variable.
 *
 * Tailwind v4 uses flat namespaced names:
 *   --color-primary-500  -> primary-500
 *   --spacing-4          -> spacing-4
 *   --font-sans          -> font-sans
 *   --ease-in-out        -> motion-ease-in-out (motion namespace remapped)
 *   --duration-150       -> motion-duration-150 (motion namespace remapped)
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

  return afterNamespace || withoutPrefix;
}

/**
 * Convert a Tailwind v4 CSS variable to a Rafters token
 */
function variableToToken(variable: CSSVariable): {
  token: Token;
  warning?: ImportWarning;
} | null {
  const twNamespace = extractNamespace(variable.name);
  if (!twNamespace) return null;

  const mapping = NAMESPACE_MAP[twNamespace];
  if (!mapping) return null;

  const tokenName = buildTokenName(variable.name, twNamespace);

  const token: Token = {
    name: tokenName,
    value: variable.value,
    category: mapping.category,
    namespace: mapping.namespace,
    userOverride: null,
    semanticMeaning: `Imported from Tailwind v4 ${variable.name}`,
    usageContext:
      variable.context === 'dark' || variable.context === 'media'
        ? ['dark mode']
        : ['light mode', 'default'],
    containerQueryAware: true,
  };

  return { token };
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
        return {
          tokens: [],
          warnings: [{ level: 'error', message: 'No source path found' }],
          source: 'tailwind-v4',
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
          source: 'tailwind-v4',
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
          source: 'tailwind-v4',
          variablesProcessed: 0,
          tokensCreated: 0,
          skipped: 0,
        };
      }
    }

    const seenKeys = new Set<string>();

    for (const variable of parsed.variables) {
      variablesProcessed++;

      const result = variableToToken(variable);
      if (!result) {
        skipped++;
        continue;
      }

      // Key by namespace+name to avoid cross-namespace collisions (shadow-sm vs radius-sm)
      const dedupeKey = `${result.token.namespace}:${result.token.name}`;
      if (seenKeys.has(dedupeKey)) {
        skipped++;
        continue;
      }
      seenKeys.add(dedupeKey);

      tokens.push(result.token);
      if (result.warning) {
        warnings.push(result.warning);
      }
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
