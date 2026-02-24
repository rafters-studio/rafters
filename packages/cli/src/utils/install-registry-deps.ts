/**
 * Registry Dependency Installation
 *
 * Collects dependencies from registry items, filters out internal
 * and already-installed packages, then installs via the consumer's
 * package manager.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RegistryItem } from '../registry/types.js';
import { log } from './ui.js';
import { updateDependencies } from './update-dependencies.js';

export interface InstallRegistryDepsOptions {
  /** Suppress spinner and install output */
  silent?: boolean;
  /** Log what would be installed without actually installing */
  dryRun?: boolean;
}

export interface InstallRegistryDepsResult {
  /** Dependencies that were installed */
  installed: string[];
  /** Dependencies that were skipped (already installed or internal) */
  skipped: string[];
  /** Dev dependencies that were installed */
  devInstalled: string[];
}

/**
 * Parse a versioned dependency string into name and version.
 * e.g., "@radix-ui/react-dialog@2.1.0" -> { name: "@radix-ui/react-dialog", version: "2.1.0" }
 * e.g., "lodash@4.17.21" -> { name: "lodash", version: "4.17.21" }
 * e.g., "lodash" -> { name: "lodash", version: undefined }
 */
export function parseDependency(dep: string): { name: string; version: string | undefined } {
  // Handle scoped packages: @scope/name@version
  if (dep.startsWith('@')) {
    const slashIndex = dep.indexOf('/');
    if (slashIndex === -1) {
      return { name: dep, version: undefined };
    }
    const afterSlash = dep.slice(slashIndex + 1);
    const atIndex = afterSlash.indexOf('@');
    if (atIndex === -1) {
      return { name: dep, version: undefined };
    }
    return {
      name: dep.slice(0, slashIndex + 1 + atIndex),
      version: afterSlash.slice(atIndex + 1),
    };
  }

  // Handle unscoped packages: name@version
  const atIndex = dep.indexOf('@');
  if (atIndex === -1) {
    return { name: dep, version: undefined };
  }
  return {
    name: dep.slice(0, atIndex),
    version: dep.slice(atIndex + 1),
  };
}

/**
 * Check if a dependency is an internal @rafters/* package
 */
function isInternalDep(dep: string): boolean {
  const { name } = parseDependency(dep);
  return name.startsWith('@rafters/');
}

/**
 * Read the consumer's package.json and return the combined set of
 * dependency names (without versions).
 */
async function readInstalledDeps(targetDir: string): Promise<Set<string>> {
  const installed = new Set<string>();
  try {
    const raw = await readFile(join(targetDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      const deps = pkg[field];
      if (deps && typeof deps === 'object') {
        for (const name of Object.keys(deps as Record<string, unknown>)) {
          installed.add(name);
        }
      }
    }
  } catch {
    // No package.json or unreadable -- caller handles the warning
  }
  return installed;
}

/**
 * Collect all dependencies from registry items, deduplicate,
 * filter out @rafters/* and already-installed packages,
 * then install the remainder.
 */
export async function installRegistryDependencies(
  items: RegistryItem[],
  targetDir: string,
  options: InstallRegistryDepsOptions = {},
): Promise<InstallRegistryDepsResult> {
  const result: InstallRegistryDepsResult = {
    installed: [],
    skipped: [],
    devInstalled: [],
  };

  // 1. Collect and deduplicate all deps from all files
  const allDeps = new Set<string>();
  for (const item of items) {
    for (const file of item.files) {
      for (const dep of file.dependencies) {
        allDeps.add(dep);
      }
    }
  }

  // Zero deps -- nothing to do
  if (allDeps.size === 0) {
    return result;
  }

  // 2. Filter out @rafters/* internal deps
  const externalDeps: string[] = [];
  for (const dep of allDeps) {
    if (isInternalDep(dep)) {
      result.skipped.push(dep);
    } else {
      externalDeps.push(dep);
    }
  }

  if (externalDeps.length === 0) {
    return result;
  }

  // 3. Check consumer's package.json for already-installed deps
  const installedInProject = await readInstalledDeps(targetDir);
  const toInstall: string[] = [];

  if (installedInProject.size === 0 && externalDeps.length > 0) {
    // Could not read package.json -- warn but still try to install
    let hasPackageJson = false;
    try {
      await readFile(join(targetDir, 'package.json'), 'utf-8');
      hasPackageJson = true;
    } catch {
      // No package.json
    }

    if (!hasPackageJson) {
      log({
        event: 'add:deps:no-package-json',
        message: 'No package.json found. Run npm init or pnpm init first.',
        targetDir,
      });
    }

    // Still attempt install -- the package manager may create package.json
    toInstall.push(...externalDeps);
  } else {
    for (const dep of externalDeps) {
      const { name } = parseDependency(dep);
      if (installedInProject.has(name)) {
        result.skipped.push(dep);
      } else {
        toInstall.push(dep);
      }
    }
  }

  if (toInstall.length === 0) {
    return result;
  }

  // 4. Dry-run: log and return without installing
  if (options.dryRun) {
    log({
      event: 'add:deps:dry-run',
      dependencies: toInstall,
    });
    result.installed = toInstall;
    return result;
  }

  // 5. Install
  try {
    await updateDependencies(toInstall, [], {
      cwd: targetDir,
      ...(options.silent !== undefined && { silent: options.silent }),
    });
    result.installed = toInstall;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({
      event: 'add:deps:install-failed',
      message: `Failed to install dependencies: ${message}`,
      dependencies: toInstall,
      suggestion: `Manually install: ${toInstall.join(' ')}`,
    });
    // Do NOT re-throw -- files are already written and still useful
  }

  return result;
}
