/**
 * Output regeneration -- the single path that turns a TokenRegistry into the
 * on-disk artifacts and signals consumers.
 *
 * Every trigger (CLI init, CLI add/update, studio token mutation, the file
 * watch) funnels through {@link regenerateOutputs}. There is exactly one
 * function that writes `rafters.css` / `rafters.ts` / `rafters.json` /
 * `rafters.standalone.css` and fires the HMR notification, so the emitted set
 * can never drift between callers and there is no second regen/HMR mechanism.
 *
 * Token persistence (saveRegistryToDir) stays the caller's concern -- it is a
 * separate operation from projecting the registry to output bytes.
 */

import { existsSync, realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { toDTCG } from './exporters/dtcg.js';
import { registryToCompiled, registryToTailwind } from './exporters/tailwind.js';
import { registryToTypeScript } from './exporters/typescript.js';
import type { TokenRegistry } from './registry.js';

/** Which output formats to emit. Mirrors the CLI's ExportConfig. */
export interface OutputExports {
  tailwind: boolean;
  typescript: boolean;
  dtcg: boolean;
  compiled: boolean;
}

export interface RegenerateOutputsInput {
  /** Directory the output files are written to (`.rafters/output`). */
  outputDir: string;
  /** Formats to emit. */
  exports: OutputExports;
  /**
   * Absolute paths Tailwind scans for the compiled (standalone) sheet, emitted
   * as explicit `@source` directives. Resolve via {@link resolveContentSources}.
   * Only consulted when `exports.compiled` is true.
   */
  contentSources?: string[];
  /** Dark-mode strategy for the Tailwind export. Default `class`. */
  darkMode?: 'class' | 'media';
  /**
   * Whether `rafters.css` emits its own `@import "tailwindcss"`. False when the
   * consumer's own CSS already imports Tailwind (shadcn layout).
   */
  includeImport?: boolean;
}

export interface RegenerateOutputsHooks {
  /** Fired once after all outputs are written (e.g. studio HMR signal). */
  notify?: () => void;
}

/**
 * A path-field value as stored in config: a single path, or an array of
 * entries (plain strings or `{ path }` objects for multi-folder layouts).
 */
export type ContentPathField = string | ReadonlyArray<string | { path: string }>;

function fieldToPaths(field: ContentPathField | undefined): string[] {
  if (!field) return [];
  if (typeof field === 'string') return [field];
  return field.map((entry) => (typeof entry === 'string' ? entry : entry.path));
}

/**
 * Resolve the `@source` content roots for the compiled sheet from the
 * configured component/primitive/composite path fields. Returns absolute,
 * de-duplicated paths that currently exist on disk -- a missing path (e.g. a
 * not-yet-installed namespace) is skipped rather than handed to Tailwind.
 *
 * This is the single content-source resolver shared by every caller, so the
 * compiled sheet scans the same vocabulary regardless of which trigger ran.
 */
export function resolveContentSources(
  cwd: string,
  fields: {
    componentsPath?: ContentPathField;
    primitivesPath?: ContentPathField;
    compositesPath?: ContentPathField;
  },
): string[] {
  const raw = [
    ...fieldToPaths(fields.componentsPath),
    ...fieldToPaths(fields.primitivesPath),
    ...fieldToPaths(fields.compositesPath),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const abs = isAbsolute(entry) ? entry : resolve(cwd, entry);
    if (!existsSync(abs)) continue;
    let real: string;
    try {
      real = realpathSync(abs);
    } catch {
      real = abs;
    }
    if (!seen.has(real)) {
      seen.add(real);
      out.push(real);
    }
  }
  return out;
}

/**
 * Write every configured output for `registry` into `input.outputDir`, then
 * fire `hooks.notify`. Returns the filenames written. The ONLY code that writes
 * rafters output files or triggers HMR.
 */
export async function regenerateOutputs(
  registry: TokenRegistry,
  input: RegenerateOutputsInput,
  hooks: RegenerateOutputsHooks = {},
): Promise<string[]> {
  const {
    outputDir,
    exports,
    contentSources = [],
    darkMode = 'class',
    includeImport = true,
  } = input;
  await mkdir(outputDir, { recursive: true });
  const written: string[] = [];

  if (exports.tailwind) {
    const css = registryToTailwind(registry, { includeImport, darkMode });
    await writeFile(join(outputDir, 'rafters.css'), css);
    written.push('rafters.css');
  }

  if (exports.typescript) {
    const ts = registryToTypeScript(registry, { includeJSDoc: true });
    await writeFile(join(outputDir, 'rafters.ts'), ts);
    written.push('rafters.ts');
  }

  if (exports.dtcg) {
    const dtcg = toDTCG([...registry.list()]);
    await writeFile(join(outputDir, 'rafters.json'), JSON.stringify(dtcg, null, 2));
    written.push('rafters.json');
  }

  if (exports.compiled) {
    const compiled = await registryToCompiled(registry, { contentSources });
    await writeFile(join(outputDir, 'rafters.standalone.css'), compiled);
    written.push('rafters.standalone.css');
  }

  hooks.notify?.();
  return written;
}
