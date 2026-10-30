/**
 * A fixture registry for the declared-needs scenarios (#2900): each served file
 * carries its own declared needs, while the item-level lists carry the union of
 * every file's, the way the registry serves them. Served over an ephemeral
 * in-process HTTP server -- a test harness, not a dev server -- and the project
 * reads it through `registryUrl` in its config.
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import type { RegistryFile, RegistryItem } from '../../src/registry/types.js';
import { context } from './common.steps.js';

const { Given, Then, After } = createBdd();

let server: Server | undefined;

After(async () => {
  const running = server;
  server = undefined;
  if (running) await new Promise<void>((resolve) => running.close(() => resolve()));
});

function file(path: string, content: string, needs: string[] = []): RegistryFile {
  return { path, content, dependencies: [], devDependencies: [], registryDependencies: needs };
}

function item(name: string, type: RegistryItem['type'], files: RegistryFile[]): RegistryItem {
  const needs = [...new Set(files.flatMap((f) => f.registryDependencies))];
  return { name, type, primitives: needs, registryDependencies: needs, files, rules: [] };
}

const FOLDER: Record<RegistryItem['type'], string> = {
  ui: 'components',
  primitive: 'primitives',
  composite: 'composites',
  rule: 'rules',
  substrate: 'substrate',
};

function configPath(): string {
  return join(context.fixturePath, '.rafters', 'config.rafters.json');
}

function updateConfig(change: (config: Record<string, unknown>) => void): void {
  const config: unknown = JSON.parse(readFileSync(configPath(), 'utf8'));
  if (typeof config !== 'object' || config === null) throw new Error('config is not an object');
  const record: Record<string, unknown> = { ...config };
  change(record);
  writeFileSync(configPath(), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

/** Serve `items` and point the project's config at them. */
async function serve(items: RegistryItem[]): Promise<void> {
  const bodies = new Map(items.map((i) => [`/registry/${FOLDER[i.type]}/${i.name}.json`, i]));
  const started = createServer((req, res) => {
    const body = bodies.get(new URL(req.url ?? '/', 'http://x').pathname);
    res.writeHead(body ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body ?? { error: 'not found' }));
  });
  server = started;
  await new Promise<void>((resolve) => started.listen(0, '127.0.0.1', resolve));
  const address = started.address();
  if (!address || typeof address !== 'object') throw new Error('fixture registry has no port');
  updateConfig((config) => {
    config['registryUrl'] = `http://127.0.0.1:${address.port}`;
  });
}

const REACT_PRIMITIVE =
  "import type * as React from 'react';\nexport type Slot = React.ReactNode;\n";
const REACT_HOOK =
  "import { useSyncExternalStore } from 'react';\nexport const use = useSyncExternalStore;\n";

Given(
  'a registry where {word}.tsx declares the primitive {word} and the hook {word}',
  async ({}, name: string, primitive: string, hook: string) => {
    await serve([
      item(name, 'ui', [
        file(`components/ui/${name}.tsx`, `import { ${hook} } from '../../hooks/${hook}';\n`, [
          primitive,
          hook,
        ]),
        file(`components/ui/${name}.astro`, '---\n---\n<div><slot /></div>\n'),
        file(`components/ui/${name}.classes.ts`, `export const ${name}Classes = '';\n`),
      ]),
      item(primitive, 'primitive', [file(`lib/primitives/${primitive}.ts`, REACT_PRIMITIVE)]),
      item(hook, 'substrate', [file(`hooks/${hook}.ts`, REACT_HOOK)]),
    ]);
  },
);

Given(
  'a registry where {word} and {word} both declare the primitive {word} and only {word} declares the primitive {word}',
  async ({}, first: string, second: string, shared: string, owner: string, solo: string) => {
    const component = (name: string): RegistryItem =>
      item(name, 'ui', [
        file(
          `components/ui/${name}.tsx`,
          `export const ${name} = null;\n`,
          name === owner ? [shared, solo] : [shared],
        ),
      ]);
    await serve([
      component(first),
      component(second),
      item(shared, 'primitive', [file(`lib/primitives/${shared}.ts`, 'export {};\n')]),
      item(solo, 'primitive', [file(`lib/primitives/${solo}.ts`, 'export {};\n')]),
    ]);
  },
);

Given('the project targets astro', async () => {
  updateConfig((config) => {
    config['componentTarget'] = 'astro';
  });
});

/** The files each item `add --agent` reported writing. */
function addedFiles(): Map<string, string[]> {
  const added = new Map<string, string[]>();
  for (const line of (context.commandResult?.stdout ?? '').split('\n')) {
    if (!line.startsWith('{')) continue;
    const event: unknown = JSON.parse(line);
    if (typeof event !== 'object' || event === null) continue;
    if (!('event' in event) || event.event !== 'add:installed') continue;
    if (!('component' in event) || typeof event.component !== 'string') continue;
    if (!('files' in event) || !Array.isArray(event.files)) continue;
    added.set(
      event.component,
      event.files.filter((f: unknown): f is string => typeof f === 'string'),
    );
  }
  return added;
}

Then(
  'rafters add wrote no file for {word} or {word}',
  async ({}, first: string, second: string) => {
    const added = addedFiles();
    expect(added.size).toBeGreaterThan(0);
    expect([...added.keys()]).not.toContain(first);
    expect([...added.keys()]).not.toContain(second);
  },
);

Then('no file rafters add wrote imports react', async () => {
  const written = [...addedFiles().values()].flat();
  expect(written.length).toBeGreaterThan(0);
  for (const path of written) {
    const content = readFileSync(join(context.fixturePath, path), 'utf8');
    expect(content, path).not.toMatch(/from\s+['"]react['"]/);
  }
});
