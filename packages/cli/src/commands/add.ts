/**
 * rafters add
 *
 * Adds rafters components to the project (drop-in shadcn replacements).
 * Fetches component definitions from the registry and writes to project.
 */

import { existsSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  contrastPlugin,
  invertPlugin,
  loadRegistryFromDir,
  regenerateOutputs,
  resolveContentSources,
  scalePlugin,
  statePlugin,
} from '@rafters/design-tokens';
import { RegistryClient } from '../registry/client.js';
import type { RegistryFile, RegistryItem, RegistryItemType } from '../registry/types.js';
import {
  type ComponentTarget,
  resolveComponentTarget,
  targetToExtension,
} from '../utils/detect.js';
import { DEFAULT_EXPORTS } from '../utils/exports.js';
import {
  type InstallRegistryDepsResult,
  installRegistryDependencies,
} from '../utils/install-registry-deps.js';
import { getRaftersPaths, type PathField, resolveRoot } from '../utils/paths.js';
import { buildUpdateCandidates, readInstallRoots } from '../utils/reconcile.js';
import { error, log, setAgentMode } from '../utils/ui.js';
import { migrateConfig, type RaftersConfig } from '../config/rafters-config.js';

export interface AddOptions {
  list?: boolean;
  overwrite?: boolean;
  update?: boolean;
  updateAll?: boolean;
  registryUrl?: string;
  agent?: boolean;
}

const REGISTRY_PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

/**
 * Regenerate the output artifacts after an install/update changes the installed
 * component vocabulary, so the compiled standalone sheet (the WC utility sheet)
 * reflects the new class strings. Delegates to the single regen path; failures
 * here are logged but do not fail the install (the files are already on disk).
 */
