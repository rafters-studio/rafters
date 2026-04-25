/**
 * rafters add
 *
 * Adds rafters components to the project (drop-in shadcn replacements).
 * Fetches component definitions from the registry and writes to project.
 */

import { existsSync } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RegistryClient } from '../registry/client.js';
import type { RegistryFile, RegistryItem } from '../registry/types.js';
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
import { error, log, setAgentMode } from '../utils/ui.js';
import type { RaftersConfig } from './init.js';

export interface AddOptions {
  list?: boolean;
  overwrite?: boolean;
  update?: boolean;
  updateAll?: boolean;
  registryUrl?: string;
  agent?: boolean;
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
    return JSON.parse(content) as RaftersConfig;
  } catch (err) {
    // Log warning if file exists but failed to parse
    if (existsSync(paths.config)) {
      const message = err instanceof Error ? err.message : String(err);
      log({ event: 'add:warning', message: `Failed to load config: ${message}` });
    }
    return null;
  }
}

/**
 * Save config back to .rafters/config.rafters.json
 */
async function saveConfig(cwd: string, config: RaftersConfig): Promise<void> {
  const paths = getRaftersPaths(cwd);
  await writeFile(paths.config, JSON.stringify(config, null, 2));
}

/**
 * Get all installed component, primitive, and composite names from config.
 * Returns a combined, deduplicated list.
 */
export function getInstalledNames(config: RaftersConfig | null): string[] {
  if (!config?.installed) return [];
  const names = new Set([
    ...config.installed.components,
    ...config.installed.primitives,
    ...(config.installed.composites ?? []),
  ]);
  return [...names].sort();
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
const SHARED_EXTENSIONS = new Set(['.classes.ts', '.types.ts', '.constants.ts']);

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
 * Select files matching the target framework from a registry item's file list.
 * Keeps shared auxiliary files (.classes.ts etc.) regardless of target.
 * Falls back to .tsx if no framework-matching files exist.
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

  // Fallback: use .tsx files (React is the universal fallback)
  if (target !== 'react') {
    const fallbackFiles = files.filter((f) => f.path.endsWith('.tsx'));
    if (fallbackFiles.length > 0) {
      return { files: [...fallbackFiles, ...shared], fallback: true };
    }
  }

  // No files matched at all -- return everything
  return { files, fallback: false };
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
  if (item.type === 'ui') {
    return config.installed.components.includes(item.name);
  }
  if (item.type === 'composite') {
    return (config.installed.composites ?? []).includes(item.name);
  }
  return config.installed.primitives.includes(item.name);
}

/**
 * Update the installed list in config with newly installed items.
 * Deduplicates and sorts alphabetically.
 */
