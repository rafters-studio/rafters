/**
 * `rafters remove` of an item the registry no longer serves (#2899): the config
 * records names, not files, so the files are found on disk. The registry is
 * stubbed at `fetch`; the rest runs for real against a temp project.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaftersConfig } from '../../src/commands/init.js';
import { remove } from '../../src/commands/remove.js';

const PROJECT_DIR = join(import.meta.dirname, '.tmp-remove-unserved');
const CONFIG = join(PROJECT_DIR, '.rafters', 'config.rafters.json');

function stubStatus(status: number): void {
  vi.stubGlobal('fetch', async () => new Response('{}', { status }));
}

async function writeProject(
  installed: Partial<NonNullable<RaftersConfig['installed']>>,
  files: Record<string, string>,
): Promise<void> {
  const config = {
    framework: 'vite',
    registryUrl: 'https://registry.test',
    componentsPath: 'src/components/ui',
    primitivesPath: 'src/lib/primitives',
    compositesPath: 'src/composites',
    rulesPath: 'src/lib/rules',
    cssPath: null,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: { components: [], primitives: [], composites: [], rules: [], ...installed },
  };
  await mkdir(dirname(CONFIG), { recursive: true });
  await writeFile(CONFIG, JSON.stringify(config));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(PROJECT_DIR, path)), { recursive: true });
    await writeFile(join(PROJECT_DIR, path), content);
  }
}

async function installedConfig(): Promise<NonNullable<RaftersConfig['installed']>> {
  const config = JSON.parse(await readFile(CONFIG, 'utf-8')) as RaftersConfig;
  if (!config.installed) throw new Error('config has no installed list');
  return config.installed;
}

const present = (path: string): boolean => existsSync(join(PROJECT_DIR, path));

describe('rafters remove of an item the registry no longer serves', () => {
  beforeEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true });
    vi.spyOn(process, 'cwd').mockReturnValue(PROJECT_DIR);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = undefined;
    await rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it('deletes what add installed for a component and takes it off the config', async () => {
    await writeProject(
      { components: ['button', 'editor'] },
      {
        'src/components/ui/editor.tsx': '',
        'src/components/ui/editor.astro': '',
        'src/components/ui/editor.classes.ts': '',
        'src/components/ui/editor/ops/format.ts': '',
        'src/components/ui/editor-toolbar.astro': '---\n/**\n * @parent editor\n */\n---\n',
        'src/components/ui/button.tsx': '',
      },
    );
    stubStatus(404);

    await remove('editor', { agent: true });

    for (const gone of [
      'src/components/ui/editor.tsx',
      'src/components/ui/editor.astro',
      'src/components/ui/editor.classes.ts',
      'src/components/ui/editor/ops/format.ts',
      'src/components/ui/editor-toolbar.astro',
    ]) {
      expect(present(gone), gone).toBe(false);
    }
    expect(present('src/components/ui/button.tsx')).toBe(true);
    expect((await installedConfig()).components).toEqual(['button']);
    expect(process.exitCode).toBeUndefined();
  });

  it('leaves files that only look like the component', async () => {
    const kept = {
      'src/components/ui/grid-item.tsx': '',
      'src/components/ui/grid.test.tsx': '',
      'src/components/ui/grid.stories.tsx': '',
      'src/components/ui/panel.tsx': '/** @parent grid-item */\n',
    };
    await writeProject({ components: ['grid'] }, { 'src/components/ui/grid.tsx': '', ...kept });
    stubStatus(404);

    await remove('grid', { agent: true });

    expect(present('src/components/ui/grid.tsx')).toBe(false);
    for (const path of Object.keys(kept)) expect(present(path), path).toBe(true);
  });

  it('looks where add writes the kind of item the config lists it as', async () => {
    await writeProject(
      { primitives: ['old-primitive'], substrate: ['use-old', 'old-lib'] },
      {
        'src/lib/primitives/old-primitive.ts': '',
        'src/hooks/use-old.ts': '',
        'src/lib/old-lib.ts': '',
      },
    );
    stubStatus(404);

    await remove('old-primitive', { agent: true });
    await remove('use-old', { agent: true });
    await remove('old-lib', { agent: true });

    expect(present('src/lib/primitives/old-primitive.ts')).toBe(false);
    expect(present('src/hooks/use-old.ts')).toBe(false);
    expect(present('src/lib/old-lib.ts')).toBe(false);
    const installed = await installedConfig();
    expect(installed.primitives).toEqual([]);
    expect(installed.substrate).toEqual([]);
  });

  it('changes nothing when the registry answers with anything but a 404', async () => {
    await writeProject({ components: ['editor'] }, { 'src/components/ui/editor.tsx': '' });
    stubStatus(503);

    await expect(remove('editor', { agent: true })).rejects.toThrow('503');

    expect(present('src/components/ui/editor.tsx')).toBe(true);
    expect((await installedConfig()).components).toEqual(['editor']);
  });

  it('changes nothing when the registry cannot be reached', async () => {
    await writeProject({ components: ['editor'] }, { 'src/components/ui/editor.tsx': '' });
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('host not found');
    });

    await expect(remove('editor', { agent: true })).rejects.toThrow('host not found');

    expect(present('src/components/ui/editor.tsx')).toBe(true);
    expect((await installedConfig()).components).toEqual(['editor']);
  });
});
