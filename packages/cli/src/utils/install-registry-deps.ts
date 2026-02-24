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
  // TODO: devDependencies installation not yet implemented.
  // When registry items include devDependencies, pass them as the second
  // argument to updateDependencies with the --save-dev flag.
  devInstalled: string[];
  /** Dependencies that failed to install */
  failed: string[];
}

/**
 * Parse a versioned dependency string into name and version.
 * e.g., "@radix-ui/react-dialog@2.1.0" -> { name: "@radix-ui/react-dialog", version: "2.1.0" }
 * e.g., "lodash@4.17.21" -> { name: "lodash", version: "4.17.21" }
 * e.g., "lodash" -> { name: "lodash", version: undefined }
 */
export function parseDependency(dep: string): { name: string; version: string | undefined } {
  const trimmed = dep.trim();
  if (!trimmed) {
    return { name: '', version: undefined };
  }

  // The version separator is the last '@' that is not the scoped-package prefix at index 0
  const versionAt = trimmed.lastIndexOf('@');
  if (versionAt <= 0) {
    return { name: trimmed, version: undefined };
  }

  return {
    name: trimmed.slice(0, versionAt),
    version: trimmed.slice(versionAt + 1),
  };
}

interface ReadDepsResult {
  packageJsonFound: boolean;
  installed: Set<string>;
}

/**
 * Read the consumer's package.json and return the combined set of
 * dependency names (without versions), along with whether package.json exists.
 */
async function readInstalledDeps(targetDir: string): Promise<ReadDepsResult> {
  let raw: string;
  try {
    raw = await readFile(join(targetDir, 'package.json'), 'utf-8');
  } catch {
    // ENOENT, permission errors, etc -- treat as not found
    return { packageJsonFound: false, installed: new Set() };
  }

  try {
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const installed = new Set<string>();
    const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    for (const field of depFields) {
      const section = pkg[field];
      if (section && typeof section === 'object') {
        for (const name of Object.keys(section)) {
          installed.add(name);
        }
      }
    }
    return { packageJsonFound: true, installed };
  } catch {
    // Malformed JSON -- treat as found but empty
    return { packageJsonFound: true, installed: new Set() };
  }
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
    failed: [],
  };

  // 1. Collect and deduplicate all deps across all files
  const allDeps = new Set(items.flatMap((item) => item.files.flatMap((file) => file.dependencies)));

  if (allDeps.size === 0) {
    return result;
  }

  // 2. Partition into internal (@rafters/*) and external deps
  const externalDeps: string[] = [];
  for (const dep of allDeps) {
    if (parseDependency(dep).name.startsWith('@rafters/')) {
      result.skipped.push(dep);
    } else {
      externalDeps.push(dep);
    }
  }

  if (externalDeps.length === 0) {
    return result;
  }

  // 3. Check consumer's package.json for already-installed deps
  const { packageJsonFound, installed: installedInProject } = await readInstalledDeps(targetDir);
  const toInstall: string[] = [];

  if (!packageJsonFound) {
    log({
      event: 'add:deps:no-package-json',
      message: 'No package.json found. Run npm init or pnpm init first.',
      targetDir,
    });
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
    // Do NOT set result.installed -- nothing was actually installed
    return result;
  }

  // 5. Install
  try {
    await updateDependencies(toInstall, [], {
      cwd: targetDir,
      silent: options.silent ?? false,
    });
    result.installed = toInstall;
  } catch (err) {
    result.failed = toInstall;
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
