/**
 * Steps for `rafters remove` (#2834).
 *
 * The files `rafters add` installed are read from its own `--agent` output
 * (`add:installed` events), so the assertions check exactly what add wrote.
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';
import { execRafters, type Snapshot, snapshot } from './helpers.js';

const { Given, Then } = createBdd();

const state: {
  /** Files `rafters add` reported installing, per item name. */
  installedFiles: Map<string, string[]>;
  files: Snapshot;
  config: string;
} = { installedFiles: new Map(), files: new Map(), config: '' };

function configPath(): string {
  return join(context.fixturePath, '.rafters', 'config.rafters.json');
}

/** Every name on any `installed` list in config.rafters.json. */
function installedNames(): string[] {
  const config: unknown = JSON.parse(readFileSync(configPath(), 'utf8'));
  if (typeof config !== 'object' || config === null || !('installed' in config)) return [];
  const installed = config.installed;
  if (typeof installed !== 'object' || installed === null) return [];
  return Object.values(installed).flatMap((bucket: unknown) =>
    Array.isArray(bucket) ? bucket.filter((n): n is string => typeof n === 'string') : [],
  );
}

/** Run `rafters add` with --agent and record the files each installed item wrote. */
async function runAdd(command: string): Promise<void> {
  const parts = command.split(' ');
  if (parts[0] === 'rafters') parts.shift();
  const result = await execRafters(context.fixturePath, [...parts, '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
  state.installedFiles = new Map();
  for (const line of result.stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    const event: unknown = JSON.parse(line);
    if (typeof event !== 'object' || event === null) continue;
    if (!('event' in event) || event.event !== 'add:installed') continue;
    if (!('component' in event) || typeof event.component !== 'string') continue;
    if (!('files' in event) || !Array.isArray(event.files)) continue;
    state.installedFiles.set(
      event.component,
      event.files.filter((f: unknown): f is string => typeof f === 'string'),
    );
  }
}

function filesFor(name: string): string[] {
  const files = state.installedFiles.get(name);
  if (!files || files.length === 0) throw new Error(`rafters add installed no files for ${name}`);
  return files;
}

Given('a project where {string} has run', async ({}, command: string) => {
  await runAdd(command);
});

Given('a project where {string} also installed its dependencies', async ({}, command: string) => {
  await runAdd(command);
  expect(state.installedFiles.size).toBeGreaterThan(1);
});

Given('an initialised project without {word} installed', async ({}, name: string) => {
  expect(existsSync(configPath())).toBe(true);
  expect(installedNames()).not.toContain(name);
  state.files = await snapshot(context.fixturePath);
  state.config = readFileSync(configPath(), 'utf8');
});

Then('none of the files rafters add installed for {word} exist', async ({}, name: string) => {
  for (const file of filesFor(name)) {
    expect(existsSync(join(context.fixturePath, file)), file).toBe(false);
  }
});

Then('config.rafters.json does not list {word} as installed', async ({}, name: string) => {
  expect(installedNames()).not.toContain(name);
});

Then('the command exits non-zero naming {word} as not installed', async ({}, name: string) => {
  expect(context.commandResult?.exitCode).not.toBe(0);
  expect(context.commandResult?.stderr).toContain(`"${name}" is not installed`);
});

Then('no file and no config entry changed', async () => {
  expect(await snapshot(context.fixturePath)).toEqual(state.files);
  expect(readFileSync(configPath(), 'utf8')).toBe(state.config);
});

Then("{word}'s files and config entry are gone", async ({}, name: string) => {
  expect(context.commandResult?.exitCode, context.commandResult?.stderr).toBe(0);
  for (const file of filesFor(name)) {
    expect(existsSync(join(context.fixturePath, file)), file).toBe(false);
  }
  expect(installedNames()).not.toContain(name);
});

Then('every item {word} depended on is still installed', async ({}, name: string) => {
  const names = installedNames();
  const dependencies = [...state.installedFiles.keys()].filter((n) => n !== name);
  expect(dependencies.length).toBeGreaterThan(0);
  for (const dep of dependencies) {
    expect(names, dep).toContain(dep);
    for (const file of filesFor(dep)) {
      expect(existsSync(join(context.fixturePath, file)), file).toBe(true);
    }
  }
});