export function trackInstalled(config: RaftersConfig, items: RegistryItem[]): void {
  if (!config.installed) {
    config.installed = { components: [], primitives: [], composites: [], rules: [] };
  }
  const installed = config.installed;
  if (!installed.composites) installed.composites = [];
  if (!installed.rules) installed.rules = [];
  for (const item of items) {
    const bucket =
      item.type === 'ui'
        ? installed.components
        : item.type === 'composite'
          ? installed.composites
          : installed.primitives;
    if (!bucket.includes(item.name)) bucket.push(item.name);
  }
  installed.components.sort();
  installed.primitives.sort();
  installed.composites.sort();
  installed.rules.sort();
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
function transformPath(registryPath: string, config: RaftersConfig | null, cwd: string): string {
  if (!config) return registryPath;

  const replacements: Array<[string, PathField, string]> = [
    ['components/ui/', config.componentsPath, 'components/ui'],
    ['lib/primitives/', config.primitivesPath, 'lib/primitives'],
    ['composites/', config.compositesPath, 'composites'],
    ['rules/', config.rulesPath, 'rules'],
  ];
  for (const [prefix, field, fallback] of replacements) {
    if (registryPath.startsWith(prefix)) {
      return registryPath.replace(prefix, `${rootFor(field, cwd, fallback)}/`);
    }
  }
  return registryPath;
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
 * @param fileType    - Whether this file is a component or a primitive.
 *                      Controls where bare `./foo` sibling imports resolve:
 *                      components -> componentsPath, primitives -> primitivesPath.
 */
export function transformFileContent(
  content: string,
  config: RaftersConfig | null,
  fileType: 'component' | 'primitive' = 'component',
  cwd: string = process.cwd(),
): string {
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

  // Transform relative sibling imports (./foo) based on file type:
  // - component files -> componentsPath (siblings are other components)
  // - primitive files -> primitivesPath (siblings are other primitives)
  const aliasSibling = fileType === 'primitive' ? aliasPrimitives : aliasComponents;
  transformed = transformed.replace(/from\s+['"]\.\/([^'"]+)['"]/g, `from '@/${aliasSibling}/$1'`);

  // Transform parent lib imports - derive lib path as parent directory of primitivesPath
  const aliasLib = stripSourceRoot(dirname(primitivesPath));
  transformed = transformed.replace(
    /from\s+['"]\.\.\/lib\/([^'"]+)['"]/g,
    `from '@/${aliasLib}/$1'`,
  );

  // Transform parent hooks imports - derive hooks path from components path structure
  const componentsMatch = aliasComponents.match(/^(.*)components\/ui$/);
  const aliasHooks = componentsMatch ? `${componentsMatch[1]}hooks`.replace(/^\//, '') : 'hooks';
  transformed = transformed.replace(
    /from\s+['"]\.\.\/hooks\/([^'"]+)['"]/g,
    `from '@/${aliasHooks}/$1'`,
  );

  // Transform other parent imports as UI components (excluding lib/ and hooks/ already handled)
  transformed = transformed.replace(
    /from\s+['"]\.\.\/(?!lib\/|hooks\/)([^'"]+)['"]/g,
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
): Promise<{ installed: boolean; skipped: boolean; files: string[] }> {
  const installedFiles: string[] = [];
  let skipped = false;

  // Filter files by framework target (only for UI components, not primitives/composites)
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
  }

  for (const file of filesToInstall) {
    // Transform the path based on project config
    const projectPath = transformPath(file.path, config, cwd);
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

    // Transform and write the file
    const fileType = item.type === 'primitive' ? 'primitive' : 'component';
    const transformedContent = transformFileContent(file.content, config, fileType, cwd);
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
  const client = new RegistryClient(options.registryUrl);

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

  const cwd = process.cwd();

  // Validate that .rafters/ exists
  const initialized = await isInitialized(cwd);
  if (!initialized) {
    error('Project not initialized. Run `rafters init` first.');
    process.exitCode = 1;
    return;
  }

  // Load project config for path mappings
  const config = await loadConfig(cwd);

  // --update is a clearer alias for --overwrite
  if (options.update) {
    options.overwrite = true;
  }

  // --update-all: re-fetch all installed components (takes precedence over --update)
  if (options.updateAll) {
    options.overwrite = true;

    if (!config) {
      error("No rafters config found. Run 'rafters init' first.");
      process.exitCode = 1;
      return;
    }

    const installedNames = getInstalledNames(config);
    if (installedNames.length === 0) {
      error("No installed components found. Use 'rafters add <component>' to install first.");
      process.exitCode = 1;
      return;
    }

    // Replace CLI args with installed list
    components = installedNames;
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
        // Fetch directly from composites endpoint
        if (!seen.has(itemName)) {
          const item = await client.fetchComposite(itemName);
          seen.add(itemName);
          allItems.push(item);
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

  // Install all resolved items, tracking framework-filtered versions for dep collection
  const installed: string[] = [];
  const skipped: string[] = [];
  const installedItems: RegistryItem[] = [];
  const filteredItems: RegistryItem[] = [];
  const target = getComponentTarget(config);

  for (const item of allItems) {
    // Skip items already tracked in config (unless --overwrite)
    if (!options.overwrite && isAlreadyInstalled(config, item)) {
      log({
        event: 'add:skip',
        component: item.name,
        reason: 'already installed',
      });
      skipped.push(item.name);
      continue;
    }

    try {
      const result = await installItem(cwd, item, options, config);

      if (result.installed) {
        installed.push(item.name);
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
      }
    } catch (err) {
      // Warn but continue on peer component failures
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
    depsResult = await installRegistryDependencies(filteredItems, cwd);
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

  // Update config with installed items
  if (installedItems.length > 0 && config) {
    trackInstalled(config, installedItems);
    await saveConfig(cwd, config);
  } else if (installedItems.length > 0 && !config) {
    // No config file yet -- create minimal installed tracking
    const newConfig: RaftersConfig = {
      framework: 'unknown' as RaftersConfig['framework'],
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      rulesPath: 'rules',
      cssPath: null,
      shadcn: false,
      exports: DEFAULT_EXPORTS,
      installed: { components: [], primitives: [], composites: [], rules: [] },
    };
    trackInstalled(newConfig, installedItems);
    await saveConfig(cwd, newConfig);
  }

  // Summary
  log({
    event: 'add:complete',
    installed: installed.length,
    skipped: skipped.length,
    components: installed,
  });

  if (skipped.length > 0 && installed.length === 0) {
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
