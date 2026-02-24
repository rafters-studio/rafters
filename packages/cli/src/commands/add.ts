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
import type { RegistryItem } from '../registry/types.js';
import { DEFAULT_EXPORTS } from '../utils/exports.js';
import { getRaftersPaths } from '../utils/paths.js';
import { error, log, setAgentMode } from '../utils/ui.js';
import { updateDependencies } from '../utils/update-dependencies.js';
import type { RaftersConfig } from './init.js';

export interface AddOptions {
  list?: boolean;
  overwrite?: boolean;
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
 * Check if an item is already tracked in the installed list
 */
export function isAlreadyInstalled(config: RaftersConfig | null, item: RegistryItem): boolean {
  if (!config?.installed) return false;
  if (item.type === 'registry:ui') {
    return config.installed.components.includes(item.name);
  }
  return config.installed.primitives.includes(item.name);
}

/**
 * Update the installed list in config with newly installed items.
 * Deduplicates and sorts alphabetically.
 */
export function trackInstalled(config: RaftersConfig, items: RegistryItem[]): void {
  if (!config.installed) {
    config.installed = { components: [], primitives: [] };
  }
  for (const item of items) {
    if (item.type === 'registry:ui') {
      if (!config.installed.components.includes(item.name)) {
        config.installed.components.push(item.name);
      }
    } else {
      if (!config.installed.primitives.includes(item.name)) {
        config.installed.primitives.push(item.name);
      }
    }
  }
  config.installed.components.sort();
  config.installed.primitives.sort();
}

/**
 * Transform registry path to project path based on config
 * e.g., "components/ui/button.tsx" -> "app/components/ui/button.tsx"
 */
function transformPath(registryPath: string, config: RaftersConfig | null): string {
  if (!config) return registryPath;

  // Transform component paths
  if (registryPath.startsWith('components/ui/')) {
    return registryPath.replace('components/ui/', `${config.componentsPath}/`);
  }

  // Transform primitive paths
  if (registryPath.startsWith('lib/primitives/')) {
    return registryPath.replace('lib/primitives/', `${config.primitivesPath}/`);
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
 * Transform component file content to update imports for the target project
 */
export function transformFileContent(content: string, config: RaftersConfig | null): string {
  let transformed = content;

  // Get paths from config or use defaults
  const componentsPath = config?.componentsPath ?? 'components/ui';
  const primitivesPath = config?.primitivesPath ?? 'lib/primitives';

  // Transform imports from ../../primitives/ to configured primitives path
  transformed = transformed.replace(
    /from\s+['"]\.\.\/\.\.\/primitives\/([^'"]+)['"]/g,
    `from '@/${primitivesPath}/$1'`,
  );

  // Transform imports from ../primitives/ to configured primitives path
  transformed = transformed.replace(
    /from\s+['"]\.\.\/primitives\/([^'"]+)['"]/g,
    `from '@/${primitivesPath}/$1'`,
  );

  // Transform relative component imports to configured components path
  transformed = transformed.replace(
    /from\s+['"]\.\/([^'"]+)['"]/g,
    `from '@/${componentsPath}/$1'`,
  );

  // Transform parent lib imports - derive lib path as parent directory of primitivesPath
  const libPath = dirname(primitivesPath);
  transformed = transformed.replace(
    /from\s+['"]\.\.\/lib\/([^'"]+)['"]/g,
    `from '@/${libPath}/$1'`,
  );

  // Transform parent hooks imports - derive hooks path from components path structure
  // e.g., 'components/ui' -> 'hooks', 'app/components/ui' -> 'app/hooks'
  const componentsMatch = componentsPath.match(/^(.*)components\/ui$/);
  const hooksPath = componentsMatch ? `${componentsMatch[1]}hooks`.replace(/^\//, '') : 'hooks';
  transformed = transformed.replace(
    /from\s+['"]\.\.\/hooks\/([^'"]+)['"]/g,
    `from '@/${hooksPath}/$1'`,
  );

  // Transform other parent imports as UI components (excluding lib/ and hooks/ already handled)
  transformed = transformed.replace(
    /from\s+['"]\.\.\/(?!lib\/|hooks\/)([^'"]+)['"]/g,
    `from '@/${componentsPath}/$1'`,
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

  for (const file of item.files) {
    // Transform the path based on project config
    const projectPath = transformPath(file.path, config);
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
    const transformedContent = transformFileContent(file.content, config);
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
export async function add(components: string[], options: AddOptions): Promise<void> {
  setAgentMode(options.agent ?? false);

  const client = new RegistryClient(options.registryUrl);

  // Handle --list option
  if (options.list) {
    const availableComponents = await client.listComponents();
    if (options.agent) {
      // Agent mode: output JSON
      log({ event: 'add:list', components: availableComponents });
    } else {
      // Human mode: formatted output
      console.log('Available components:\n');
      for (const comp of availableComponents) {
        console.log(`  ${comp.name}  ${comp.description ?? ''}`);
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

  // Resolve all components and their dependencies
  const allItems: RegistryItem[] = [];
  const seen = new Set<string>();

  for (const componentName of components) {
    try {
      const items = await client.resolveDependencies(componentName, seen);
      allItems.push(...items);
    } catch (err) {
      if (err instanceof Error) {
        error(err.message);
      } else {
        error(`Failed to fetch component "${componentName}"`);
      }
      process.exitCode = 1;
      return;
    }
  }

  // Install all resolved items
  const installed: string[] = [];
  const skipped: string[] = [];
  const installedItems: RegistryItem[] = [];

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

  // Collect and install dependencies
  const { dependencies, devDependencies } = collectDependencies(allItems);

  if (dependencies.length > 0 || devDependencies.length > 0) {
    log({
      event: 'add:dependencies',
      dependencies,
      devDependencies,
    });

    try {
      await updateDependencies(dependencies, devDependencies, { cwd });
    } catch (err) {
      log({
        event: 'add:error',
        message: 'Failed to install dependencies',
        error: err instanceof Error ? err.message : String(err),
      });
      // Don't fail the whole command - files are already written
    }
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
      cssPath: null,
      shadcn: false,
      exports: DEFAULT_EXPORTS,
      installed: { components: [], primitives: [] },
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
      message: 'Some components were skipped. Use --overwrite to replace existing files.',
      skipped,
    });
    // Fail if nothing was installed and components were skipped (already exist)
    error('Component already exists. Use --overwrite to replace.');
    process.exitCode = 1;
  }
}
