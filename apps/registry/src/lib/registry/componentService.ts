/**
 * Component Service
 * Loads components and primitives from UI package for registry endpoints
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse, type Spec } from 'comment-parser';

/**
 * Registry item types. Defined locally (like RegistryItem/RegistryFile/
 * RegistryIndex below) so the registry never imports from the `rafters` CLI's
 * BUILT dist -- rafters is code-first and only the CLI builds, in the build
 * step, which runs after typecheck. Importing from dist made `astro check`
 * depend on a build that has not happened yet in CI. The CLI's zod
 * RegistryItemTypeSchema is the runtime source of truth these must match.
 */
type RegistryItemType = 'ui' | 'primitive' | 'composite' | 'rule' | 'substrate';

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

/**
 * Per-target extraction types. Hand-mirrored from the CLI's zod source of truth
 * (packages/cli/src/registry/types.ts: ComponentTargetSchema / PropFieldSchema /
 * FacetSchema) for the same reason RegistryItem is -- the registry never imports
 * the CLI's built dist. The componentService.test.ts parses generator output
 * through the real zod schema, so the two declarations must agree.
 */
export type ComponentTarget = 'react' | 'astro' | 'vue' | 'svelte' | 'wc';

/** A structured, machine-actionable cross-prop rule -- never a prose string. */
export interface Constraint {
  when: { prop: string; matches: string };
  requires: { prop: string };
}

export type PropField =
  | {
      type: 'enum';
      values: string[]; // verbatim literal union members ([] only for a required non-union prop)
      default?: string;
      required?: boolean;
      constraint?: Constraint;
    }
  | {
      type: 'grammar';
      grammar: string[];
      vocab: string;
      onInvalid: 'silent-noop';
      default?: string;
    }
  | { type: 'deprecated'; deprecatedFor: string };

export interface Facet {
  props: Record<string, PropField>;
  slots?: string[];
  events?: string[];
  snippet: string;
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
  facets?: Partial<Record<ComponentTarget, Facet>>;
  parent?: string;
}

/** Source file extension -> framework target. Parallel to COMPONENT_EXTENSIONS. */
const EXT_TO_TARGET: Record<string, ComponentTarget> = {
  '.tsx': 'react',
  '.astro': 'astro',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.element.ts': 'wc',
};

export interface RegistryIndex {
  name: string;
  homepage: string;
  components: string[];
  primitives: string[];
  composites: string[];
  rules: string[];
  substrate: string[];
}

/**
 * Get path to UI package components
 */
function getComponentsPath(): string {
  return join(process.cwd(), '../../packages/ui/src/components');
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
  // RAFTERS_COMPOSITES_DIR lets a test point composite discovery at a fixtures
  // dir. It feeds BOTH listCompositeNames (the composite node set) and the
  // reverse index below, so #2072's assembleGraph invariant (every composesWith
  // edge names a real composite node) holds by construction. Unset in
  // production -> the real dir, which today does not exist -> ENOENT -> [].
  const override = process.env['RAFTERS_COMPOSITES_DIR'];
  if (override) return override;
  return join(process.cwd(), '../../packages/ui/src/composites');
}

/**
 * Component file extensions to discover.
 * The .tsx file is the primary; others are framework-specific variants.
 * .element.ts is the Web Component target, parallel to .tsx/.astro/.vue/.svelte.
 */
const COMPONENT_EXTENSIONS = ['.tsx', '.astro', '.vue', '.svelte', '.element.ts'];

/**
 * Shared auxiliary file suffixes bundled with components.
 * `.behavior.ts` is the score -- the single source of truth every framework
 * variant (.tsx, .element.ts, .astro) imports; without it the served component
 * is non-functional. The rest provide class maps, types, constants, or
 * shadow-DOM styles shared across variants.
 */
const SHARED_SUFFIXES = ['.behavior.ts', '.classes.ts', '.types.ts', '.constants.ts', '.styles.ts'];

/** Regex matching import statements -- shared across extraction functions */
const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * List all available component names.
 * `src/components` is NESTED: each component is a directory (`button/`) whose
 * primary file is `<name>/<name>.tsx` (or another framework extension). A
 * directory counts as a component only when it carries such a primary file --
 * this guards the silent-empty trap: a bare path swap would otherwise return
 * every directory name and then fail every load with no error.
 */
export function listComponentNames(): string[] {
  const componentsDir = getComponentsPath();
  const names = new Set<string>();

  for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { name } = entry;
    const hasPrimary = COMPONENT_EXTENSIONS.some((ext) =>
      existsSync(join(componentsDir, name, `${name}${ext}`)),
    );
    if (!hasPrimary) continue;
    names.add(name);
    for (const sub of listSubComponentNames(name)) names.add(sub);
  }

  return [...names].sort();
}

/**
 * Sub-component names living INSIDE a parent's directory: `card/card-header.astro`
 * yields `card-header`. A sub-component is a first-class registry name -- a
 * consumer writes `import CardHeader from '@/components/ui/card-header.astro'`,
 * so `rafters add card-header` has to resolve. They are addressable without a
 * directory of their own; see `resolveComponentDir`.
 *
 * A name is only a sub-component here if no directory of its own exists --
 * `alert-dialog/` and `hover-card/` are full components that merely share a
 * prefix, and the directory wins.
 */
