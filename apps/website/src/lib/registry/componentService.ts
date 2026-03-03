/**
 * Component Service
 * Loads components and primitives from UI package for registry endpoints
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse, type Spec } from 'comment-parser';
import type { RegistryItemType } from 'rafters/registry/types';

// Intelligence metadata extracted from JSDoc comments
export interface ComponentIntelligence {
  cognitiveLoad?: number; // 0-10 scale
  attentionEconomics?: string;
  accessibility?: string;
  trustBuilding?: string;
  semanticMeaning?: string;
  usagePatterns?: {
    dos: string[];
    nevers: string[];
  };
}

export interface RegistryFile {
  path: string;
  content: string;
  dependencies: string[]; // e.g., ["lodash@4.17.21"] - versioned
  devDependencies: string[]; // e.g., ["vitest"] - from @devDependencies JSDoc
}

export interface RegistryItem {
  name: string;
  type: RegistryItemType;
  description?: string;
  primitives: string[];
  files: RegistryFile[];
  intelligence?: ComponentIntelligence;
}

export interface RegistryIndex {
  name: string;
  homepage: string;
  components: string[];
  primitives: string[];
}

/**
 * Get path to UI package components
 */
function getComponentsPath(): string {
  return join(process.cwd(), '../../packages/ui/src/components/ui');
}

/**
 * Get path to primitives
 */
function getPrimitivesPath(): string {
  return join(process.cwd(), '../../packages/ui/src/primitives');
}

/**
 * List all available component names
 */
export function listComponentNames(): string[] {
  const componentsDir = getComponentsPath();
  return readdirSync(componentsDir)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => basename(f, '.tsx'));
}

/**
 * List all available primitive names
 */
export function listPrimitiveNames(): string[] {
  const primitivesDir = getPrimitivesPath();
  return readdirSync(primitivesDir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => basename(f, f.endsWith('.tsx') ? '.tsx' : '.ts'));
}

/**
 * Minimum framework versions required by Rafters components
 * These are the peer dependency requirements
 */
const FRAMEWORK_VERSIONS: Record<string, string> = {
  react: '19.2.0',
  'react-dom': '19.2.0',
  vue: '3.4.0',
  svelte: '4.0.0',
  'solid-js': '1.8.0',
  preact: '10.0.0',
};

/**
 * Dependencies to exclude (internal/build-time only)
 */
const EXCLUDED_DEPS = new Set(['react/jsx-runtime', '@types/react', '@types/react-dom']);

/**
 * Prefixes to exclude (internal packages)
 */
const EXCLUDED_PREFIXES = ['@rafters/'];

/**
 * Add versions to dependencies
 * Framework deps get minimum versions, others passed through (for now)
 */
function versionDeps(deps: string[]): string[] {
  return deps
    .filter((dep) => !EXCLUDED_DEPS.has(dep))
    .filter((dep) => !EXCLUDED_PREFIXES.some((prefix) => dep.startsWith(prefix)))
    .map((dep) => {
      const version = FRAMEWORK_VERSIONS[dep];
      return version ? `${dep}@${version}` : dep;
    });
}

/**
 * Parse JSDoc comments from source to extract intelligence metadata
 */
