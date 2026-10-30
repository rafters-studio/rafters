/**
 * rafters remove
 *
 * Deletes the files `rafters add` installed for one item and takes the item off
 * its `installed` list in .rafters/config.rafters.json, then does the same for
 * every need it declared that no other installed item's files declare. It never
 * touches package.json.
 *
 * The config records names, not files, so the file set is recomputed the way
 * `add` chose it: each item is fetched from the registry and its files are
 * selected for the project's component target and mapped to project paths.
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { RegistryClient } from '../registry/client.js';
import type { RegistryItem, RegistryItemType } from '../registry/types.js';
import { resolveComponentTarget } from '../utils/detect.js';
import { error, log, setAgentMode } from '../utils/ui.js';
import {
  declaredNeeds,
  fileProjectPath,
  getInstalledNames,
  loadConfig,
  resolveRegistryUrl,
  saveConfig,
  selectItemFiles,
} from './add.js';

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
  const installedNames = getInstalledNames(config);
  const installedItems = new Map<string, RegistryItem>();
  for (const installedName of installedNames) {
    installedItems.set(installedName, await client.fetchItem(installedName));
  }

  // Grow the removal set until no installed need is left that only the
  // removed items declare.
  const removing = new Set([name]);
  for (;;) {
    const keptNeeds = new Set<string>();
    const removedNeeds = new Set<string>();
    for (const [installedName, item] of installedItems) {
      const into = removing.has(installedName) ? removedNeeds : keptNeeds;
      for (const need of declaredNeeds(item, target)) into.add(need);
    }
    const unique = [...removedNeeds].filter(
      (need) => installedItems.has(need) && !removing.has(need) && !keptNeeds.has(need),
    );
    if (unique.length === 0) break;
    for (const need of unique) removing.add(need);
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
  for (const removedName of [name, ...[...removing].filter((n) => n !== name).sort()]) {
    const item = installedItems.get(removedName);
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
