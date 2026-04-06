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
  rules?: string[];
  composites?: string[];
  intelligence?: ComponentIntelligence;
}

export interface RegistryIndex {
  name: string;
  homepage: string;
  components: string[];
  primitives: string[];
  composites: string[];
  rules: string[];
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
 * Get path to composites
 */
function getCompositesPath(): string {
  return join(process.cwd(), '../../packages/ui/src/composites');
}

/**
 * Component file extensions to discover.
 * The .tsx file is the primary; others are framework-specific variants.
 */
const COMPONENT_EXTENSIONS = ['.tsx', '.astro', '.vue', '.svelte'];

/**
 * Shared auxiliary file suffixes bundled with components.
 * These provide class maps, types, or constants shared across framework variants.
 */
const SHARED_SUFFIXES = ['.classes.ts', '.types.ts', '.constants.ts'];

/** Regex matching import statements -- shared across extraction functions */
const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

/** Same pattern but excludes "import type" to avoid treating type-only imports as deps */
const VALUE_IMPORT_REGEX =
  /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * List all available component names.
 * Deduplicates across extensions so a component with both .tsx and .astro appears once.
 */
export function listComponentNames(): string[] {
  const componentsDir = getComponentsPath();
  const allFiles = readdirSync(componentsDir);
  const names = new Set<string>();

  for (const f of allFiles) {
    for (const ext of COMPONENT_EXTENSIONS) {
      if (f.endsWith(ext)) {
        names.add(basename(f, ext));
        break;
      }
    }
  }

  return [...names].sort();
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
 * List all available composite names
 */
export function listCompositeNames(): string[] {
  const compositesDir = getCompositesPath();
  try {
    return readdirSync(compositesDir)
      .filter((f) => f.endsWith('.composite.json'))
      .map((f) => basename(f, '.composite.json'));
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Load a single composite by name
 */
export function loadComposite(name: string): RegistryItem | null {
  const filePath = join(getCompositesPath(), `${name}.composite.json`);

  try {
    const content = readFileSync(filePath, 'utf-8');

    return {
      name,
      type: 'composite',
      primitives: [],
      files: [
        {
          path: `composites/${name}.composite.json`,
          content,
          dependencies: [],
          devDependencies: [],
        },
      ],
    };
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Load all composites
 */
export function loadAllComposites(): RegistryItem[] {
  const names = listCompositeNames();
  return names.map((name) => loadComposite(name)).filter((c): c is RegistryItem => c !== null);
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
const EXCLUDED_DEPS = new Set([
  'react/jsx-runtime',
  '@types/react',
  '@types/react-dom',
  'astro/types',
]);

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
 * Load a single component by name.
 * Discovers all framework variants (.tsx, .astro, .vue, .svelte) and
 * shared auxiliary files (.classes.ts, etc.) to include in the registry item.
 */
export function loadComponent(name: string): RegistryItem | null {
  const componentsDir = getComponentsPath();
  const files: RegistryFile[] = [];
  let primitivesAll: string[] = [];
  let intelligence: ReturnType<typeof parseJSDocFromSource> | undefined;

  // Load framework-specific variants
  for (const ext of COMPONENT_EXTENSIONS) {
    const filePath = join(componentsDir, `${name}${ext}`);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const analysis = analyzeSource(content, false);

      files.push({
        path: `components/ui/${name}${ext}`,
        content,
        dependencies: analysis.allExternalDeps,
        devDependencies: analysis.devDependencies,
      });

      // Merge primitive/internal deps from all variants.
      // Filter out shared auxiliary files (e.g. button.classes) -- they are bundled
      // with the component's files, not standalone primitives.
      const realPrimitives = analysis.importDeps.internal.filter(
        (dep) => !SHARED_SUFFIXES.some((suffix) => dep === name + suffix.replace(/\.ts$/, '')),
      );
      primitivesAll = [
        ...new Set([...primitivesAll, ...realPrimitives, ...analysis.primitiveDeps]),
      ];

      // Use intelligence from first variant that has it (typically .tsx)
      if (!intelligence && analysis.intelligence) {
        intelligence = analysis.intelligence;
      }
    } catch {
      // Variant doesn't exist for this extension -- skip
    }
  }

  // No files found at all
  if (files.length === 0) {
    return null;
  }

  // Load shared auxiliary files for this component and any imported siblings.
  // Resolves from actual imports so typography-h1 picks up typography.classes.ts
  // via its `import ... from './typography.classes'` statement.
  const loadedPaths = new Set(files.map((f) => f.path));

  // Collect sibling imports from all loaded files
  const siblingImports = new Set<string>();
  for (const file of files) {
    for (const sibling of extractSiblingImports(file.content)) {
      siblingImports.add(sibling);
    }
  }

  // Try loading shared files by name (e.g., button -> button.classes.ts)
  for (const suffix of SHARED_SUFFIXES) {
    const sharedPath = join(componentsDir, `${name}${suffix}`);
    const sharedFilePath = `components/ui/${name}${suffix}`;
    if (loadedPaths.has(sharedFilePath)) continue;
    try {
      const content = readFileSync(sharedPath, 'utf-8');
      files.push({ path: sharedFilePath, content, dependencies: [], devDependencies: [] });
      loadedPaths.add(sharedFilePath);
    } catch {
      // No shared file -- skip
    }
  }

  // Resolve sibling imports that are shared files (e.g., ./typography.classes -> typography.classes.ts)
  for (const sibling of siblingImports) {
    // Check if the sibling IS a shared file (name contains a dot matching a known suffix)
    for (const suffix of SHARED_SUFFIXES) {
      const suffixBase = suffix.replace(/\.ts$/, ''); // .classes.ts -> .classes
      if (sibling.endsWith(suffixBase)) {
        const filePath = `components/ui/${sibling}.ts`;
        if (loadedPaths.has(filePath)) continue;
        try {
          const content = readFileSync(join(componentsDir, `${sibling}.ts`), 'utf-8');
          files.push({ path: filePath, content, dependencies: [], devDependencies: [] });
          loadedPaths.add(filePath);
        } catch {
          // Not found -- skip
        }
      }
    }
  }

  // Bundle sub-components that import this component's shared files.
  // e.g., typography-h1.astro imports ./typography.classes -> bundled with typography.
  // But alert-dialog.tsx (has its own .classes.ts) is NOT bundled with alert.
  const allDirFiles = readdirSync(componentsDir);
  const subPrefix = `${name}-`;
  for (const f of allDirFiles) {
    const matchedExt = COMPONENT_EXTENSIONS.find((ext) => f.endsWith(ext));
    if (!matchedExt || !f.startsWith(subPrefix)) continue;
    if (loadedPaths.has(`components/ui/${f}`)) continue;

    // Only bundle if the sub-component imports this component's shared file
    const subPath = join(componentsDir, f);
    try {
      const content = readFileSync(subPath, 'utf-8');
      const subSiblings = extractSiblingImports(content);
      const importsParentShared = subSiblings.some((s) =>
        SHARED_SUFFIXES.some((suffix) => s === `${name}${suffix.replace(/\.ts$/, '')}`),
      );
      if (!importsParentShared) continue;

      const analysis = analyzeSource(content, false);

      files.push({
        path: `components/ui/${f}`,
        content,
        dependencies: analysis.allExternalDeps,
        devDependencies: analysis.devDependencies,
      });
      loadedPaths.add(`components/ui/${f}`);

      primitivesAll = [...new Set([...primitivesAll, ...analysis.primitiveDeps])];
    } catch {
      // Sub-component file read error -- skip
    }
  }

  const result: RegistryItem = {
    name,
    type: 'ui',
    primitives: primitivesAll,
    files,
  };

  if (intelligence) {
    result.intelligence = intelligence;
  }

  return result;
}

/**
 * Try reading a file with .ts extension first, then .tsx.
 * Returns content and extension, or null if neither exists.
 */
function tryReadTs(dir: string, name: string): { content: string; ext: string } | null {
  for (const ext of ['.ts', '.tsx']) {
    try {
      return { content: readFileSync(join(dir, `${name}${ext}`), 'utf-8'), ext };
    } catch {
      // Try next extension
    }
  }
  return null;
}

/**
 * Load a single primitive by name
 */
export function loadPrimitive(name: string): RegistryItem | null {
  const primitivesDir = getPrimitivesPath();
  const loaded = tryReadTs(primitivesDir, name);
  if (!loaded) return null;

  try {
    const { content, ext: fileExt } = loaded;
    const { allExternalDeps, devDependencies, primitiveDeps, intelligence } = analyzeSource(
      content,
      true,
    );

    const files: RegistryFile[] = [
      {
        path: `lib/primitives/${name}${fileExt}`,
        content,
        dependencies: allExternalDeps,
        devDependencies,
      },
    ];

    // Detect sibling shared files (e.g., ./types) and include them.
    const siblingImports = extractSiblingImports(content);
    for (const sibling of siblingImports) {
      if (primitiveDeps.includes(sibling)) continue;

      const siblingLoaded = tryReadTs(primitivesDir, sibling);
      if (siblingLoaded) {
        const siblingAnalysis = analyzeSource(siblingLoaded.content, true);
        files.push({
          path: `lib/primitives/${sibling}${siblingLoaded.ext}`,
          content: siblingLoaded.content,
          dependencies: siblingAnalysis.allExternalDeps,
          devDependencies: siblingAnalysis.devDependencies,
        });
      }
    }

    const result: RegistryItem = {
      name,
      type: 'primitive',
      primitives: primitiveDeps,
      files,
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
    composites: listCompositeNames(),
    rules: [],
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

  const matches = content.matchAll(IMPORT_REGEX);

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
 * Extract bare sibling import names from source (e.g., ./types -> "types").
 * Returns only `./foo` style imports (no nested paths).
 */
export function extractSiblingImports(content: string): string[] {
  const siblings: string[] = [];
  const matches = content.matchAll(IMPORT_REGEX);

  for (const match of matches) {
    const pkg = match[1];
    if (pkg.startsWith('./') && !pkg.slice(2).includes('/')) {
      const name = basename(pkg).replace(/\.(tsx?|jsx?)$/, '');
      if (name && !siblings.includes(name)) {
        siblings.push(name);
      }
    }
  }

  return siblings;
}

/**
 * Extract primitive dependencies from source
 * @param content - Source code content
 * @param isPrimitive - If true, ./foo imports are treated as sibling primitives
 */
function extractPrimitiveDependencies(content: string, isPrimitive = false): string[] {
  const primitives: string[] = [];

  // Uses VALUE_IMPORT_REGEX (excludes "import type") to avoid treating
  // type-only shared files (like types.ts) as standalone primitive dependencies.
  const matches = content.matchAll(VALUE_IMPORT_REGEX);

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
