/**
 * rafters remove
 *
 * Deletes the files `rafters add` installed for one item and takes the item off
 * its `installed` list in .rafters/config.rafters.json, then does the same for
 * every need it declared that no other installed item's files declare. It never
 * touches package.json.
 *
 * The config records names, not files, so the file set is recomputed the way
 * `add` chose it: each item removed is fetched from the registry and its files
 * are selected for the project's component target and mapped to project paths.
 * An item the registry no longer serves (a 404, never an unreachable registry)
 * has its files found on disk instead, and the needs it declared stay installed.
 * A need any other file in the project imports stays installed too, whether the
 * project wrote that file or `add` did, and the run names the need and the file.
 * What the other installed items still need is read from the JSDoc of the
 * installed files on disk, which `add` copies unchanged, so the registry never
 * has to serve every other installed item.
 */

import type { Dirent } from 'node:fs';
import { readdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { RegistryClient, RegistryItemNotFoundError } from '../registry/client.js';
import type { RegistryItem, RegistryItemType } from '../registry/types.js';
import { resolveComponentTarget } from '../utils/detect.js';
import { hasEntryFor } from '../utils/reconcile.js';
import { importAliases } from '../utils/ts-aliases.js';
import { error, log, setAgentMode } from '../utils/ui.js';
import {
  declaredNeeds,
  fileProjectPath,
  getInstalledNames,
  installRoots,
  loadConfig,
  resolveRegistryUrl,
  saveConfig,
  selectItemFiles,
  sourceRootFor,
  substrateProjectPath,
  transformPath,
} from './add.js';
import type { RaftersConfig } from './init.js';

/** The need tags an installed file's JSDoc carries (#2900). */
const NEED_TAG = /^\s*\*\s*@(?:components|primitives|hooks|lib)[ \t]+([^\n]*)$/gm;

/** The tag a component's separately importable part file names its owner with. */
const PARENT_TAG = /@parent[ \t]+([\w-]+)/g;

/** What the project wrote beside an installed file; `add` never writes these. */
const PROJECT_AUTHORED = /\.(test|spec|stories)\./;

/** The files whose imports decide whether a need can go. */
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mts|mjs|astro|vue|svelte)$/;

/** Directories that hold no project source. */
const NOT_SOURCE = new Set(['node_modules', 'dist', 'build', 'coverage', 'out']);

/** An import specifier: `from 'x'`, `import 'x'`, `import('x')`. */
const IMPORT = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"\n]+)['"]/g;

/** A project path with its extension taken off, the form an import names it in. */
function withoutExtension(path: string): string {
  return path.replace(SOURCE_FILE, '');
}

/**
 * The names an import can use for a file: its path without the extension, and
 * for an `index` file also its directory (`@/lib/x` for `lib/x/index.ts`).
 */
function importNames(path: string): string[] {
  const stem = withoutExtension(path);
  return stem.endsWith('/index') ? [stem, dirname(stem)] : [stem];
}

/**
 * Every source file in the project, by project path, with the files it imports
 * (extension off): relative imports, `@/` imports from the source root, and
 * imports through the project's tsconfig `paths` and `baseUrl`.
 */
async function importsOnDisk(cwd: string, sourceRoot: string): Promise<Map<string, Set<string>>> {
  const aliased = await importAliases(cwd);
  const imports = new Map<string, Set<string>>();
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await entriesOf(join(cwd, dir))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !NOT_SOURCE.has(entry.name)) await walk(path);
      } else if (SOURCE_FILE.test(entry.name)) {
        const content = await readFile(join(cwd, path), 'utf-8');
        const targets = new Set<string>();
        for (const match of content.matchAll(IMPORT)) {
          const specifier = match[1] ?? '';
          if (specifier.startsWith('.')) {
            targets.add(withoutExtension(join(dirname(path), specifier)));
          } else {
            if (specifier.startsWith('@/')) {
              targets.add(withoutExtension(join(sourceRoot, specifier.slice(2))));
            }
            for (const target of aliased(specifier)) targets.add(withoutExtension(target));
          }
        }
        imports.set(path, targets);
      }
    }
  };
  await walk('');
  return imports;
}

/** A directory's entries, or none when it does not exist. */
async function entriesOf(path: string): Promise<Dirent[]> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return [];
    throw err;
  }
}

/** Every installed file under the install roots, by project path, with the needs it declares. */
async function declaredOnDisk(cwd: string, roots: string[]): Promise<Map<string, string[]>> {
  const declared = new Map<string, string[]>();
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await entriesOf(join(cwd, dir))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(ts|tsx|astro)$/.test(entry.name) && !declared.has(path)) {
        const content = await readFile(join(cwd, path), 'utf-8');
        const needs = [...content.matchAll(NEED_TAG)].flatMap((m) => (m[1] ?? '').split(/\s+/));
        declared.set(path, needs.filter(Boolean));
      }
    }
  };
  for (const root of roots) await walk(relative(cwd, join(cwd, root)));
  return declared;
}

/**
 * Remove an item the registry no longer serves. Its files are found in the
 * directory `add` writes its kind into: the entry named for it (`editor/`),
 * `<name>.*`, never a bare prefix, and any part file tagged `@parent <name>`.
 */
