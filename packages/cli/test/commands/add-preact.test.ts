/**
 * `rafters add` in a Preact project (#2744): the React files install, as in a
 * React project, and the preact/compat alias requirement prints once.
 *
 * The config sets `framework: 'preact'` and no `componentTarget`, so the
 * target comes from `frameworkToTarget`.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { add } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/commands/init.js';
import type { RegistryItem } from '../../src/registry/types.js';

const PROJECT_DIR = join(import.meta.dirname, '.tmp-add-preact');
const REGISTRY_URL = 'https://registry.test';

function file(path: string, content: string): RegistryItem['files'][number] {
  return { path, content, dependencies: [], devDependencies: [] };
}

const buttonItem: RegistryItem = {
  name: 'button',
  type: 'ui',
  primitives: [],
  files: [
    file('components/ui/button.tsx', 'export function Button() { return null; }'),
    file('components/ui/button.astro', '<button />'),
    file('components/ui/button.element.ts', 'export class ButtonElement extends HTMLElement {}'),
  ],
  rules: [],
  composites: [],
};

const REGISTRY_BODIES: Record<string, unknown> = {
  '/registry/index.json': {
    name: 'rafters',
    homepage: 'https://rafters.studio',
    components: ['button'],
    primitives: [],
    composites: [],
    rules: [],
    substrate: [],
  },
  '/registry/components/button.json': buttonItem,
};

function preactConfig(): RaftersConfig {
  return {
    framework: 'preact',
    registryUrl: REGISTRY_URL,
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    rulesPath: 'lib/rules',
    cssPath: null,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: { components: [], primitives: [], composites: [], rules: [] },
  };
}

function eventsFrom(logSpy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = [];
  for (const [first] of logSpy.mock.calls) {
    if (typeof first !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(first);
      if (parsed && typeof parsed === 'object') events.push(parsed as Record<string, unknown>);
    } catch {
      // Not an event line.
    }
  }
  return events;
}

describe('rafters add in a preact project', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true });
    await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
      JSON.stringify(preactConfig(), null, 2),
    );
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

  it('writes button.tsx, not the .astro or .element.ts file', async () => {
    await add(['button'], { agent: true });

    expect(await readFile(join(PROJECT_DIR, 'components/ui/button.tsx'), 'utf-8')).toContain(
      'Button',
    );
    await expect(readFile(join(PROJECT_DIR, 'components/ui/button.astro'))).rejects.toThrow();
    await expect(readFile(join(PROJECT_DIR, 'components/ui/button.element.ts'))).rejects.toThrow();
  });

  it('prints the preact/compat alias requirement once', async () => {
    await add(['button'], { agent: true });

    const notes = eventsFrom(logSpy).filter((event) => event.event === 'add:framework_note');
    expect(notes).toHaveLength(1);
    expect(String(notes[0]?.message)).toContain('preact/compat');
    expect(String(notes[0]?.message)).toContain('@preact/preset-vite');
  });
});
