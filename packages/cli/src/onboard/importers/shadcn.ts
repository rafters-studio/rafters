/**
 * shadcn/ui Importer
 *
 * Imports design tokens from shadcn/ui projects.
 * shadcn uses CSS custom properties with a predictable HSL format.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Token } from '@rafters/shared';
import { type CSSVariable, parseCSSFile } from '../css-parser.js';
import type { Importer, ImporterDetection, ImportResult, ImportWarning } from './types.js';

// Common shadcn CSS file locations
const SHADCN_CSS_PATHS = [
  'app/globals.css',
  'src/app/globals.css',
  'src/globals.css',
  'styles/globals.css',
  'src/styles/globals.css',
  'src/index.css',
  'app/global.css',
];

// shadcn variable names that indicate this is a shadcn project
const SHADCN_MARKERS = ['--background', '--foreground', '--primary', '--radius'];

// Minimum markers needed for high confidence detection
const MIN_MARKERS = 3;

/**
 * Parse HSL value from shadcn format
 * shadcn uses "220 14% 96%" or "220 14.3% 95.9%" format
 */
function parseHSLValue(value: string): { h: number; s: number; l: number } | null {
  // Match patterns like "220 14% 96%" or "220 14.3% 95.9%"
  const match = value.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  return {
    h: Number.parseFloat(match[1]),
    s: Number.parseFloat(match[2]),
    l: Number.parseFloat(match[3]),
  };
}

/**
 * Convert HSL to OKLCH approximation
 */
function hslToOklchString(h: number, s: number, l: number): string {
  // Convert HSL to approximate OKLCH
  // L in OKLCH roughly maps to L in HSL but with different scale
  const oklchL = l / 100;

  // Chroma roughly correlates with saturation
  // Max chroma is around 0.37 at full saturation
  const oklchC = (s / 100) * 0.37 * (1 - Math.abs(2 * oklchL - 1));

  // Hue is roughly the same
  const oklchH = h;

  return `oklch(${oklchL.toFixed(3)} ${oklchC.toFixed(3)} ${oklchH.toFixed(1)})`;
}

/**
 * Map shadcn variable names to Rafters token names and categories
 */
function mapShadcnToRafters(
  varName: string,
): { name: string; category: string; namespace: string } | null {
  // Remove -- prefix
  const name = varName.replace(/^--/, '');

  // Map based on shadcn naming conventions
  const mappings: Record<string, { name: string; category: string; namespace: string }> = {
    // Semantic surface colors
    background: { name: 'background', category: 'semantic', namespace: 'color' },
    foreground: { name: 'foreground', category: 'semantic', namespace: 'color' },
    card: { name: 'card', category: 'semantic', namespace: 'color' },
    'card-foreground': { name: 'card-foreground', category: 'semantic', namespace: 'color' },
    popover: { name: 'popover', category: 'semantic', namespace: 'color' },
    'popover-foreground': { name: 'popover-foreground', category: 'semantic', namespace: 'color' },

    // Primary palette
    primary: { name: 'primary-500', category: 'palette', namespace: 'color' },
    'primary-foreground': { name: 'primary-foreground', category: 'semantic', namespace: 'color' },

    // Secondary
    secondary: { name: 'secondary-500', category: 'palette', namespace: 'color' },
    'secondary-foreground': {
      name: 'secondary-foreground',
      category: 'semantic',
      namespace: 'color',
    },

    // Muted
    muted: { name: 'muted-500', category: 'palette', namespace: 'color' },
    'muted-foreground': { name: 'muted-foreground', category: 'semantic', namespace: 'color' },

    // Accent
    accent: { name: 'accent-500', category: 'palette', namespace: 'color' },
    'accent-foreground': { name: 'accent-foreground', category: 'semantic', namespace: 'color' },

    // Destructive
    destructive: { name: 'destructive-500', category: 'palette', namespace: 'color' },
    'destructive-foreground': {
      name: 'destructive-foreground',
      category: 'semantic',
      namespace: 'color',
    },

    // Border and input
    border: { name: 'border', category: 'semantic', namespace: 'color' },
    input: { name: 'input', category: 'semantic', namespace: 'color' },
    ring: { name: 'ring', category: 'semantic', namespace: 'color' },

    // Radius
    radius: { name: 'radius-md', category: 'radius', namespace: 'radius' },

    // Chart colors (shadcn v2)
    'chart-1': { name: 'chart-1', category: 'chart', namespace: 'color' },
    'chart-2': { name: 'chart-2', category: 'chart', namespace: 'color' },
    'chart-3': { name: 'chart-3', category: 'chart', namespace: 'color' },
    'chart-4': { name: 'chart-4', category: 'chart', namespace: 'color' },
    'chart-5': { name: 'chart-5', category: 'chart', namespace: 'color' },

    // Sidebar (shadcn v2)
    'sidebar-background': { name: 'sidebar-background', category: 'semantic', namespace: 'color' },
    'sidebar-foreground': { name: 'sidebar-foreground', category: 'semantic', namespace: 'color' },
    'sidebar-primary': { name: 'sidebar-primary', category: 'semantic', namespace: 'color' },
    'sidebar-primary-foreground': {
      name: 'sidebar-primary-foreground',
      category: 'semantic',
      namespace: 'color',
    },
    'sidebar-accent': { name: 'sidebar-accent', category: 'semantic', namespace: 'color' },
    'sidebar-accent-foreground': {
      name: 'sidebar-accent-foreground',
      category: 'semantic',
      namespace: 'color',
    },
    'sidebar-border': { name: 'sidebar-border', category: 'semantic', namespace: 'color' },
    'sidebar-ring': { name: 'sidebar-ring', category: 'semantic', namespace: 'color' },
  };

  return mappings[name] ?? null;
}