async function removeUnserved(
  name: string,
  config: RaftersConfig,
  installed: NonNullable<RaftersConfig['installed']>,
  cwd: string,
): Promise<void> {
  const buckets: Array<[string[] | undefined, string[]]> = [
    [installed.components, [transformPath('components/ui/', config, cwd)]],
    [installed.primitives, [transformPath('lib/primitives/', config, cwd)]],
    [installed.composites, [transformPath('composites/', config, cwd)]],
    [installed.rules, [transformPath('rules/', config, cwd)]],
    [
      installed.substrate,
      [substrateProjectPath('hooks', config, cwd), substrateProjectPath('lib', config, cwd)],
    ],
  ];

  const removed: string[] = [];
  for (const [bucket, dirs] of buckets) {
    const index = bucket?.indexOf(name) ?? -1;
    if (!bucket || index === -1) continue;
    bucket.splice(index, 1);
    for (const dir of dirs) {
      for (const entry of await entriesOf(join(cwd, dir))) {
        const path = join(cwd, dir, entry.name);
        const owned =
          (hasEntryFor([entry.name], name) && !PROJECT_AUTHORED.test(entry.name)) ||
          (entry.isFile() &&
            /\.(ts|tsx|astro|vue|svelte)$/.test(entry.name) &&
            [...(await readFile(path, 'utf-8')).matchAll(PARENT_TAG)].some((m) => m[1] === name));
        if (!owned) continue;
        await rm(path, { recursive: true, force: true });
        removed.push(join(dir, entry.name));
      }
    }
  }
  await saveConfig(cwd, config);

  log({ event: 'remove:removed', component: name, files: removed });
  log({ event: 'remove:complete', components: [name] });
}

export interface RemoveOptions {
  registryUrl?: string;
  agent?: boolean;
}

/**
 * Remove one installed item from the project.
 */
export async function remove(name: string, options: RemoveOptions): Promise<void> {
  setAgentMode(options.agent ?? false);
  const cwd = process.cwd();

  log({ event: 'remove:start', cwd, component: name });

  // Checked before any network call: a name that is not installed changes nothing.
  const config = await loadConfig(cwd);
  if (!config?.installed || !getInstalledNames(config).includes(name)) {
    error(`"${name}" is not installed.`);
    process.exitCode = 1;
    return;
  }

  const client = new RegistryClient(resolveRegistryUrl(options, config));
  const target = resolveComponentTarget(config);
  const installedNames = new Set(getInstalledNames(config));
  const onDisk = await declaredOnDisk(cwd, installRoots(config, cwd));
  const importsOf = await importsOnDisk(cwd, sourceRootFor(config, cwd));

  // Grow the removal set until no installed need is left that only the
  // removed items declare. A need the registry cannot serve stays installed.
  let requested: RegistryItem;
  try {
    requested = await client.fetchItem(name);
  } catch (err) {
    if (!(err instanceof RegistryItemNotFoundError)) throw err;
    await removeUnserved(name, config, config.installed, cwd);
    return;
  }
  const removing = new Map<string, RegistryItem>([[name, requested]]);
  const kept = new Set<string>();
  for (;;) {
    const removedPaths = new Set(
      [...removing.values()].flatMap((item) =>
        selectItemFiles(item, target).map((file) => fileProjectPath(file, item, config, cwd)),
      ),
    );
    const keptNeeds = new Set(
      [...onDisk].filter(([path]) => !removedPaths.has(path)).flatMap(([, needs]) => needs),
    );
    const unique = [
      ...new Set([...removing.values()].flatMap((item) => declaredNeeds(item, target))),
    ].filter(
      (need) =>
        installedNames.has(need) && !removing.has(need) && !kept.has(need) && !keptNeeds.has(need),
    );
    if (unique.length === 0) break;
    const candidates = new Map<string, RegistryItem>();
    for (const need of unique) {
      try {
        candidates.set(need, await client.fetchItem(need));
      } catch (err) {
        kept.add(need);
        log({
          event: 'remove:warning',
          component: need,
          message: `Kept ${need}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    // A candidate stays when a file that is not going is importing it; one
    // kept this way is not going either, so repeat until none changes.
    for (let changed = true; changed; ) {
      changed = false;
      const going = new Set(removedPaths);
      const pathsOf = new Map<string, string[]>();
      for (const [need, item] of candidates) {
        const paths = selectItemFiles(item, target).map((file) =>
          fileProjectPath(file, item, config, cwd),
        );
        pathsOf.set(need, paths);
        for (const path of paths) going.add(path);
      }
      for (const [need, paths] of pathsOf) {
        const names = paths.flatMap(importNames);
        const importer = [...importsOf].find(
          ([path, targets]) => !going.has(path) && names.some((name) => targets.has(name)),
        );
        if (!importer) continue;
        candidates.delete(need);
        kept.add(need);
        changed = true;
        log({
          event: 'remove:warning',
          component: need,
          message: `Kept ${need}: ${importer[0]} imports it`,
        });
      }
    }
    for (const [need, item] of candidates) removing.set(need, item);
  }

  const installed = config.installed;
  const bucketByType: Record<RegistryItemType, string[] | undefined> = {
    ui: installed.components,
    primitive: installed.primitives,
    composite: installed.composites,
    rule: installed.rules,
    substrate: installed.substrate,
  };

  const removedNames: string[] = [];
  for (const removedName of [name, ...[...removing.keys()].filter((n) => n !== name).sort()]) {
    const item = removing.get(removedName);
    if (!item) continue;
    const removed: string[] = [];
    for (const file of selectItemFiles(item, target)) {
      const projectPath = fileProjectPath(file, item, config, cwd);
      await rm(join(cwd, projectPath), { force: true });
      removed.push(projectPath);
    }
    const bucket = bucketByType[item.type];
    const index = bucket?.indexOf(removedName) ?? -1;
    if (bucket && index !== -1) bucket.splice(index, 1);
    removedNames.push(removedName);
    log({ event: 'remove:removed', component: removedName, type: item.type, files: removed });
  }
  await saveConfig(cwd, config);

  log({ event: 'remove:complete', components: removedNames });
}
