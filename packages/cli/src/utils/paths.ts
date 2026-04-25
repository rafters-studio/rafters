/**
 * Path utilities for .rafters/ directory structure
 */

import { realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';

export interface RaftersPaths {
  root: string;
  config: string;
  tokens: string;
  output: string;
  importPending: string;
}

/**
 * Get all .rafters/ paths for a project
 */
export function getRaftersPaths(projectRoot: string = process.cwd()): RaftersPaths {
  const root = join(projectRoot, '.rafters');
  return {
    root,
    config: join(root, 'config.rafters.json'),
    tokens: join(root, 'tokens'),
    output: join(root, 'output'),
    importPending: join(root, 'import-pending.json'),
  };
}

/**
 * Get path to a namespace token file
 */
export function getTokenFilePath(projectRoot: string, namespace: string): string {
  return join(projectRoot, '.rafters', 'tokens', `${namespace}.rafters.json`);
}

/**
 * Get path to an output file
 */
export function getOutputFilePath(
  projectRoot: string,
  filename: 'theme.css' | 'tokens.json' | 'tokens.ts',
): string {
  return join(projectRoot, '.rafters', 'output', filename);
}

/**
 * A single entry in a path field. Either a plain path string, or an object
 * with `root: true` to mark the install target explicitly. Used for fields
 * that accept multiple folders (componentsPath, primitivesPath, compositesPath,
 * rulesPath).
 */
export const PathEntrySchema = z.union([
  z.string(),
  z.object({ path: z.string(), root: z.literal(true).optional() }),
]);

export type PathEntry = z.infer<typeof PathEntrySchema>;

/**
 * A path field accepts a single string (status quo) or an array of entries.
 */
export const PathFieldSchema = z.union([z.string(), z.array(PathEntrySchema)]);

export type PathField = z.infer<typeof PathFieldSchema>;

function entryPath(entry: PathEntry): string {
  return typeof entry === 'string' ? entry : entry.path;
}

function entryHasExplicitRoot(entry: PathEntry): boolean {
  return typeof entry === 'object' && entry.root === true;
}

function tryRealpath(absPath: string): string {
  try {
    return realpathSync(absPath);
  } catch {
    return absPath;
  }
}

function isInsideCwd(absPath: string, cwdReal: string): boolean {
  const rel = relative(cwdReal, absPath);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Resolve the install root for a path field.
 *
 * Precedence:
 *   1. The first entry with `{ root: true }`
 *   2. The first entry whose realpath resolves inside cwd
 *   3. `fallback` joined to cwd (the framework default)
 *
 * Returns a path **relative to cwd** so it can be persisted in config and
 * compared with the other resolved paths consistently.
 */
export function resolveRoot(field: PathField, cwd: string, fallback: string): string {
  const cwdReal = tryRealpath(resolve(cwd));

  if (typeof field === 'string') {
    return field;
  }

  for (const entry of field) {
    if (entryHasExplicitRoot(entry)) {
      return entryPath(entry);
    }
  }

  for (const entry of field) {
    const p = entryPath(entry);
    const abs = isAbsolute(p) ? p : resolve(cwdReal, p);
    if (isInsideCwd(tryRealpath(abs), cwdReal)) return p;
  }

  return fallback;
}

/**
 * Resolve the read set for a path field: the ordered list of absolute roots
 * to search when loading items. The install root (per {@link resolveRoot}) is
 * always first, so first-write-wins semantics in the loader produce
 * "local wins on collision". Realpathed and deduplicated.
 */
export function resolveReadSet(field: PathField, cwd: string, fallback?: string): string[] {
  const cwdReal = tryRealpath(resolve(cwd));
  const entries = typeof field === 'string' ? [field] : field.map(entryPath);
  const root = resolveRoot(field, cwd, fallback ?? entries[0] ?? '');
  const ordered = [root, ...entries.filter((e) => e !== root)];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of ordered) {
    if (!entry) continue;
    const abs = isAbsolute(entry) ? entry : resolve(cwdReal, entry);
    const real = tryRealpath(abs);
    if (!seen.has(real)) {
      seen.add(real);
      out.push(real);
    }
  }
  return out;
}
