/**
 * node-fs composite adapter (server-only)
 *
 * RECURSIVELY walks one or more directories, reads every `.composite.json`
 * file, and hands the raw contents to the discovery core. This replaces the
 * old flat, single-directory loader.
 *
 * Uses `node:fs/promises`, so it is exported from `index.ts` only -- never
 * from `client.ts`.
 */

import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompositeAdapter, DiscoveryResult, RawCompositeEntry } from './discovery';
import { discoverComposites } from './discovery';

const COMPOSITE_SUFFIX = '.composite.json';

/**
 * Recursively collect raw `.composite.json` entries from a directory tree.
 * Missing directories yield nothing (no throw). Symlinked / unreadable
 * subdirectories are skipped silently.
 */
async function readDir(directory: string): Promise<RawCompositeEntry[]> {
  const entries: RawCompositeEntry[] = [];

  let dirents: Dirent[];
  try {
    dirents = await readdir(directory, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const dirent of dirents) {
    const fullPath = join(directory, dirent.name);
    if (dirent.isDirectory()) {
      entries.push(...(await readDir(fullPath)));
      continue;
    }
    if (dirent.isFile() && dirent.name.endsWith(COMPOSITE_SUFFIX)) {
      const raw = await readFile(fullPath, 'utf-8');
      entries.push({ raw, source: fullPath });
    }
  }

  return entries;
}

/**
 * Build a {@link CompositeAdapter} that recursively reads `.composite.json`
 * files from the given directories. Directories are scanned in order; entries
 * from earlier directories win on duplicate ids (the core keeps the first).
 */
export function nodeFsAdapter(...directories: string[]): CompositeAdapter {
  return async () => {
    const entries: RawCompositeEntry[] = [];
    for (const directory of directories) {
      entries.push(...(await readDir(directory)));
    }
    return entries;
  };
}

/**
 * Convenience: recursively discover composites from one or more directories
 * and run them through the discovery core in a single call.
 */
export async function discoverFromDirs(...directories: string[]): Promise<DiscoveryResult> {
  const adapter = nodeFsAdapter(...directories);
  return discoverComposites(await adapter());
}
