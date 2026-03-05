/**
 * Folder loader
 *
 * Reads all `.composite.json` files from a directory, validates
 * them with CompositeFileSchema, and returns valid composites
 * alongside any errors.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompositeFile } from './manifest';
import { CompositeFileSchema } from './manifest';

export interface LoadResult {
  composites: CompositeFile[];
  errors: Array<{ path: string; error: string }>;
}

/**
 * Read and validate all .composite.json files from a directory.
 * Invalid files are reported in errors, not thrown.
 */
export async function loadComposites(directory: string): Promise<LoadResult> {
  const composites: CompositeFile[] = [];
  const errors: LoadResult['errors'] = [];

  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return { composites, errors };
  }

  const files = entries.filter((f) => f.endsWith('.composite.json'));

  for (const file of files) {
    const filePath = join(directory, file);
    try {
      const raw = await readFile(filePath, 'utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        errors.push({
          path: filePath,
          error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        });
        continue;
      }

      const result = CompositeFileSchema.safeParse(parsed);
      if (result.success) {
        composites.push(result.data);
      } else {
        errors.push({ path: filePath, error: result.error.message });
      }
    } catch (e) {
      errors.push({
        path: filePath,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { composites, errors };
}