async function regenerateAfterInstall(cwd: string, config: RaftersConfig): Promise<void> {
  const paths = getRaftersPaths(cwd);
  let registry: ReturnType<typeof loadRegistryFromDir>;
  try {
    registry = loadRegistryFromDir(paths.tokens, REGISTRY_PLUGINS);
  } catch {
    // No tokens on disk yet (project not initialized) -- nothing to regenerate.
    return;
  }
  if (registry.size() === 0) return;
  try {
    await regenerateOutputs(registry, {
      outputDir: paths.output,
      exports: config.exports,
      contentSources: resolveContentSources(cwd, config),
      darkMode: config.darkMode ?? 'class',
      includeImport: config.source !== 'shadcn',
    });
  } catch (err) {
    log({
      event: 'add:regen-failed',
      message: `Output regeneration failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

/**
 * Check if .rafters/ directory exists
 */
async function isInitialized(cwd: string): Promise<boolean> {
  const paths = getRaftersPaths(cwd);
  try {
    await access(paths.root);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load rafters config from .rafters/config.rafters.json
 */
async function loadConfig(cwd: string): Promise<RaftersConfig | null> {
  const paths = getRaftersPaths(cwd);
  try {
    const content = await readFile(paths.config, 'utf-8');
    return migrateConfig(
      JSON.parse(content) as Record<string, unknown>,
    ) as unknown as RaftersConfig;
  } catch (err) {
    // Log warning if file exists but failed to parse
    if (existsSync(paths.config)) {
      const message = err instanceof Error ? err.message : String(err);
      log({
        event: 'add:warning',
        message: `Failed to load config: ${message}`,
      });
    }
    return null;
  }
}

/**
 * Registry URL precedence: CLI flag > project config (self-hosted) > built-in default.
 * Returns undefined when neither is set; RegistryClient applies the default.
 */
export function resolveRegistryUrl(
  options: AddOptions,
  config: RaftersConfig | null,
): string | undefined {
  return options.registryUrl ?? config?.registryUrl;
}

/**
 * Save config back to .rafters/config.rafters.json
 */
async function saveConfig(cwd: string, config: RaftersConfig): Promise<void> {
  const paths = getRaftersPaths(cwd);
  await writeFile(paths.config, JSON.stringify(config, null, 2));
}

/**
 * Get every tracked item name from config -- components, primitives,
 * composites, rules, and substrate. Returns a combined, deduplicated list.
 *
 * All five buckets count: anything omitted here is a name `--update-all` would
 * never refresh, which is the same class of silent staleness this command
 * exists to prevent.
 */
export function getInstalledNames(config: RaftersConfig | null): string[] {
  if (!config?.installed) return [];
  const names = new Set([
    ...config.installed.components,
    ...config.installed.primitives,
    ...(config.installed.composites ?? []),
    ...(config.installed.rules ?? []),
    ...(config.installed.substrate ?? []),
  ]);
  return [...names].sort();
}

/**
 * Names present on disk that the config never tracked. Asks the registry index
 * what exists, then asks the disk which of those names are there. A registry
 * that cannot be reached degrades to "no discoveries" with a warning rather
 * than aborting the update.
 */
async function discoverUntrackedNames(
  cwd: string,
  config: RaftersConfig | null,
  client: RegistryClient,
  tracked: string[],
): Promise<string[]> {
  let index: Awaited<ReturnType<RegistryClient['fetchIndex']>> | null = null;
  try {
    index = await client.fetchIndex();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({
      event: 'add:warning',
      message: `Could not read the registry index to reconcile on-disk components (${message}). Updating tracked components only.`,
    });
  }
  const { untracked } = buildUpdateCandidates(tracked, index, readInstallRoots(cwd, config));
  return untracked;
}

/**
 * Resolve the component target from config, falling back to framework detection.
 */
function getComponentTarget(config: RaftersConfig | null): ComponentTarget {
  return resolveComponentTarget(config);
}

/**
 * Shared file extensions that should always be included regardless of framework target.
 * These are auxiliary files (class maps, types, constants) used by framework-specific components.
 */
const SHARED_EXTENSIONS = new Set(['.behavior.ts', '.classes.ts']);

/**
 * Check if a file path is a shared auxiliary file.
 */
function isSharedFile(path: string): boolean {
  for (const ext of SHARED_EXTENSIONS) {
    if (path.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Targets where falling back to .tsx is reasonable -- the framework can render
 * React components (Astro with @astrojs/react, future Vue/Svelte wrappers).
 * WC projects cannot use React components, so a missing .element.ts must error,
 * not silently install unusable .tsx files.
 */
const REACT_FALLBACK_TARGETS = new Set<ComponentTarget>(['astro', 'vue', 'svelte']);

/**
 * Select files matching the target framework from a registry item's file list.
 * Keeps shared auxiliary files (.classes.ts etc.) regardless of target.
 * Falls back to .tsx only for targets that can render React components.
 *
 * Returns { files, fallback } where fallback is true if .tsx was used as fallback.
 */
export function selectFilesForFramework(
  files: RegistryFile[],
  target: ComponentTarget,
): { files: RegistryFile[]; fallback: boolean } {
  const preferredExt = targetToExtension(target);

  // Always include shared files
  const shared = files.filter((f) => isSharedFile(f.path));

  // Find files matching the preferred extension
  const matched = files.filter((f) => f.path.endsWith(preferredExt));

  if (matched.length > 0) {
    return { files: [...matched, ...shared], fallback: false };
  }

  // Fallback: use .tsx files only for targets that can render React components.
  // WC projects cannot use React components -- return only shared files so the
  // caller can detect the missing component and error.
  if (REACT_FALLBACK_TARGETS.has(target)) {
    const fallbackFiles = files.filter((f) => f.path.endsWith('.tsx'));
    if (fallbackFiles.length > 0) {
      return { files: [...fallbackFiles, ...shared], fallback: true };
    }
  }

  // Target has no matching files and no React fallback -- return only shared
  // files. For targets like `wc`, this signals the component is unavailable.
  if (target !== 'react' && !REACT_FALLBACK_TARGETS.has(target)) {
    return { files: shared, fallback: false };
  }

  // React target or react-fallback target with no .tsx either -- return everything
  return { files, fallback: false };
}

/**
 * Composite runtime files whose installation is gated on the component target.
 * The Astro render engine (`Composite.astro`) is meaningless outside an Astro
 * project, so it installs only when the target is `astro`. Every other runtime
 * file is framework-agnostic and always installs.
 */
const TARGET_GATED_COMPOSITE_FILES: ReadonlyArray<{
  suffix: string;
  target: ComponentTarget;
}> = [{ suffix: 'Composite.astro', target: 'astro' }];

/**
 * Filter a composite item's runtime files by the project's component target.
 * Drops target-gated files (e.g. `Composite.astro`) whose target does not
 * match; leaves all other files untouched. Pure -- no I/O.
 */
export function selectCompositeFiles(
  files: RegistryFile[],
  target: ComponentTarget,
): RegistryFile[] {
  return files.filter((file) => {
    const gate = TARGET_GATED_COMPOSITE_FILES.find((g) => file.path.endsWith(g.suffix));
    return gate ? gate.target === target : true;
  });
}

/**
 * Known folder names that can be used as the first argument to `rafters add`.
 * When detected, the CLI routes fetches to the matching registry endpoint.
 */
const FOLDER_NAMES = new Set(['composites']);

/**
 * Check if an item is already tracked in the installed list
 */
export function isAlreadyInstalled(config: RaftersConfig | null, item: RegistryItem): boolean {
  if (!config?.installed) return false;
  const { components, primitives, composites, rules, substrate } = config.installed;
  const bucketByType: Record<RegistryItemType, string[]> = {
    ui: components,
    primitive: primitives,
    composite: composites ?? [],
    rule: rules ?? [],
    substrate: substrate ?? [],
  };
  return bucketByType[item.type].includes(item.name);
}

/**
 * Verify an item the config claims is installed actually has at least one
 * expected file on disk. Guards against config-disk drift (config tracks the
 * item but a previous install failed mid-way, files were deleted, or a branch
 * checkout removed them). When the config lies, callers should treat the item
 * as not installed and re-run the install.
 */
export function isInstalledOnDisk(
  config: RaftersConfig | null,
  item: RegistryItem,
  cwd: string,
): boolean {
  if (!isAlreadyInstalled(config, item)) return false;

  const filesToCheck =
    item.type === 'ui'
      ? selectFilesForFramework(item.files, getComponentTarget(config)).files
      : item.files;

  for (const file of filesToCheck) {
    if (fileExists(cwd, transformPath(file.path, config, cwd))) return true;
  }
  return false;
}

/**
 * Update the installed list in config with newly installed items.
 * Deduplicates and sorts alphabetically.
 */
export function trackInstalled(config: RaftersConfig, items: RegistryItem[]): void {
  if (!config.installed) {
    config.installed = {
      components: [],
      primitives: [],
      composites: [],
      rules: [],
    };
  }
  const installed = config.installed;
  if (!installed.composites) installed.composites = [];
  if (!installed.rules) installed.rules = [];
  if (!installed.substrate) installed.substrate = [];
  const bucketByType: Record<RegistryItemType, string[]> = {
    ui: installed.components,
    primitive: installed.primitives,
    composite: installed.composites,
    rule: installed.rules,
    substrate: installed.substrate,
  };
  for (const item of items) {
    const bucket = bucketByType[item.type];
    if (!bucket.includes(item.name)) bucket.push(item.name);
  }
  installed.components.sort();
  installed.primitives.sort();
  installed.composites.sort();
  installed.rules.sort();
  installed.substrate.sort();
}

/**
 * Resolve the install root for a config path field. Path fields accept a
 * single string or an array of entries; this returns the relative folder
 * `rafters add` should write into. See {@link resolveRoot} for precedence.
 */
function rootFor(field: PathField | undefined, cwd: string, fallback: string): string {
  return field === undefined ? fallback : resolveRoot(field, cwd, fallback);
}

/**
 * Transform registry path to project path based on config
 * e.g., "components/ui/button.tsx" -> "app/components/ui/button.tsx"
 */
export function transformPath(
  registryPath: string,
  config: RaftersConfig | null,
  cwd: string = process.cwd(),
): string {
  if (!config) return registryPath;

  const replacements: Array<[string, PathField, string]> = [
    ['components/ui/', config.componentsPath, 'components/ui'],
    ['lib/primitives/', config.primitivesPath, 'lib/primitives'],
    ['composites/', config.compositesPath, 'composites'],
    ['rules/', config.rulesPath, 'lib/rules'],
  ];
  for (const [prefix, field, fallback] of replacements) {
    if (registryPath.startsWith(prefix)) {
      return registryPath.replace(prefix, `${rootFor(field, cwd, fallback)}/`);
    }
  }
  return registryPath;
}

/**
 * Substrate installs to `<sourceRoot>/<kind>/<name>` -- the kind is the first
 * path segment of the served path, and the source root is derived from
 * componentsPath (`src/components/ui` -> `src`). Keeps substrate alongside the
 * `@/<kind>` imports the transform emits, for any discovered kind.
 */
export function substrateProjectPath(
  registryPath: string,
  config: RaftersConfig | null,
  cwd: string = process.cwd(),
): string {
  const componentsResolved = rootFor(config?.componentsPath, cwd, 'components/ui');
  const sourceRoot = componentsResolved.replace(/\/?components\/ui$/, '');
  return sourceRoot ? join(sourceRoot, registryPath) : registryPath;
}

/**
 * Check if a file already exists at the target path
 */
function fileExists(cwd: string, relativePath: string): boolean {
  return existsSync(join(cwd, relativePath));
}

/**
 * Transform component file content to update imports for the target project.
 *
 * @param content     - Raw source text from the registry file
 * @param config      - Project rafters config (path mappings)
 * @param fileType    - component | primitive | substrate. Controls where bare
 *                      `./foo` sibling imports resolve.
 * @param cwd         - Project root.
 * @param opts.substrateKinds - The substrate dir names in play (lib, hooks, ...),
 *                      discovered from the resolved items -- never hardcoded.
 *                      Parent imports into these (`../lib/x`) rewrite to `@/<kind>`;
 *                      any other `../<x>/y` is a sibling component. Components AND
 *                      substrate files both import substrate this way.
 * @param opts.installPath - The file's install path; for a substrate file its
 *                      own dir resolves its `./sibling` imports.
 */
export function transformFileContent(
  content: string,
  config: RaftersConfig | null,
  fileType: 'component' | 'primitive' | 'substrate' = 'component',
  cwd: string = process.cwd(),
  opts: { substrateKinds?: string[]; installPath?: string } = {},
): string {
  const { substrateKinds = [], installPath } = opts;
  let transformed = content;

  // Get paths from config or use defaults
  const componentsPath = rootFor(config?.componentsPath, cwd, 'components/ui');
  const primitivesPath = rootFor(config?.primitivesPath, cwd, 'lib/primitives');

  // Strip source root prefix (src/, app/) for @/ alias imports.
  // Config paths are filesystem paths (src/components/ui) but @/ alias
  // already maps to the source root, so @/src/... doubles the prefix.
  const stripSourceRoot = (p: string): string => p.replace(/^(src|app)\//, '');

  // All @/ alias paths use stripSourceRoot to avoid double-prefixing
  const aliasComponents = stripSourceRoot(componentsPath);
  const aliasPrimitives = stripSourceRoot(primitivesPath);

  // Transform imports from ../../primitives/ to configured primitives path
  transformed = transformed.replace(
    /from\s+['"]\.\.\/\.\.\/primitives\/([^'"]+)['"]/g,
    `from '@/${aliasPrimitives}/$1'`,
  );

  // Transform imports from ../primitives/ to configured primitives path
  transformed = transformed.replace(
    /from\s+['"]\.\.\/primitives\/([^'"]+)['"]/g,
    `from '@/${aliasPrimitives}/$1'`,
  );

  // Sibling imports (./foo) resolve to the dir THIS file installs into:
  // primitives -> primitivesPath, a substrate file -> its OWN install dir (from
  // its path, e.g. lib/contract.ts -> @/lib), else componentsPath.
  const substrateOwnDir =
    fileType === 'substrate' && installPath ? stripSourceRoot(dirname(installPath)) : null;
  const aliasSibling =
    fileType === 'primitive' ? aliasPrimitives : (substrateOwnDir ?? aliasComponents);
  transformed = transformed.replace(/from\s+['"]\.\/([^'"]+)['"]/g, `from '@/${aliasSibling}/$1'`);

  // Parent imports into a substrate kind dir (`../lib/x`, `../../hooks/y`, ...).
  // The kind name in the import equals its install dir, so the rewrite is
  // `@/<kind>/<rest>`. Kinds are DATA discovered from the served items, never
  // hardcoded -- a new substrate dir needs no rule change. Runs for every file
  // type because components import substrate this way too. Must precede the
  // component fallback so substrate parents are not mistaken for components.
  if (substrateKinds.length > 0) {
    const kindAlternation = substrateKinds.join('|');
    transformed = transformed.replace(
      new RegExp(`from\\s+['"](?:\\.\\./){1,2}(${kindAlternation})/([^'"]+)['"]`, 'g'),
      "from '@/$1/$2'",
    );
  }

  // Cross-component sibling: ../name/name.suffix -> @/components/ui/name.suffix
  // Source layout is nested (grid/grid.classes.ts); consumer layout is flat
  // (grid.classes.ts next to grid.tsx). Collapse the repeated dir prefix.
  transformed = transformed.replace(
    /from\s+['"]\.\.\/([^/'"]+)\/\1([^'"]*)['"]/g,
    `from '@/${aliasComponents}/$1$2'`,
  );

  // Any remaining parent import is a sibling component -> componentsPath.
  transformed = transformed.replace(
    /from\s+['"]\.\.\/([^'"]+)['"]/g,
    `from '@/${aliasComponents}/$1'`,
  );

  return transformed;
}

/**
 * Install a single registry item to the project
 */
async function installItem(
  cwd: string,
  item: RegistryItem,
  options: AddOptions,
  config: RaftersConfig | null,
  substrateKinds: string[] = [],
): Promise<{ installed: boolean; skipped: boolean; files: string[] }> {
  const installedFiles: string[] = [];
  let skipped = false;

  // Filter files by framework target.
  //   - UI components: pick the framework-matching file (with .tsx fallback).
  //   - Composites: keep all runtime files except target-gated ones (e.g.
  //     Composite.astro installs only for the astro target).
  //   - Primitives: install everything.
  let filesToInstall = item.files;
  if (item.type === 'ui') {
    const target = getComponentTarget(config);
    const selection = selectFilesForFramework(item.files, target);
    filesToInstall = selection.files;

    if (selection.fallback) {
      log({
        event: 'add:fallback',
        component: item.name,
        target,
        message: `No ${targetToExtension(target)} version available for ${item.name}. Installing React version.`,
      });
    }

    // No framework-specific files and no fallback -- the component doesn't
    // support this target. Error instead of installing unrelated files.
    const hasComponentFile = selection.files.some((f) => !isSharedFile(f.path));
    if (!hasComponentFile) {
      throw new Error(
        `No ${targetToExtension(target)} version available for "${item.name}" and no compatible fallback exists.`,
      );
    }
  } else if (item.type === 'composite') {
    filesToInstall = selectCompositeFiles(item.files, getComponentTarget(config));
  }

  for (const file of filesToInstall) {
    // Transform the path based on project config. Substrate carries its kind in
    // the path (`<kind>/<name>.ts`) and installs under the source root.
    const projectPath =
      item.type === 'substrate'
        ? substrateProjectPath(file.path, config, cwd)
        : transformPath(file.path, config, cwd);
    const targetPath = join(cwd, projectPath);

    // Check if file exists and handle overwrite
    if (fileExists(cwd, projectPath)) {
      if (!options.overwrite) {
        log({
          event: 'add:skip',
          component: item.name,
          file: projectPath,
          reason: 'exists',
        });
        skipped = true;
        continue;
      }
    }

    // Ensure directory exists
    await mkdir(dirname(targetPath), { recursive: true });

    // Transform and write the file. Substrate resolves its own `./siblings`
    // within its own install dir, so pass its path; parent imports into other
    // substrate kinds use the discovered kind list.
    const fileType =
      item.type === 'primitive'
        ? 'primitive'
        : item.type === 'substrate'
          ? 'substrate'
          : 'component';
    const transformedContent = transformFileContent(file.content, config, fileType, cwd, {
      substrateKinds,
      installPath: file.path,
    });
    await writeFile(targetPath, transformedContent, 'utf-8');

    installedFiles.push(projectPath);
  }

  return {
    installed: installedFiles.length > 0,
    skipped,
    files: installedFiles,
  };
}

/**
 * Collect npm dependencies from registry items
 * Dependencies are now per-file in the new schema with versions (e.g., react@19.2.0)
 */
export function collectDependencies(items: RegistryItem[]): {
  dependencies: string[];
  devDependencies: string[];
} {
  const deps = new Set<string>();
  const devDeps = new Set<string>();

  for (const item of items) {
    // Dependencies are now on each file with versions
    for (const file of item.files) {
      for (const dep of file.dependencies) {
        deps.add(dep);
      }
      for (const dep of file.devDependencies ?? []) {
        devDeps.add(dep);
      }
    }
  }

  return {
    dependencies: [...deps].sort(),
    devDependencies: [...devDeps].sort(),
  };
}

/**
 * Fetch a component from the registry
 */
export async function fetchComponent(name: string, registryUrl?: string): Promise<RegistryItem> {
  const client = new RegistryClient(registryUrl);
  return client.fetchComponent(name);
}

/**
 * Install a component to a target directory
 */
export async function installComponent(
  component: RegistryItem,
  targetDir: string,
  options: AddOptions = {},
): Promise<void> {
  const config = await loadConfig(targetDir);
  const result = await installItem(targetDir, component, options, config);

  if (result.installed) {
    log({
      event: 'add:installed',
      component: component.name,
      files: result.files,
    });
  }

  if (result.skipped && !options.overwrite) {
    throw new Error(`Component "${component.name}" already exists. Use --overwrite to replace.`);
  }
}

/**
 * Add one or more components to the project
 */
export async function add(componentArgs: string[], options: AddOptions): Promise<void> {
  setAgentMode(options.agent ?? false);

  let components = componentArgs;
  const cwd = process.cwd();
  // Registry URL resolves: CLI flag > project config (self-hosted / internal registry) > default.
  const config = await loadConfig(cwd);
  const client = new RegistryClient(resolveRegistryUrl(options, config));

  // Detect folder name as first argument (e.g., `rafters add composites hero-banner`)
  let folder: string | undefined;
  const firstArg = components[0];
  if (firstArg && FOLDER_NAMES.has(firstArg)) {
    folder = firstArg;
    components = components.slice(1);
  }

  // Handle --list option
  if (options.list) {
    const availableComponents = await client.listComponents();
    const availableComposites = await client.listComposites();
    if (options.agent) {
      log({
        event: 'add:list',
        components: availableComponents,
        composites: availableComposites,
      });
    } else {
      console.log('Available components:\n');
      for (const comp of availableComponents) {
        console.log(`  ${comp.name}  ${comp.description ?? ''}`);
      }
      if (availableComposites.length > 0) {
        console.log('\nAvailable composites:\n');
        for (const comp of availableComposites) {
          console.log(`  ${comp.name}  ${comp.description ?? ''}`);
        }
      }
    }
    return;
  }

  // Validate that .rafters/ exists
  const initialized = await isInitialized(cwd);
  if (!initialized) {
    error('Project not initialized. Run `rafters init` first.');
    process.exitCode = 1;
    return;
  }

  // --update is a clearer alias for --overwrite
  if (options.update) {
    options.overwrite = true;
  }

  // --update-all: re-fetch everything this project has, whether the config
  // knows about it or not. The candidate set is the union of the tracked names
  // and the names reconciliation finds on disk; each one is then resolved
  // through resolveDependencies, so a parent re-walks its dependency closure
  // and re-tracks any dependency the config had lost.
  let untrackedNames: string[] = [];
  if (options.updateAll) {
    options.overwrite = true;

    if (!config) {
      error("No rafters config found. Run 'rafters init' first.");
      process.exitCode = 1;
      return;
    }

    const trackedNames = getInstalledNames(config);
    untrackedNames = await discoverUntrackedNames(cwd, config, client, trackedNames);
    const candidates = [...new Set([...trackedNames, ...untrackedNames])].sort();

    if (candidates.length === 0) {
      error("No installed components found. Use 'rafters add <component>' to install first.");
      process.exitCode = 1;
      return;
    }

    if (untrackedNames.length > 0) {
      log({
        event: 'add:untracked',
        components: untrackedNames,
        message: `Found ${untrackedNames.length} component(s) on disk the config never tracked: ${untrackedNames.join(', ')}. Refreshing and tracking them.`,
      });
    }

    // Replace CLI args with the reconciled candidate set
    components = candidates;
  }

  // `rafters add composites` with no names installs the composites runtime
  if (folder === 'composites' && components.length === 0) {
    components = ['composites'];
  }

  // Validate that at least one component is specified
  if (components.length === 0) {
    error('No components specified. Usage: rafters add <component...>');
    process.exitCode = 1;
    return;
  }

  log({
    event: 'add:start',
    cwd,
    components,
    overwrite: options.overwrite ?? false,
  });

  // Resolve all items and their dependencies
  const allItems: RegistryItem[] = [];
  const seen = new Set<string>();

  for (const itemName of components) {
    try {
      if (folder === 'composites') {
        if (!seen.has(itemName)) {
          const composite = await client.fetchComposite(itemName);
          seen.add(itemName);
          allItems.push(composite);
          for (const dep of composite.primitives) {
            if (!seen.has(dep)) {
              const depItems = await client.resolveDependencies(dep, seen);
              allItems.push(...depItems);
            }
          }
        }
      } else {
        const items = await client.resolveDependencies(itemName, seen);
        allItems.push(...items);
      }
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error(`Failed to fetch "${itemName}"`);
      }
      process.exitCode = 1;
      return;
    }
  }

  // Substrate kinds in play, derived from the resolved items' OWN paths (data,
  // not a hardcoded list) so a parent import like `../lib/x` in a component or
  // substrate file rewrites to the right dir. A new substrate dir just appears.
  const substrateKinds = [
    ...new Set(
      allItems
        .filter((item) => item.type === 'substrate')
        .map((item) => item.files[0]?.path.split('/')[0])
        .filter((segment): segment is string => Boolean(segment)),
    ),
  ];

  // Install all resolved items, tracking framework-filtered versions for dep
  // collection. The three outcome lists are kept apart so the summary can say
  // what actually happened per item instead of a blanket count.
  const written: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  const installedItems: RegistryItem[] = [];
  const filteredItems: RegistryItem[] = [];
  const target = getComponentTarget(config);

  for (const item of allItems) {
    // Skip items already tracked in config AND present on disk (unless --overwrite).
    // If config tracks the item but the files are missing, fall through and re-install
    // -- this recovers from partial installs, manual file deletes, or branch checkouts
    // that left the config and disk out of sync.
    if (!options.overwrite && isAlreadyInstalled(config, item)) {
      if (isInstalledOnDisk(config, item, cwd)) {
        log({
          event: 'add:skip',
          component: item.name,
          reason: 'already installed',
        });
        skipped.push(item.name);
        continue;
      }
      log({
        event: 'add:warning',
        component: item.name,
        message: 'Config tracks this as installed but no files found on disk -- reinstalling.',
      });
    }

    try {
      const result = await installItem(cwd, item, options, config, substrateKinds);

      if (result.installed) {
        written.push(item.name);
        installedItems.push(item);

        // Create a filtered copy with only the framework-selected files
        // so dependency collection doesn't pull in deps from other frameworks
        if (item.type === 'ui') {
          const selection = selectFilesForFramework(item.files, target);
          filteredItems.push({ ...item, files: selection.files });
        } else {
          filteredItems.push(item);
        }

        log({
          event: 'add:installed',
          component: item.name,
          type: item.type,
          files: result.files,
        });
      }

      if (result.skipped && !result.installed) {
        skipped.push(item.name);
        // The files are already on disk but the config did not track this
        // item -- reaching here means the "tracked in config AND present on
        // disk" skip guard above (isAlreadyInstalled + isInstalledOnDisk)
        // did not fire, so the install list is out of sync with reality
        // (a pre-tracking install, a hand-copied file, or a config reset).
        // Record it so `installed` reflects what is actually present; this
        // is what lets a stale project be backfilled by re-running `add`.
        installedItems.push(item);
      }
    } catch (err) {
      // Warn but continue on peer component failures. The name is recorded so
      // the summary reports the failure instead of quietly dropping it.
      failed.push(item.name);
      if (err instanceof Error) {
        log({
          event: 'add:warning',
          component: item.name,
          message: err.message,
        });
      }
    }
  }

  // Collect, filter, and install dependencies from framework-filtered files only
  const emptyDeps: InstallRegistryDepsResult = {
    installed: [],
    skipped: [],
    devInstalled: [],
    failed: [],
  };
  let depsResult = emptyDeps;
  try {
    depsResult = await installRegistryDependencies(filteredItems, cwd, {
      target,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({
      event: 'add:deps:install-failed',
      message: `Failed to process dependencies: ${message}`,
      dependencies: [],
      suggestion: 'Check package.json and try installing dependencies manually.',
    });
  }

  if (depsResult.installed.length > 0 || depsResult.skipped.length > 0) {
    log({
      event: 'add:dependencies',
      dependencies: depsResult.installed,
      devDependencies: depsResult.devInstalled,
      skipped: depsResult.skipped,
    });
  }

  // Update config with installed items, then regenerate outputs so the new
  // (or removed-on-update) component vocabulary reaches the compiled sheet.
  if (installedItems.length > 0 && config) {
    trackInstalled(config, installedItems);
    await saveConfig(cwd, config);
    await regenerateAfterInstall(cwd, config);
  } else if (installedItems.length > 0 && !config) {
    // No config file yet -- create minimal installed tracking
    const newConfig: RaftersConfig = {
      framework: 'unknown' as RaftersConfig['framework'],
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      rulesPath: 'lib/rules',
      cssPath: null,
      intent: 'efficient',
      fonts: { path: null, imports: [] },
      exports: DEFAULT_EXPORTS,
      installed: { components: [], primitives: [], composites: [], rules: [] },
    };
    trackInstalled(newConfig, installedItems);
    await saveConfig(cwd, newConfig);
    await regenerateAfterInstall(cwd, newConfig);
  }

  // Summary. Written, skipped, untracked and failed are reported separately:
  // a single "Added N components" over a mixed-state tree is what let a stale
  // install look like a successful one.
  log({
    event: 'add:complete',
    written: written.length,
    skipped: skipped.length,
    untracked: untrackedNames.length,
    failed: failed.length,
    components: written,
    skippedComponents: skipped,
    untrackedComponents: untrackedNames,
    failedComponents: failed,
  });

  // An item that could not be installed is a failed run, not a partial success.
  // Exiting 0 here is what lets a scripted install (CI, a postinstall step, an
  // agent shelling out) treat a half-written tree as done. `add` is only called
  // from the CLI entry point, so nothing long-lived is poisoned by this.
  if (failed.length > 0) {
    process.exitCode = 1;
  }

  // Under --update-all every file is overwritten, so a skip is never the
  // "already exists, use --update" case -- telling the user to re-run with
  // --update would be a fresh lie.
  if (!options.updateAll && skipped.length > 0 && written.length === 0) {
    log({
      event: 'add:hint',
      message:
        'Some components were skipped. Use --update to re-fetch, or --update-all to refresh everything.',
      skipped,
    });
    // Fail if nothing was installed and components were skipped (already exist)
    error('Component already exists. Use --update to re-fetch from registry.');
    process.exitCode = 1;
  }
}