function listSubComponentNames(parent: string): string[] {
  const componentsDir = getComponentsPath();
  const parentDir = join(componentsDir, parent);
  const names = new Set<string>();

  for (const file of readdirSync(parentDir)) {
    const ext = COMPONENT_EXTENSIONS.find((candidate) => file.endsWith(candidate));
    if (!ext) continue;
    const base = file.slice(0, -ext.length);
    if (base === parent || !base.startsWith(`${parent}-`)) continue;
    if (existsSync(join(componentsDir, base))) continue;
    names.add(base);
  }

  return [...names];
}

/**
 * Directory holding `name`'s source files, or null when nothing serves it.
 *
 * Components own a directory (`card/card.tsx`). Sub-components do not -- they
 * live beside their parent (`card/card-header.astro`, `typography/typography-h1.astro`)
 * because they share the parent's `.classes.ts`. Resolution trims trailing
 * `-segment`s off the name to find the owning parent, so `card-header` resolves
 * inside `card/` without a directory of its own, and adding a sub-component is
 * a new file rather than a new folder.
 *
 * A directory of the component's own always wins, so `alert-dialog` and
 * `hover-card` keep resolving to themselves rather than to `alert`/`hover`.
 */
function resolveComponentDir(name: string): { dir: string; owner: string } | null {
  const componentsDir = getComponentsPath();
  const hasPrimary = (dir: string, base: string): boolean =>
    COMPONENT_EXTENSIONS.some((ext) => existsSync(join(dir, `${base}${ext}`)));

  const ownDir = join(componentsDir, name);
  if (existsSync(ownDir) && hasPrimary(ownDir, name)) return { dir: ownDir, owner: name };

  const segments = name.split('-');
  for (let cut = segments.length - 1; cut > 0; cut--) {
    const parent = segments.slice(0, cut).join('-');
    const parentDir = join(componentsDir, parent);
    if (!existsSync(parentDir) || !hasPrimary(parentDir, parent)) continue;
    if (hasPrimary(parentDir, name)) return { dir: parentDir, owner: parent };
  }

  return null;
}

/**
 * The one primitive subsystem that lives in its own subdirectory rather than
 * flat under `primitives/`. The editor cluster (Spec 00 boundary 9) is a
 * structural boundary on disk: `primitives/editor/<name>.ts`. Discovery walks
 * the flat root PLUS this single known subdir -- one level deep, not unbounded
 * recursion. The served/consumer layout stays FLAT (`lib/primitives/<name>.ts`)
 * regardless of source nesting; see `flattenNestedPrimitiveImports`.
 */
const PRIMITIVE_SUBDIRS = ['editor'];

/** Read the `.ts`/`.tsx` basenames directly in `dir` (non-recursive). */
function listTsBasenames(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => basename(f, f.endsWith('.tsx') ? '.tsx' : '.ts'));
  } catch {
    return [];
  }
}

/**
 * List all available primitive names.
 * Walks the flat `primitives/` root plus each known one-level subdir (`editor/`).
 * Names are bare basenames (nesting is a source detail, invisible to consumers)
 * and the list is sorted+deduped so the returned array is deterministic and its
 * SET stays disjoint from every other kind's name list.
 */
export function listPrimitiveNames(): string[] {
  const primitivesDir = getPrimitivesPath();
  const names = new Set<string>(listTsBasenames(primitivesDir));
  for (const sub of PRIMITIVE_SUBDIRS) {
    for (const name of listTsBasenames(join(primitivesDir, sub))) names.add(name);
  }
  return [...names].sort();
}

/** packages/ui/src -- the root every source kind lives under. */
function getUiSrcPath(): string {
  return join(process.cwd(), '../../packages/ui/src');
}

/**
 * Dirs under ui/src that have DEDICATED loaders or are deprecated. Everything
 * else is generic copy-in substrate (the behavior-layer runtime: lib, hooks,
 * and any future flat dir). This is the only place kinds are named, and only
 * dirs with their own handling belong here -- a plain new folder is discovered
 * automatically, no edit required.
 */
const NON_SUBSTRATE_DIRS = new Set(['components', 'old', 'primitives', 'composites']);

/**
 * Discover substrate kind directories from the filesystem. Adding a flat dir
 * under ui/src makes it a served substrate kind with no code change here.
 */