/**
 * Convert a shadcn CSS variable to a Rafters token
 */
function variableToToken(
  variable: CSSVariable,
  isDarkVariant: boolean,
): { token: Token; warning?: ImportWarning } | null {
  const mapping = mapShadcnToRafters(variable.name);
  if (!mapping) {
    return null;
  }

  let value: string;
  let warning: ImportWarning | undefined;

  // Parse the HSL value
  const hsl = parseHSLValue(variable.value);
  if (hsl) {
    // Convert to OKLCH
    value = hslToOklchString(hsl.h, hsl.s, hsl.l);
  } else if (variable.value.match(/^\d/)) {
    // Might be a radius value like "0.5rem"
    value = variable.value;
  } else {
    // Unknown format, store as-is with warning
    value = variable.value;
    warning = {
      level: 'warning',
      message: `Could not parse value format: ${variable.value}`,
      source: { file: 'globals.css', line: variable.line, column: variable.column },
      suggestion: 'Value stored as-is, may need manual conversion',
    };
  }

  // Append -dark suffix for dark mode variants
  const tokenName = isDarkVariant ? `${mapping.name}-dark` : mapping.name;

  const token: Token = {
    name: tokenName,
    value,
    category: mapping.category,
    namespace: mapping.namespace,
    userOverride: null,
    semanticMeaning: `Imported from shadcn ${variable.name}`,
    usageContext: isDarkVariant ? ['dark mode'] : ['light mode', 'default'],
    containerQueryAware: true,
  };

  if (warning) {
    return { token, warning };
  }
  return { token };
}

export const shadcnImporter: Importer = {
  metadata: {
    id: 'shadcn',
    name: 'shadcn/ui',
    description: 'Import design tokens from shadcn/ui CSS custom properties',
    filePatterns: ['globals.css', 'global.css', 'index.css'],
    priority: 80, // High priority since shadcn is common
  },

  async detect(projectPath: string): Promise<ImporterDetection> {
    const detection: ImporterDetection = {
      canImport: false,
      confidence: 0,
      detectedBy: [],
      sourcePaths: [],
    };

    // Try each potential CSS file location
    for (const cssPath of SHADCN_CSS_PATHS) {
      const fullPath = join(projectPath, cssPath);
      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed = parseCSSFile(content);

        if (parsed.sourceType === 'shadcn') {
          detection.canImport = true;
          detection.confidence = 0.9;
          detection.detectedBy.push(`shadcn pattern in ${cssPath}`);
          detection.sourcePaths.push(fullPath);
          detection.context = { parsed };
          return detection;
        }

        // Check for markers manually
        const varNames = parsed.variables.map((v) => v.name);
        const markerCount = SHADCN_MARKERS.filter((m) => varNames.includes(m)).length;

        if (markerCount >= MIN_MARKERS) {
          detection.canImport = true;
          detection.confidence = 0.7 + markerCount * 0.05;
          detection.detectedBy.push(`${markerCount} shadcn markers in ${cssPath}`);
          detection.sourcePaths.push(fullPath);
          detection.context = { parsed };
          return detection;
        }
      } catch (err) {
        // Only skip for "file not found" errors - propagate unexpected errors
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

    // Use cached parsed result if available, or read from detected source path
    let parsed: ReturnType<typeof parseCSSFile>;

    if (detection.context?.parsed) {
      parsed = detection.context.parsed as ReturnType<typeof parseCSSFile>;
    } else {
      const sourcePath = detection.sourcePaths[0];
      if (!sourcePath) {
        return {
          tokens: [],
          warnings: [{ level: 'error', message: 'No source path found' }],
          source: 'shadcn',
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
          source: 'shadcn',
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
          source: 'shadcn',
          variablesProcessed: 0,
          tokensCreated: 0,
          skipped: 0,
        };
      }
    }

    for (const variable of parsed.variables) {
      variablesProcessed++;

      const isDark = variable.context === 'dark' || variable.context === 'media';
      const result = variableToToken(variable, isDark);

      if (!result) {
        skipped++;
        continue;
      }

      tokens.push(result.token);
      if (result.warning) {
        warnings.push(result.warning);
      }
    }

    return {
      tokens,
      warnings,
      source: 'shadcn',
      variablesProcessed,
      tokensCreated: tokens.length,
      skipped,
    };
  },
};
