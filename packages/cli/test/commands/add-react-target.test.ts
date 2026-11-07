/**
 * `rafters add` on a React target (#2951): nothing Astro-only reaches the
 * project, and the chart family's flat sibling imports resolve after install.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { add } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/commands/init.js';
import type { RegistryFile, RegistryItem } from '../../src/registry/types.js';

const PROJECT_DIR = join(import.meta.dirname, '.tmp-add-react-target');

function file(path: string, content: string): RegistryFile {
  return { path, content, dependencies: [], devDependencies: [] };
}

function ui(name: string, files: RegistryFile[]): RegistryItem {
  return { name, type: 'ui', primitives: [], files, rules: [], composites: [] };
}

const card = ui('card', [
  file(
    'components/ui/card.tsx',
    "import { cardClasses } from './card.classes';\nexport const Card = () => null;\nexport const CardHeader = () => null;",
  ),
  file('components/ui/card.astro', '---\n---\n<div />'),
  file('components/ui/card.classes.ts', 'export const cardClasses = {};'),
]);

const cardHeader = ui('card-header', [
  file('components/ui/card-header.astro', '---\n---\n<div />'),
  file('components/ui/card.classes.ts', 'export const cardClasses = {};'),
]);

/** Astro-only, and no parent exports it in React. */
const orphanPart = ui('lone-part', [file('components/ui/lone-part.astro', '---\n---\n<div />')]);

const chart = ui('chart', [
  file('components/ui/chart.tsx', 'export const useChartConfig = () => null;'),
  file(
    'components/ui/area-chart.tsx',
    "import { useChartConfig } from './chart';\nimport { XAxis } from './x-axis';\nexport const AreaChart = () => null;",
  ),
  file('components/ui/x-axis.tsx', 'export const XAxis = () => null;'),
]);

const REGISTRY_BODIES: Record<string, unknown> = {
  '/registry/index.json': {
    name: 'rafters',
    homepage: 'https://rafters.studio',
    components: ['card', 'card-header', 'chart', 'lone-part'],
    primitives: [],
    composites: [],
    rules: [],
    substrate: [],
  },
  '/registry/components/card.json': card,
  '/registry/components/card-header.json': cardHeader,
  '/registry/components/chart.json': chart,
  '/registry/components/lone-part.json': orphanPart,
};

function reactConfig(): RaftersConfig {
  return {
    framework: 'vite',
    componentTarget: 'react',
    registryUrl: 'https://registry.test',
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    rulesPath: 'lib/rules',
    cssPath: null,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: { components: [], primitives: [], composites: [], rules: [] },
  };
}

type Emitted = Record<string, unknown>;

function eventsFrom(logSpy: ReturnType<typeof vi.spyOn>): Emitted[] {
  const events: Emitted[] = [];
  for (const [first] of logSpy.mock.calls) {
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

describe('rafters add on a React target (#2951)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true });
    await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
      JSON.stringify(reactConfig(), null, 2),
    );
    // Fixture files declare no npm dependencies, so the dependency step installs nothing.
    vi.spyOn(process, 'cwd').mockReturnValue(PROJECT_DIR);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', async (input: string | URL) => {
      const body = REGISTRY_BODIES[new URL(String(input)).pathname];
      if (body === undefined) return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(body), { status: 200 });
    });
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = undefined;
    await rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it('lists only the items that have a React file', async () => {
    await add([], { list: true, agent: true });
    const listed = eventsFrom(logSpy).find((event) => event.event === 'add:list');
    const names = (listed?.components as Array<{ name: string }>).map((c) => c.name);
    expect(names).toEqual(['card', 'chart']);
  });

  it('installs the parent that exports an Astro-only part, and writes no .astro file', async () => {
    await add(['card-header'], { agent: true });

    const events = eventsFrom(logSpy);
    const note = events.find((event) => event.event === 'add:react-parent');
    expect(note).toMatchObject({ component: 'card-header', parent: 'card', export: 'CardHeader' });

    const summary = events.find((event) => event.event === 'add:complete');
    expect(summary?.failed).toBe(0);
    expect(summary?.components).toEqual(['card']);
    expect(process.exitCode).toBeUndefined();

    const written = await readdir(join(PROJECT_DIR, 'components/ui'));
    expect(written.sort()).toEqual(['card.classes.ts', 'card.tsx']);
  });

  it('fails an Astro-only part no React parent exports, and writes nothing for it', async () => {
    await add(['lone-part'], { agent: true });

    const summary = eventsFrom(logSpy).find((event) => event.event === 'add:complete');
    expect(summary?.failedComponents).toEqual(['lone-part']);
    expect(process.exitCode).toBe(1);
    await expect(readdir(join(PROJECT_DIR, 'components/ui'))).rejects.toThrow();
  });

  it('rewrites the chart family imports to the flat files the item installs (#2439)', async () => {
    await add(['chart'], { agent: true });

    const areaChart = await readFile(join(PROJECT_DIR, 'components/ui/area-chart.tsx'), 'utf-8');
    expect(areaChart).toContain("from '@/components/ui/chart'");
    expect(areaChart).toContain("from '@/components/ui/x-axis'");
    expect(areaChart).not.toContain('@/components/ui/area-chart/');
  });
});