export function listSubstrateKinds(): string[] {
  try {
    return readdirSync(getUiSrcPath(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !NON_SUBSTRATE_DIRS.has(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Every substrate file name across all discovered kinds, flat. The namespace is
 * flat because it is served under one `/registry/substrate/*` endpoint and
 * resolved by name; names are unique across kinds (asserted by the disjointness
 * test). Excludes tests and barrel indexes.
 */
export function listSubstrate(): string[] {
  const names = new Set<string>();
  for (const kind of listSubstrateKinds()) {
    for (const f of readdirSync(join(getUiSrcPath(), kind))) {
      if (
        f.endsWith('.ts') &&
        !f.endsWith('.test.ts') &&
        !f.endsWith('.d.ts') &&
        f !== 'index.ts'
      ) {
        names.add(basename(f, '.ts'));
      }
    }
  }
  return [...names].sort();
}

/**
 * Names of every RELATIVE dependency a source references -- value AND type.
 * A type-only import (e.g. `import type { Slice } from './compose'`) still
 * requires the file to be installed for the consumer's TypeScript to compile,
 * so the substrate closure must include it. Returns bare names; `fetchItem`
 * resolves each across the primitive/substrate/... endpoints.
 */
function extractSubstrateDepNames(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(IMPORT_REGEX)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const name = basename(spec).replace(/\.(tsx?|jsx?)$/, '');
    if (name) names.add(name);
  }
  return [...names];
}

/**
 * Load a substrate file by name -- finds which discovered kind dir holds it.
 * The item is `type: 'substrate'`; the kind is carried in the install path
 * (`<kind>/<name>.ts`), so the CLI installs and resolves it without per-kind
 * knowledge. Lists transitive substrate deps so resolveDependencies pulls the
 * full closure.
 */
export function loadSubstrate(name: string): RegistryItem | null {
  for (const kind of listSubstrateKinds()) {
    const loaded = tryReadTs(join(getUiSrcPath(), kind), name);
    if (!loaded) continue;

    const { content, ext } = loaded;
    const { allExternalDeps, devDependencies, intelligence } = analyzeSource(content, true);
    const result: RegistryItem = {
      name,
      type: 'substrate',
      primitives: extractSubstrateDepNames(content),
      files: [
        { path: `${kind}/${name}${ext}`, content, dependencies: allExternalDeps, devDependencies },
      ],
    };
    if (intelligence) result.intelligence = intelligence;
    return result;
  }
  return null;
}

/**
 * List available composite data file names (from .composite.json files)
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

export function listAllCompositeKeys(): string[] {
  return [...listCompositeNames(), 'composites'];
}

function extractComponentDeps(blocks: Array<{ type: string }>): string[] {
  const deps = new Set<string>();
  deps.add('composites');
  for (const block of blocks) {
    if (!block.type.startsWith('composite:')) {
      deps.add(block.type);
    }
  }
  return [...deps];
}

export function loadComposite(name: string): RegistryItem | null {
  if (name === 'composites') return loadCompositesRuntime();

  const filePath = join(getCompositesPath(), `${name}.composite.json`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as { blocks?: Array<{ type: string }> };
    const componentDeps = extractComponentDeps(parsed.blocks ?? []);

    return {
      name,
      type: 'composite',
      primitives: componentDeps,
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

function getCompositesPackagePath(): string {
  return join(process.cwd(), '../../packages/composites/src');
}

const COMPOSITES_RUNTIME_FILES = [
  'manifest.ts',
  'walk-blocks.ts',
  'resolve-block.ts',
  'rule-attrs.ts',
  'discovery.ts',
  'discovery-vite.ts',
  'to-jsx.tsx',
  'to-mdx.ts',
  'bridge.ts',
  'registry.ts',
  'rules.ts',
  'Composite.astro',
];

export function loadCompositesRuntime(): RegistryItem {
  const srcDir = getCompositesPackagePath();
  const files: RegistryFile[] = COMPOSITES_RUNTIME_FILES.map((filename) => {
    const content = readFileSync(join(srcDir, filename), 'utf-8');
    return {
      path: `lib/composites/${filename}`,
      content,
      dependencies: filename === 'manifest.ts' ? ['zod'] : [],
      devDependencies: [],
    };
  });

  return {
    name: 'composites',
    type: 'composite' as RegistryItemType,
    description:
      'Composites runtime: block tree walker, JSX/MDX serializers, registry, bridge, and manifest types.',
    primitives: [],
    files,
  };
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
 * Parse JSDoc comments from source to extract intelligence metadata.
 *
 * Accepts both hyphenated (`@cognitive-load`) and camelCase (`@cognitiveLoad`)
 * tag forms. The hyphen-stripping happens before switch matching, so
 * `@cognitive-load` and `@cognitiveLoad` both route to the same case.
 *
 * Also parses the `@usage-patterns` block format, which holds `DO:` and `NEVER:`
 * lines in the description, in addition to the legacy `@do` / `@never` separate-tag
 * form.
 *
 * @param source - The source code containing JSDoc comments
 * @param options - `strict: true` throws when no intelligence fields are found,
 *                  with the component name in the error message. Default false
 *                  preserves the silent-undefined behavior used by dev workflows.
 */
export function parseJSDocFromSource(
  source: string,
  options?: { strict?: boolean; componentName?: string },
): ComponentIntelligence | undefined {
  const blocks = parse(source);
  if (blocks.length === 0) {
    if (options?.strict) {
      throw new Error(
        `[parseJSDocFromSource] No JSDoc blocks found in ${options.componentName ?? 'component'}. ` +
          `Expected at least one of: @cognitive-load, @attention-economics, @accessibility, ` +
          `@trust-building, @semantic-meaning, @usage-patterns.`,
      );
    }
    return undefined;
  }

  const intelligence: ComponentIntelligence = {};
  let hasAnyField = false;

  // Process all JSDoc blocks
  for (const block of blocks) {
    for (const tag of block.tags) {
      // Strip hyphens and lowercase so `cognitive-load` and `cognitiveLoad`
      // both normalize to `cognitiveload`. Source files use the hyphenated form.
      const tagName = tag.tag.toLowerCase().replace(/-/g, '');
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
        case 'usagepatterns': {
          // Source format: `@usage-patterns` block with `DO:` and `NEVER:` lines
          // in the description body. Parse each line and route to dos/nevers.
          if (!intelligence.usagePatterns) {
            intelligence.usagePatterns = { dos: [], nevers: [] };
          }
          // Pull every text line out of the tag's source -- comment-parser stores
          // the raw lines on tag.source, with each line's `tokens.description` holding
          // the text after the leading `*`. The description string also has the same
          // content but flattened, so we use either as available.
          const linesFromSource = tag.source
            .map((s) => (s.tokens.description ?? '').trim())
            .filter((line) => line.length > 0);
          const lines = linesFromSource.length > 0 ? linesFromSource : value.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.startsWith('DO:')) {
              const item = line.slice(3).trim();
              if (item) {
                intelligence.usagePatterns.dos.push(item);
                hasAnyField = true;
              }
            } else if (line.startsWith('NEVER:')) {
              const item = line.slice(6).trim();
              if (item) {
                intelligence.usagePatterns.nevers.push(item);
                hasAnyField = true;
              }
            }
          }
          break;
        }
        case 'constraint': {
          // Structured cross-prop rule, e.g.
          //   @constraint when prop=size matches=icon* requires prop=aria-label
          // The parsed value is consumed by extractFacet (via extractConstraints)
          // and attached to the facet prop named in `when.prop`; ComponentIntelligence
          // itself carries no constraint field, so this case does not set hasAnyField.
          // Under strict intel, a malformed body is a hard error naming the component,
          // matching the missing-field strict behavior below.
          if (options?.strict && !parseConstraintBody(value)) {
            throw new Error(
              `[parseJSDocFromSource] Malformed @constraint in ${options.componentName ?? 'component'}: ` +
                `"${value}". Expected: when prop=<name> matches=<glob> requires prop=<name>.`,
            );
          }
          break;
        }
      }
    }
  }

  if (options?.strict && !hasAnyField) {
    throw new Error(
      `[parseJSDocFromSource] No intelligence fields found in ${options.componentName ?? 'component'}. ` +
        `Expected at least one of: @cognitive-load, @attention-economics, @accessibility, ` +
        `@trust-building, @semantic-meaning, @usage-patterns.`,
    );
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
 * Extract the @parent tag from JSDoc comments in source content.
 *
 * Uses comment-parser (like extractDepsFromSource) so that @parent appearing
 * in string literals or line comments is not matched. Returns the first
 * match, or undefined when no @parent tag is present.
 */
export function extractParentFromSource(content: string): string | undefined {
  let blocks: ReturnType<typeof parse>;
  try {
    blocks = parse(content);
  } catch {
    return undefined;
  }

  for (const block of blocks) {
    for (const tag of block.tags) {
      if (tag.tag.toLowerCase() === 'parent') {
        const value = getTagValue(tag).trim();
        if (value) return value;
      }
    }
  }

  return undefined;
}

/**
 * Analyze source content to extract merged dependencies and intelligence metadata.
 * Shared by loadComponent and loadPrimitive.
 */
/**
 * When set, parseJSDocFromSource throws if a component has no intelligence fields.
 * The build script for production registry deploys should set this so missing
 * intel fails the build instead of silently shipping empty JSON.
 */
const STRICT_INTEL = process.env.RAFTERS_STRICT_INTEL === '1';

function analyzeSource(
  content: string,
  isPrimitive: boolean,
  componentName?: string,
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
  // Only enforce strict intel on the .tsx primary; primitives and shared files
  // are exempt because they don't carry intelligence metadata.
  const enforceStrict = STRICT_INTEL && !isPrimitive && componentName !== undefined;
  const intelligence = parseJSDocFromSource(content, {
    strict: enforceStrict,
    componentName,
  });

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

/** PascalCase a component/prop name: `card-header` -> `CardHeader`. */
function pascalCase(input: string): string {
  return input
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Every exported literal-union type alias in a source, name -> members, verbatim
 * and in declaration order. Only `export type X = | 'a' | 'b' ...` matches;
 * `export type X = string` or a template type never does, so a styling prop can
 * never be collapsed to a bare-string type -- it is simply absent from the map.
 */
function extractLiteralUnions(source: string): Map<string, string[]> {
  const unions = new Map<string, string[]>();
  const typeRe = /export\s+type\s+(\w+)\s*=\s*((?:\s*\|\s*'[^']*')+)\s*;/g;
  for (const match of source.matchAll(typeRe)) {
    const values = [...match[2].matchAll(/'([^']*)'/g)].map((m) => m[1]);
    if (values.length > 0) unions.set(match[1], values);
  }
  return unions;
}

/**
 * Members of an INLINE literal union type expression (`'button' | 'submit'`),
 * or [] when the expression contains any non-literal part (`string`, `boolean`,
 * a named type). Never collapses a mixed expression to a bare string.
 */
function inlineUnionValues(typeExpr: string): string[] {
  if (!typeExpr.includes("'")) return [];
  const residue = typeExpr
    .replace(/'[^']*'/g, '')
    .replace(/\|/g, '')
    .trim();
  if (residue.length > 0) return [];
  return [...typeExpr.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

/** Defaults from the target's own destructuring: `variant = 'default'` -> default. */
function extractDestructuredDefaults(source: string): Map<string, string> {
  const defaults = new Map<string, string>();
  const block = source.match(/const\s*\{([\s\S]*?)\}\s*=\s*(?:props|Astro\.props)/);
  if (!block) return defaults;
  for (const match of block[1].matchAll(/([A-Za-z_$][\w$]*)\s*=\s*'([^']*)'/g)) {
    defaults.set(match[1], match[2]);
  }
  return defaults;
}

/** Prop names a target destructures from its props (React has no interface for `size`). */
function extractDestructuredNames(source: string): string[] {
  const block = source.match(/const\s*\{([\s\S]*?)\}\s*=\s*(?:props|Astro\.props)/);
  if (!block) return [];
  const names: string[] = [];
  for (const part of block[1].split(',')) {
    const match = part.match(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))/);
    const name = match?.[1] ?? match?.[2];
    if (name) names.push(name);
  }
  return names;
}

/** Fields of a target's own `interface Props`/`*Props` body: name, optionality, type. */
function extractInterfaceProps(
  source: string,
): Array<{ name: string; optional: boolean; typeExpr: string }> {
  const body = source.match(/interface\s+\w*Props\b[^{]*\{([\s\S]*?)\n\}/);
  if (!body) return [];
  const props: Array<{ name: string; optional: boolean; typeExpr: string }> = [];
  for (const line of body[1].split('\n')) {
    const match = line.match(/^\s*(?:'([^']+)'|([A-Za-z_$][\w$-]*))(\?)?\s*:\s*(.+?);?\s*$/);
    if (!match) continue;
    const name = match[1] ?? match[2];
    if (!name) continue;
    props.push({ name, optional: match[3] === '?', typeExpr: match[4].trim() });
  }
  return props;
}

/** The named slots a target renders (`<slot>` -> default, `<slot name="x">` -> x). */
function extractSlots(source: string): string[] {
  const slots = new Set<string>();
  for (const match of source.matchAll(/<slot\s+name="([^"]+)"/g)) slots.add(match[1]);
  // A bare `<slot>` / `<slot />` (no name= before its `>`) is the default slot.
  if (/<slot(?![^>]*\bname=)[\s/>]/.test(source)) slots.add('default');
  return [...slots];
}

/** Parse a `@constraint` body into a structured Constraint, or null if malformed. */
function parseConstraintBody(body: string): Constraint | null {
  const whenProp = body.match(/when\s+prop=(\S+)/)?.[1];
  const matches = body.match(/matches=(\S+)/)?.[1];
  const requiresProp = body.match(/requires\s+prop=(\S+)/)?.[1];
  if (!whenProp || !matches || !requiresProp) return null;
  return { when: { prop: whenProp, matches }, requires: { prop: requiresProp } };
}

/** Structured constraints from a source's `@constraint` tags, keyed by `when.prop`. */
function extractConstraints(source: string): Map<string, Constraint> {
  const constraints = new Map<string, Constraint>();
  let blocks: ReturnType<typeof parse>;
  try {
    blocks = parse(source);
  } catch {
    return constraints;
  }
  for (const block of blocks) {
    for (const tag of block.tags) {
      if (tag.tag.toLowerCase() !== 'constraint') continue;
      const parsed = parseConstraintBody(getTagValue(tag));
      if (parsed) constraints.set(parsed.when.prop, parsed);
    }
  }
  return constraints;
}

/**
 * Extract one target's facet from its already-read source.
 *
 * The declared issue signature took `(componentDir, name, ext, behaviorSource)`
 * and re-read the file; this takes the loop's already-read `targetSource`
 * instead, so extraction adds a regex pass and NO extra file read (the perf
 * requirement). `behaviorSource` is the shared `.behavior.ts`, the source of
 * truth for verbatim literal-union prop vocabularies.
 */
function extractFacet(
  name: string,
  ext: string,
  targetSource: string,
  behaviorSource: string | null,
): Facet | null {
  const target = EXT_TO_TARGET[ext];
  if (!target) return null;

  // wc has no functional attribute-driven props today: button.element.ts is a
  // bare HTMLElement subclass with no observedAttributes, and bindButton reads
  // only aria-* off the light-DOM root. Emit honest empty props and a light-DOM
  // enhancement snippet -- never a fabricated `variant="..."` attribute surface.
  if (target === 'wc') {
    return {
      props: {},
      snippet: `<rafters-${name}><button data-part="root" class="...">Save</button></rafters-${name}>`,
    };
  }

  const unions = behaviorSource
    ? extractLiteralUnions(behaviorSource)
    : new Map<string, string[]>();
  const defaults = extractDestructuredDefaults(targetSource);
  const constraints = extractConstraints(targetSource);
  const props: Record<string, PropField> = {};

  // A prop's literal-union members: a named alias by the <Component><Prop>
  // convention (button + variant -> ButtonVariant), the type annotation naming
  // an alias directly, or an inline literal union. Otherwise null.
  const resolveUnion = (propName: string, typeExpr?: string): string[] | null => {
    const byConvention = unions.get(pascalCase(name) + pascalCase(propName));
    if (byConvention) return byConvention;
    if (typeExpr) {
      const byAnnotation = unions.get(typeExpr);
      if (byAnnotation) return byAnnotation;
      const inline = inlineUnionValues(typeExpr);
      if (inline.length > 0) return inline;
    }
    return null;
  };

  const makeEnum = (propName: string, values: string[], required: boolean): PropField => {
    const field: PropField = { type: 'enum', values };
    const def = defaults.get(propName);
    if (def !== undefined) field.default = def;
    if (required) field.required = true;
    const constraint = constraints.get(propName);
    if (constraint) field.constraint = constraint;
    return field;
  };

  if (target === 'react') {
    // React's destructuring is the prop-name source: `size` lives in the
    // ButtonProps intersection, not the ButtonBaseProps body, so an interface
    // scan would miss it. Destructuring carries no requiredness, so only props
    // whose type resolves to a verbatim literal union are emitted.
    for (const propName of extractDestructuredNames(targetSource)) {
      const values = resolveUnion(propName);
      if (values) props[propName] = makeEnum(propName, values, false);
    }
  } else {
    // Interface-declared targets (astro/vue/svelte) carry requiredness. Emit a
    // prop when its type resolves to a literal union, OR it is required -- so a
    // required non-union structural prop (astro's `id: string`) is kept as an
    // empty-values enum with `required: true`, preserving the required/optional
    // asymmetry rather than fabricating a domain for it.
    for (const prop of extractInterfaceProps(targetSource)) {
      const values = resolveUnion(prop.name, prop.typeExpr);
      if (values) props[prop.name] = makeEnum(prop.name, values, !prop.optional);
      else if (!prop.optional) props[prop.name] = makeEnum(prop.name, [], true);
    }
  }

  const facet: Facet = { props, snippet: `<${pascalCase(name)}>Save</${pascalCase(name)}>` };
  // React exposes content via `children`, not slots -- omit slots for react
  // entirely (never scan its source, which could carry `<slot` in a JSDoc example).
  const slots = target === 'react' ? [] : extractSlots(targetSource);
  if (slots.length > 0) facet.slots = slots;
  return facet;
}

/**
 * Reverse index: the composite names that reference `componentName`. Iterates
 * the composite NODE set (listCompositeNames) and reuses loadComposite, whose
 * `primitives` field already holds the block component names (extractComponentDeps).
 * Because the discovery is identical to the node set's, every name returned is a
 * real composite node -- #2072's assembleGraph never sees a dangling edge.
 */
function findReferencingComposites(componentName: string): string[] {
  const referencing: string[] = [];
  for (const compositeName of listCompositeNames()) {
    const item = loadComposite(compositeName);
    if (item?.primitives.includes(componentName)) referencing.push(compositeName);
  }
  return referencing.sort();
}

/**
 * Load a single component by name.
 * Discovers all framework variants (.tsx, .astro, .vue, .svelte) and
 * shared auxiliary files (.classes.ts, etc.) to include in the registry item.
 */
export function loadComponent(name: string): RegistryItem | null {
  // Nested layout: every file for a component lives in its own directory
  // (`<components>/<name>/<name>.tsx`, `.behavior.ts`, `.classes.ts`, ...).
  // Sub-components (`card-header`, `typography-h1`) have no directory of their
  // own -- they live beside the parent whose `.classes.ts` they import -- so
  // the directory is resolved rather than assumed.
  const resolved = resolveComponentDir(name);
  if (!resolved) return null;
  const componentDir = resolved.dir;
  const files: RegistryFile[] = [];
  // Each existing framework variant's already-read source, for per-target facet
  // extraction after the shared .behavior.ts is loaded (no extra file reads).
  const targetSources: Array<{ ext: string; content: string }> = [];
  let primitivesAll: string[] = [];
  let intelligence: ReturnType<typeof parseJSDocFromSource> | undefined;
  let parent: string | undefined;

  // Load framework-specific variants
  // Strict intel is enforced only on the primary .tsx file. Other extensions
  // (.astro, .vue, .svelte) are framework variants that may not carry their
  // own JSDoc -- they inherit the .tsx intelligence in the merge below.
  for (const ext of COMPONENT_EXTENSIONS) {
    const filePath = join(componentDir, `${name}${ext}`);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const analysis = analyzeSource(content, false, ext === '.tsx' ? name : undefined);

      files.push({
        path: `components/ui/${name}${ext}`,
        content,
        dependencies: analysis.allExternalDeps,
        devDependencies: analysis.devDependencies,
      });
      if (EXT_TO_TARGET[ext]) targetSources.push({ ext, content });

      // Merge primitive/internal deps from all variants.
      // Filter out shared auxiliary files -- they are bundled with the
      // component's files, never fetched as standalone primitives. This must
      // match ANY shared sibling, not just this component's own: a component
      // can import a sibling's shared file (e.g. container imports
      // ./grid.classes for shared column classes), and that file is bundled by
      // name (see the sibling-import bundling below), so it must not leak into
      // primitives as a phantom item (which would 404 on install).
      const realPrimitives = analysis.importDeps.internal.filter(
        (dep) => !SHARED_SUFFIXES.some((suffix) => dep.endsWith(suffix.replace(/\.ts$/, ''))),
      );
      primitivesAll = [
        ...new Set([...primitivesAll, ...realPrimitives, ...analysis.primitiveDeps]),
      ];

      // Use intelligence from first variant that has it (typically .tsx)
      if (!intelligence && analysis.intelligence) {
        intelligence = analysis.intelligence;
      }

      // Use parent from first variant that declares it
      if (!parent) {
        const p = extractParentFromSource(content);
        if (p) parent = p;
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
    const sharedPath = join(componentDir, `${name}${suffix}`);
    const sharedFilePath = `components/ui/${name}${suffix}`;
    if (loadedPaths.has(sharedFilePath)) continue;
    try {
      const content = readFileSync(sharedPath, 'utf-8');
      const analysis = analyzeSource(content, false);
      files.push({
        path: sharedFilePath,
        content,
        dependencies: analysis.allExternalDeps,
        devDependencies: analysis.devDependencies,
      });
      loadedPaths.add(sharedFilePath);
      primitivesAll = [...new Set([...primitivesAll, ...analysis.primitiveDeps])];
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
          const content = readFileSync(join(componentDir, `${sibling}.ts`), 'utf-8');
          const analysis = analyzeSource(content, false);
          files.push({
            path: filePath,
            content,
            dependencies: analysis.allExternalDeps,
            devDependencies: analysis.devDependencies,
          });
          loadedPaths.add(filePath);
          primitivesAll = [...new Set([...primitivesAll, ...analysis.primitiveDeps])];
        } catch {
          // Not found -- skip
        }
      }
    }
  }

  // Bundle sub-components that import this component's shared files.
  // e.g., typography-h1.astro imports ./typography.classes -> bundled with typography.
  // But alert-dialog.tsx (has its own .classes.ts) is NOT bundled with alert.
  const allDirFiles = readdirSync(componentDir);
  const subPrefix = `${name}-`;
  for (const f of allDirFiles) {
    const matchedExt = COMPONENT_EXTENSIONS.find((ext) => f.endsWith(ext));
    if (!matchedExt || !f.startsWith(subPrefix)) continue;
    if (loadedPaths.has(`components/ui/${f}`)) continue;

    // Only bundle if the sub-component imports this component's shared file
    const subPath = join(componentDir, f);
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

  // Subsystem files: the transitive closure of relative imports that resolve
  // inside the component directory but are NOT framework variants, shared
  // auxiliary files, or sub-components. These install nested under
  // `components/ui/<name>/` (e.g., `components/ui/editor/editor-history.ts`,
  // `components/ui/editor/ops/index.ts`).
  //
  // Queue entries carry { specifier, fromDir } where fromDir is the directory
  // (relative to componentDir) of the importing file, so `./format` from
  // `ops/index.ts` resolves as `ops/format`, not `format`.
  const subsystemQueue: Array<{ specifier: string; fromDir: string }> = [];
  const subsystemSeen = new Set<string>();

  for (const file of files) {
    for (const rel of extractAllRelativeImports(file.content)) {
      if (isSharedSuffix(rel)) continue;
      if (COMPONENT_EXTENSIONS.some((ext) => rel.endsWith(ext.replace(/^\./, '')))) continue;
      subsystemQueue.push({ specifier: rel, fromDir: '' });
    }
  }

  while (subsystemQueue.length > 0) {
    const { specifier, fromDir } = subsystemQueue.pop() as {
      specifier: string;
      fromDir: string;
    };
    const absSpecifier = fromDir ? `${fromDir}/${specifier}` : specifier;
    if (subsystemSeen.has(absSpecifier)) continue;
    subsystemSeen.add(absSpecifier);

    const resolved = resolveRelativeImport(componentDir, absSpecifier);
    if (!resolved) {
      throw new Error(
        `Dangling relative import "./${specifier}" in component "${name}": ` +
          `no file resolves at ${join(componentDir, absSpecifier)}(.ts|.tsx|/index.ts)`,
      );
    }

    const servedPath = `components/ui/${name}/${resolved.relPath}`;
    if (loadedPaths.has(servedPath)) continue;

    const analysis = analyzeSource(resolved.content, false);
    files.push({
      path: servedPath,
      content: resolved.content,
      dependencies: analysis.allExternalDeps,
      devDependencies: analysis.devDependencies,
    });
    loadedPaths.add(servedPath);
    primitivesAll = [...new Set([...primitivesAll, ...analysis.primitiveDeps])];

    // The resolved file's directory for its own relative imports
    const resolvedDir = resolved.relPath.includes('/')
      ? resolved.relPath.slice(0, resolved.relPath.lastIndexOf('/'))
      : '';
    for (const sub of extractAllRelativeImports(resolved.content)) {
      const subAbs = resolvedDir ? `${resolvedDir}/${sub}` : sub;
      if (!subsystemSeen.has(subAbs)) {
        subsystemQueue.push({ specifier: sub, fromDir: resolvedDir });
      }
    }
  }

  // Behavior-layer runtime substrate (lib/, hooks/) is resolved copy-in like
  // primitives: collect the names the component's files reference so
  // resolveDependencies pulls the full closure (contract, compose, use-memory,
  // ...). Both one- and two-level depths, matching the nested component layout.
  const kinds = listSubstrateKinds();
  const substrateImport =
    kinds.length > 0 ? new RegExp(`(?:\\.\\./)+(?:${kinds.join('|')})/([\\w-]+)`) : null;
  const substrateDeps = new Set<string>();
  if (substrateImport) {
    for (const file of files) {
      for (const match of file.content.matchAll(IMPORT_REGEX)) {
        const hit = match[1].match(substrateImport);
        if (hit) substrateDeps.add(hit[1]);
      }
    }
  }
  primitivesAll = [...new Set([...primitivesAll, ...substrateDeps])];

  // Drop deps that are actually the component's OWN sibling/sub-component files
  // or subsystem files (e.g. context-menu-sub.astro, editor-history.ts, ops/).
  // They live in this folder, so they are never standalone registry items --
  // listing them would make resolveDependencies chase a name that 404s.
  const stripExt = (s: string): string => s.replace(/\.[^./]+$/, '');
  const ownBasenames = new Set(readdirSync(componentDir).map(stripExt));
  for (const seen of subsystemSeen) {
    ownBasenames.add(stripExt(basename(seen)));
  }
  primitivesAll = primitivesAll.filter((dep) => !ownBasenames.has(stripExt(dep)));

  // Per-target facets. The shared .behavior.ts (now in `files` from the
  // shared-suffix loop above) is the verbatim literal-union source of truth;
  // each already-read variant source is extracted once. Always set `facets` and
  // `composites` (even empty) so RegistryItemSchema.parse is stable.
  const behaviorSource =
    files.find((f) => f.path === `components/ui/${name}.behavior.ts`)?.content ?? null;
  const facets: Partial<Record<ComponentTarget, Facet>> = {};
  for (const { ext, content } of targetSources) {
    const target = EXT_TO_TARGET[ext];
    if (!target) continue;
    const facet = extractFacet(name, ext, content, behaviorSource);
    if (facet) facets[target] = facet;
  }

  const result: RegistryItem = {
    name,
    type: 'ui',
    primitives: primitivesAll,
    files,
    composites: findReferencingComposites(name),
    facets,
  };

  if (intelligence) {
    result.intelligence = intelligence;
  }

  // A component cannot be its own parent -- guard against @parent tags on
  // sub-component JSDoc blocks inside the primary file (e.g. card.tsx carries
  // @parent card on CardHeader et al., but card itself has no parent).
  if (parent && parent !== name) {
    result.parent = parent;
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
 * Collapse one level of parent-relative import so a primitive that lives in a
 * source subdir (`primitives/editor/<name>.ts`) serves content identical to a
 * flat primitive. In the source tree a nested editor primitive reaches its
 * flat behavior-layer siblings via `../memory` and reaches `components/` via
 * `../../components/...`; in the FLAT served/consumer layout (every primitive
 * side by side under `lib/primitives/`) those must read `./memory` and
 * `../components/...`. Stripping exactly one `../` does both:
 *   `../memory`                 -> `./memory`
 *   `../../components/editor/x`  -> `../components/editor/x`
 * Editor-internal `./sibling` imports are already flat and untouched. This
 * runs BEFORE dependency analysis, so `../memory` is seen as the sibling
 * primitive `./memory` and is not silently dropped from the closure (#2018).
 */
function flattenNestedPrimitiveImports(content: string): string {
  return content.replace(
    /(from\s+['"])((?:\.\.\/)+)([^'"]*)(['"])/g,
    (_m, pre: string, ups: string, rest: string, post: string) => {
      const levels = ups.length / 3 - 1;
      const prefix = levels <= 0 ? './' : '../'.repeat(levels);
      return `${pre}${prefix}${rest}${post}`;
    },
  );
}

/**
 * Read a primitive's source, flat root first then the known `editor/` subdir.
 * Content read from a subdir is flattened so the served text matches the flat
 * consumer layout. Returns null when the primitive exists in neither place.
 */
function readPrimitiveSource(
  primitivesDir: string,
  name: string,
): { content: string; ext: string } | null {
  const flat = tryReadTs(primitivesDir, name);
  if (flat) return flat;
  for (const sub of PRIMITIVE_SUBDIRS) {
    const nested = tryReadTs(join(primitivesDir, sub), name);
    if (nested) return { content: flattenNestedPrimitiveImports(nested.content), ext: nested.ext };
  }
  return null;
}

/**
 * Load a single primitive by name
 */
export function loadPrimitive(name: string): RegistryItem | null {
  const primitivesDir = getPrimitivesPath();
  const loaded = readPrimitiveSource(primitivesDir, name);
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

      const siblingLoaded = readPrimitiveSource(primitivesDir, sibling);
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
    composites: listAllCompositeKeys(),
    rules: [],
    substrate: listSubstrate(),
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
 * Extract ALL relative imports from source, including nested paths.
 * `./types` -> "types", `./ops/content` -> "ops/content",
 * `./editor-history` -> "editor-history". Strips .ts/.tsx extensions.
 */
export function extractAllRelativeImports(content: string): string[] {
  const imports: string[] = [];
  const matches = content.matchAll(IMPORT_REGEX);

  for (const match of matches) {
    const pkg = match[1];
    if (pkg.startsWith('./')) {
      const name = pkg.slice(2).replace(/\.(tsx?|jsx?)$/, '');
      if (name && !imports.includes(name)) {
        imports.push(name);
      }
    }
  }

  return imports;
}

/**
 * Resolve a relative import specifier to a file on disk inside `baseDir`.
 * Tries .ts, .tsx, and /index.ts (for directory imports like `./ops`).
 * Returns the file content, resolved extension, and the canonical relative
 * path (with extension) from baseDir, or null if nothing resolves.
 */
function resolveRelativeImport(
  baseDir: string,
  specifier: string,
): { content: string; ext: string; relPath: string } | null {
  for (const ext of ['.ts', '.tsx']) {
    const filePath = join(baseDir, `${specifier}${ext}`);
    try {
      return { content: readFileSync(filePath, 'utf-8'), ext, relPath: `${specifier}${ext}` };
    } catch {
      // try next
    }
  }
  // Directory import: ./ops -> ./ops/index.ts
  const indexPath = join(baseDir, specifier, 'index.ts');
  try {
    return {
      content: readFileSync(indexPath, 'utf-8'),
      ext: '.ts',
      relPath: `${specifier}/index.ts`,
    };
  } catch {
    return null;
  }
}

/**
 * Whether an import specifier matches a known shared auxiliary suffix.
 * Shared files install flat beside the component; subsystem files nest under
 * `components/ui/<name>/`.
 */
function isSharedSuffix(specifier: string): boolean {
  return SHARED_SUFFIXES.some((suffix) => specifier.endsWith(suffix.replace(/\.ts$/, '')));
}

/**
 * Extract primitive dependencies from source
 * @param content - Source code content
 * @param isPrimitive - If true, ./foo imports are treated as sibling primitives
 */
function extractPrimitiveDependencies(content: string, isPrimitive = false): string[] {
  const deps: string[] = [];
  const substrateKinds = listSubstrateKinds();

  const matches = content.matchAll(IMPORT_REGEX);

  for (const match of matches) {
    const pkg = match[1];

    const isSiblingImport = isPrimitive && pkg.startsWith('./') && !pkg.slice(2).includes('/');
    const isPrimitiveImport =
      pkg.includes('/primitives/') ||
      pkg.includes('../primitives/') ||
      pkg.includes('../../primitives/') ||
      isSiblingImport;

    const isSubstrateImport = substrateKinds.some(
      (kind) =>
        pkg.includes(`/${kind}/`) || pkg.includes(`../${kind}/`) || pkg.includes(`../../${kind}/`),
    );

    if (isPrimitiveImport || isSubstrateImport) {
      const depName = basename(pkg, '.ts');
      if (!deps.includes(depName)) {
        deps.push(depName);
      }
    }
  }

  return deps;
}