export function parseJSDocFromSource(source: string): ComponentIntelligence | undefined {
  const blocks = parse(source);
  if (blocks.length === 0) return undefined;

  const intelligence: ComponentIntelligence = {};
  let hasAnyField = false;

  // Process all JSDoc blocks
  for (const block of blocks) {
    for (const tag of block.tags) {
      const tagName = tag.tag.toLowerCase();
      const value = getTagValue(tag);

      switch (tagName) {
        case 'cognitiveload':
          {
            const num = Number.parseInt(value, 10);
            if (!Number.isNaN(num) && num >= 0 && num <= 10) {
              intelligence.cognitiveLoad = num;
              hasAnyField = true;
            }
          }
          break;
        case 'attentioneconomics':
          intelligence.attentionEconomics = value;
          hasAnyField = true;
          break;
        case 'accessibility':
          intelligence.accessibility = value;
          hasAnyField = true;
          break;
        case 'trustbuilding':
          intelligence.trustBuilding = value;
          hasAnyField = true;
          break;
        case 'semanticmeaning':
          intelligence.semanticMeaning = value;
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
 * Extract the full value from a JSDoc tag (name + description)
 */
function getTagValue(tag: Spec): string {
  const parts: string[] = [];
  if (tag.name) parts.push(tag.name);
  if (tag.description) parts.push(tag.description);
  return parts.join(' ').trim();
}

/**
 * Extract dependencies and devDependencies from JSDoc tags in source content.
 *
 * Uses comment-parser for JSDoc-aware parsing so that @dependencies appearing
 * in string literals, line comments, or template literals are not matched.
 *
 * Recognizes:
 *   @dependencies pkg1 pkg2 - runtime deps for consumers
 *   @devDependencies pkg1 pkg2 - dev-time deps for consumers
 *   @internal-dependencies ... - completely excluded from registry output
 *
 * Filters out @rafters/* packages (internal workspace deps, not for consumers).
 */
export function extractDepsFromSource(content: string): {
  dependencies: string[];
  devDependencies: string[];
} {
  const empty = { dependencies: [] as string[], devDependencies: [] as string[] };

  // Use comment-parser for JSDoc-aware parsing -- raw regex would match
  // @dependencies in string literals, line comments, and template literals
  let blocks: ReturnType<typeof parse>;
  try {
    blocks = parse(content);
  } catch {
    return empty;
  }

  if (blocks.length === 0) return empty;

  const deps = new Set<string>();
  const devDeps = new Set<string>();

  for (const block of blocks) {
    for (const tag of block.tags) {
      const tagName = tag.tag.toLowerCase();
      const value = getTagValue(tag);
      if (!value) continue;

      const target =
        tagName === 'dependencies' ? deps : tagName === 'devdependencies' ? devDeps : null;

      if (target) {
        for (const pkg of value.split(/\s+/)) {
          if (!pkg || pkg.startsWith('(')) break;
          if (!pkg.startsWith('@rafters/')) target.add(pkg);
        }
      }
    }
  }

  return { dependencies: [...deps], devDependencies: [...devDeps] };
}

/**
 * Analyze source content to extract merged dependencies and intelligence metadata.
 * Shared by loadComponent and loadPrimitive.
 */
function analyzeSource(
  content: string,
  isPrimitive: boolean,
): {
  importDeps: ReturnType<typeof extractDependencies>;
  allExternalDeps: string[];
  devDependencies: string[];
  primitiveDeps: string[];
  intelligence: ComponentIntelligence | undefined;
} {
  const importDeps = extractDependencies(content);
  const jsDocDeps = extractDepsFromSource(content);
  const primitiveDeps = extractPrimitiveDependencies(content, isPrimitive);
  const intelligence = parseJSDocFromSource(content);

  // Merge import-extracted and JSDoc-declared deps, deduplicated
  const allExternalDeps = [
    ...new Set([...versionDeps(importDeps.external), ...jsDocDeps.dependencies]),
  ];

  return {
    importDeps,
    allExternalDeps,
    devDependencies: jsDocDeps.devDependencies,
    primitiveDeps,
    intelligence,
  };
}

/**
 * Load a single component by name
 */
export function loadComponent(name: string): RegistryItem | null {
  const filePath = join(getComponentsPath(), `${name}.tsx`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const { importDeps, allExternalDeps, devDependencies, primitiveDeps, intelligence } =
      analyzeSource(content, false);

    const result: RegistryItem = {
      name,
      type: 'registry:ui',
      primitives: [...importDeps.internal, ...primitiveDeps],
      files: [
        {
          path: `components/ui/${name}.tsx`,
          content,
          dependencies: allExternalDeps,
          devDependencies,
        },
      ],
    };

    if (intelligence) {
      result.intelligence = intelligence;
    }

    return result;
  } catch (err) {
    console.error(`Failed to load component "${name}":`, err);
    return null;
  }
}

/**
 * Load a single primitive by name
 */
export function loadPrimitive(name: string): RegistryItem | null {
  const primitivesDir = getPrimitivesPath();

  // Try .ts first, then .tsx (for primitives like float that use JSX)
  let filePath = join(primitivesDir, `${name}.ts`);
  let fileExt = '.ts';

  try {
    readFileSync(filePath, 'utf-8');
  } catch {
    filePath = join(primitivesDir, `${name}.tsx`);
    fileExt = '.tsx';
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const { allExternalDeps, devDependencies, primitiveDeps, intelligence } = analyzeSource(
      content,
      true,
    );

    const result: RegistryItem = {
      name,
      type: 'registry:primitive',
      primitives: primitiveDeps,
      files: [
        {
          path: `lib/primitives/${name}${fileExt}`,
          content,
          dependencies: allExternalDeps,
          devDependencies,
        },
      ],
    };

    if (intelligence) {
      result.intelligence = intelligence;
    }

    return result;
  } catch (err) {
    console.error(`Failed to load primitive "${name}":`, err);
    return null;
  }
}

/**
 * Load all components
 */
export function loadAllComponents(): RegistryItem[] {
  const names = listComponentNames();
  return names.map((name) => loadComponent(name)).filter((c): c is RegistryItem => c !== null);
}

/**
 * Load all primitives
 */
export function loadAllPrimitives(): RegistryItem[] {
  const names = listPrimitiveNames();
  return names.map((name) => loadPrimitive(name)).filter((p): p is RegistryItem => p !== null);
}

/**
 * Get registry index
 */
export function getRegistryIndex(): RegistryIndex {
  return {
    name: 'rafters',
    homepage: 'https://rafters.studio',
    components: listComponentNames(),
    primitives: listPrimitiveNames(),
  };
}

/**
 * Get registry metadata with full component data
 */
export function getRegistryMetadata() {
  return {
    components: loadAllComponents(),
    primitives: loadAllPrimitives(),
  };
}

/**
 * Extract dependencies from component source
 */
function extractDependencies(content: string): {
  external: string[];
  internal: string[];
} {
  const external: string[] = [];
  const internal: string[] = [];

  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const matches = content.matchAll(importRegex);

  for (const match of matches) {
    const pkg = match[1];

    // Skip relative imports
    if (pkg.startsWith('.') || pkg.startsWith('/')) {
      // Check if it's an internal component reference
      if (pkg.includes('/components/')) {
        const componentName = basename(pkg, '.tsx');
        internal.push(componentName);
      }
      // Sibling component import (./foo with no nested path)
      if (pkg.startsWith('./') && !pkg.slice(2).includes('/')) {
        const componentName = basename(pkg).replace(/\.(tsx?|jsx?)$/, '');
        if (componentName && !internal.includes(componentName)) {
          internal.push(componentName);
        }
      }
      continue;
    }

    // External package
    if (!external.includes(pkg)) {
      external.push(pkg);
    }
  }

  return { external, internal };
}

/**
 * Extract primitive dependencies from source
 * @param content - Source code content
 * @param isPrimitive - If true, ./foo imports are treated as sibling primitives
 */
function extractPrimitiveDependencies(content: string, isPrimitive = false): string[] {
  const primitives: string[] = [];

  // Match imports from primitives directory
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  const matches = content.matchAll(importRegex);

  for (const match of matches) {
    const pkg = match[1];

    // Check if it's a primitive import
    // For primitives, ./foo (sibling import) is another primitive
    const isSiblingImport = isPrimitive && pkg.startsWith('./') && !pkg.slice(2).includes('/');
    const isPrimitiveImport =
      pkg.includes('/primitives/') ||
      pkg.includes('../primitives/') ||
      pkg.includes('../../primitives/') ||
      isSiblingImport;

    if (isPrimitiveImport) {
      const primitiveName = basename(pkg, '.ts');
      if (!primitives.includes(primitiveName)) {
        primitives.push(primitiveName);
      }
    }
  }

  return primitives;
}
