/**
 * rafters remove
 *
 * Deletes the files `rafters add` installed for one item and takes the item off
 * its `installed` list in .rafters/config.rafters.json. Items it depended on
 * stay installed.
 *
 * The config records names, not files, so the file set is recomputed the way
 * `add` chose it: the item is fetched from the registry and its files are
 * selected for the project's component target and mapped to project paths.
 */

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { RegistryClient } from '../registry/client.js';
import type { RegistryItemType } from '../registry/types.js';
import { resolveComponentTarget } from '../utils/detect.js';
import { error, log, setAgentMode } from '../utils/ui.js';
import {
  fileProjectPath,
  getInstalledNames,
  loadConfig,
  resolveRegistryUrl,
  saveConfig,
  selectCompositeFiles,
  selectFilesForFramework,
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
  const item = await client.fetchItem(name);

  const target = resolveComponentTarget(config);
  const files =
    item.type === 'ui'
      ? selectFilesForFramework(item.files, target).files
      : item.type === 'composite'
        ? selectCompositeFiles(item.files, target)
        : item.files;

  const removed: string[] = [];
  for (const file of files) {
    const projectPath = fileProjectPath(file, item, config, cwd);
    await rm(join(cwd, projectPath), { force: true });
    removed.push(projectPath);
  }

  const installed = config.installed;
  const bucketByType: Record<RegistryItemType, string[] | undefined> = {
    ui: installed.components,
    primitive: installed.primitives,
    composite: installed.composites,
    rule: installed.rules,
    substrate: installed.substrate,
  };
  const bucket = bucketByType[item.type];
  if (bucket) {
    const index = bucket.indexOf(name);
    if (index !== -1) bucket.splice(index, 1);
  }
  await saveConfig(cwd, config);

  log({ event: 'remove:removed', component: name, type: item.type, files: removed });
  log({ event: 'remove:complete', components: [name] });
}
