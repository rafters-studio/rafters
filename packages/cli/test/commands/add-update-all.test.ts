/**
 * End-to-end tests for `rafters add --update-all`.
 *
 * These are the tests that would have caught the original defect: the command
 * took its candidate list from `config.installed` alone, so a component present
 * on disk but missing from that list was refreshed by nothing, forever, while
 * the summary reported plain success.
 *
 * The registry is stubbed at `fetch` so the whole flow -- candidate set,
 * dependency closure, file writes, config tracking, summary -- runs for real
 * against a temp project.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { add } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/commands/init.js';
import type { RegistryItem } from '../../src/registry/types.js';

const PROJECT_DIR = join(import.meta.dirname, '.tmp-update-all');
const REGISTRY_URL = 'https://registry.test';

const FRESH_CONTAINER = 'export const Container = () => null; // fresh';
const STALE_CONTAINER = 'export const Container = () => null; // stale';

const containerItem: RegistryItem = {
  name: 'container',
  type: 'ui',
  primitives: ['classy'],
  files: [
    {
      path: 'components/ui/container.tsx',
      content: FRESH_CONTAINER,
      dependencies: [],
      devDependencies: [],
    },
  ],
  rules: [],
  composites: [],
};

const classyItem: RegistryItem = {
  name: 'classy',
  type: 'primitive',
  primitives: [],
  files: [
    {
      path: 'lib/primitives/classy.ts',
      content: 'export const classy = () => "";',
      dependencies: [],
      devDependencies: [],
    },
  ],
  rules: [],
  composites: [],
};

const registryIndex = {
  name: 'rafters',
  homepage: 'https://rafters.studio',
  components: ['container', 'button'],
  primitives: ['classy'],
  composites: [],
  rules: [],
  substrate: [],
};

const REGISTRY_BODIES: Record<string, unknown> = {
  '/registry/index.json': registryIndex,
  '/registry/components/container.json': containerItem,
  '/registry/primitives/classy.json': classyItem,
};

function stubRegistry(): void {
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const { pathname } = new URL(String(input));
    const body = REGISTRY_BODIES[pathname];
    if (body === undefined) {
      return new Response('not found', { status: 404 });
    }
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

function baseConfig(installed: Partial<NonNullable<RaftersConfig['installed']>>): RaftersConfig {
  return {
    framework: 'vite',
    registryUrl: REGISTRY_URL,
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    rulesPath: 'lib/rules',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: { components: [], primitives: [], composites: [], rules: [], ...installed },
  };
}

async function writeProject(config: RaftersConfig): Promise<void> {
  await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
  await writeFile(
    join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
    JSON.stringify(config, null, 2),
  );
}

async function readConfig(): Promise<RaftersConfig> {
  const raw = await readFile(join(PROJECT_DIR, '.rafters', 'config.rafters.json'), 'utf-8');
  return JSON.parse(raw) as RaftersConfig;
}

/** The JSON events the agent-mode run emitted, in order. */
type Emitted = Record<string, unknown>;

function eventsFrom(logSpy: ReturnType<typeof vi.spyOn>): Emitted[] {
  const events: Emitted[] = [];
  for (const call of logSpy.mock.calls) {
    const [first] = call;
    if (typeof first !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(first);
      if (parsed && typeof parsed === 'object') events.push(parsed as Emitted);
    } catch {
      // Not an event line.
    }
  }
  return events;
}

function summaryOf(events: Emitted[]): Emitted {
  const summary = events.find((event) => event.event === 'add:complete');
  if (!summary) throw new Error('no add:complete summary was emitted');
  return summary;
}

describe('rafters add --update-all', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true });
    await mkdir(PROJECT_DIR, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(PROJECT_DIR);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stubRegistry();
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = undefined;
    await rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it('refreshes a tracked component whose file on disk has drifted', async () => {
    await writeProject(baseConfig({ components: ['container'] }));
    await mkdir(join(PROJECT_DIR, 'components/ui'), { recursive: true });
    await writeFile(join(PROJECT_DIR, 'components/ui/container.tsx'), STALE_CONTAINER);

    await add([], { updateAll: true, agent: true });

    const onDisk = await readFile(join(PROJECT_DIR, 'components/ui/container.tsx'), 'utf-8');
    expect(onDisk).toBe(FRESH_CONTAINER);

    const summary = summaryOf(eventsFrom(logSpy));
    expect(summary.components).toContain('container');
  });

  it('re-walks the dependency closure so a lost dependency is reinstalled and re-tracked', async () => {
    // The config tracks the parent only -- the classy primitive it depends on
    // was never recorded and its file is gone.
    await writeProject(baseConfig({ components: ['container'] }));
    await mkdir(join(PROJECT_DIR, 'components/ui'), { recursive: true });
    await writeFile(join(PROJECT_DIR, 'components/ui/container.tsx'), STALE_CONTAINER);

    await add([], { updateAll: true, agent: true });

    const primitive = await readFile(join(PROJECT_DIR, 'lib/primitives/classy.ts'), 'utf-8');
    expect(primitive).toContain('classy');
    expect((await readConfig()).installed?.primitives).toContain('classy');
  });

  it('discovers an on-disk component the config never tracked, refreshes it, and tracks it', async () => {
    // Exactly the reported reproduction: files on disk, config.installed empty.
    await writeProject(baseConfig({ components: [] }));
    await mkdir(join(PROJECT_DIR, 'components/ui'), { recursive: true });
    await writeFile(join(PROJECT_DIR, 'components/ui/container.tsx'), STALE_CONTAINER);

    await add([], { updateAll: true, agent: true });

    const onDisk = await readFile(join(PROJECT_DIR, 'components/ui/container.tsx'), 'utf-8');
    expect(onDisk).toBe(FRESH_CONTAINER);
    expect((await readConfig()).installed?.components).toContain('container');
  });

  it('reports written, skipped, untracked and failed counts separately', async () => {
    await writeProject(baseConfig({ components: [] }));
    await mkdir(join(PROJECT_DIR, 'components/ui'), { recursive: true });
    await writeFile(join(PROJECT_DIR, 'components/ui/container.tsx'), STALE_CONTAINER);

    await add([], { updateAll: true, agent: true });

    const events = eventsFrom(logSpy);
    const summary = summaryOf(events);

    // container + its classy dependency were both written; nothing was skipped
    // (update-all overwrites) and nothing failed.
    expect(summary.written).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.untracked).toBe(1);
    expect(summary.untrackedComponents).toEqual(['container']);

    // The discovery is announced before the install runs, not buried in a count.
    const discovery = events.find((event) => event.event === 'add:untracked');
    expect(discovery?.components).toEqual(['container']);
  });

  it('updates the tracked set when the registry index cannot be read', async () => {
    await writeProject(baseConfig({ components: ['container'] }));
    await mkdir(join(PROJECT_DIR, 'components/ui'), { recursive: true });
    await writeFile(join(PROJECT_DIR, 'components/ui/container.tsx'), STALE_CONTAINER);

    vi.stubGlobal('fetch', async (input: string | URL) => {
      const { pathname } = new URL(String(input));
      if (pathname === '/registry/index.json') throw new Error('offline');
      const body = REGISTRY_BODIES[pathname];
      if (body === undefined) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(body), { status: 200 });
    });

    await add([], { updateAll: true, agent: true });

    const onDisk = await readFile(join(PROJECT_DIR, 'components/ui/container.tsx'), 'utf-8');
    expect(onDisk).toBe(FRESH_CONTAINER);
    expect(summaryOf(eventsFrom(logSpy)).untracked).toBe(0);
  });
});
