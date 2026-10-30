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
 * What the other installed items still need is the union of the need tags in
 * the JSDoc of the installed files on disk, which `add` copies unchanged, and
 * the needs the registry serves for each of them, because files installed
 * before the tags existed carry none. An item the registry no longer serves
 * counts by its files' tags alone and never blocks the removal.
 */

import { readdir, readFile, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { RegistryClient } from '../registry/client.js';
import type { RegistryItem, RegistryItemType } from '../registry/types.js';
import { resolveComponentTarget } from '../utils/detect.js';
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
} from './add.js';

/** The need tags an installed file's JSDoc carries (#2900). */
const NEED_TAG = /^\s*\*\s*@(?:components|primitives|hooks|lib)[ \t]+([^\n]*)$/gm;

/** Every installed file under the install roots, by project path, with the needs it declares. */
async function declaredOnDisk(cwd: string, roots: string[]): Promise<Map<string, string[]>> {
  const declared = new Map<string, string[]>();
  const walk = async (dir: string): Promise<void> => {
    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = await readdir(join(cwd, dir), { withFileTypes: true });
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
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

  const removing = new Map<string, RegistryItem>([[name, await client.fetchItem(name)]]);
  const others = new Map<string, RegistryItem>();
  const otherNames = [...installedNames].filter((n) => n !== name).sort();
  const fetched = await Promise.allSettled(otherNames.map((n) => client.fetchItem(n)));
  for (const [i, result] of fetched.entries()) {
    const other = otherNames[i];
    if (other === undefined) continue;
    if (result.status === 'fulfilled') {
      others.set(other, result.value);
      continue;
    }
    const reason = result.reason;
    log({
      event: 'remove:warning',
      component: other,
      message: `Kept ${other}; its needs are read from its installed files only: ${reason instanceof Error ? reason.message : String(reason)}`,
    });
  }

  // Grow the removal set until no installed need is left that only the
  // removed items declare. A need the registry cannot serve stays installed.
  for (;;) {
    const removedPaths = new Set(
      [...removing.values()].flatMap((item) =>
        selectItemFiles(item, target).map((file) => fileProjectPath(file, item, config, cwd)),
      ),
    );
    const keptNeeds = new Set([
      ...[...onDisk].filter(([path]) => !removedPaths.has(path)).flatMap(([, needs]) => needs),
      ...[...others]
        .filter(([other]) => !removing.has(other))
        .flatMap(([, item]) => declaredNeeds(item, target)),
    ]);
    const unique = [
      ...new Set([...removing.values()].flatMap((item) => declaredNeeds(item, target))),
    ].filter((need) => others.has(need) && !removing.has(need) && !keptNeeds.has(need));
    if (unique.length === 0) break;
    for (const need of unique) {
      const item = others.get(need);
      if (item) removing.set(need, item);
    }
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
