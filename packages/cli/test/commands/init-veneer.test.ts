import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '../../src/commands/init.js';
import { updateDependencies } from '../../src/utils/update-dependencies.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/utils/update-dependencies.js')>()),
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

const VENEER = '@rafters/veneer';

function veneerInstalls(): unknown[][] {
  return vi
    .mocked(updateDependencies)
    .mock.calls.filter(([, dev]) => (dev as string[]).includes(VENEER));
}

describe('rafters init adds @rafters/veneer (#2933)', () => {
  let projectDir = '';
  let originalCwd = '';

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
    vi.mocked(updateDependencies).mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
  });

  it.each([
    ['no flags', {}],
    ['--agent', { agent: true }],
    ['--framework astro', { agent: true, framework: 'astro' }],
    ['--scripts Latn,Arab', { agent: true, scripts: 'Latn,Arab' }],
  ])(
    'a fresh init with %s installs it as a devDependency',
    async (_name, options) => {
      await init({ ...options, agent: true });
      const installs = veneerInstalls();
      expect(installs).toHaveLength(1);
      expect(installs[0]?.[0]).toEqual([]);
      expect(installs[0]?.[1]).toEqual([VENEER]);
    },
    60000,
  );

  it.each([['rebuild'], ['reset']] as const)(
    '--%s installs it',
    async (flag) => {
      await init({ agent: true });
      vi.mocked(updateDependencies).mockClear();
      await init({ agent: true, [flag]: true });
      expect(veneerInstalls()).toHaveLength(1);
    },
    120000,
  );

  it('keeps a declared version and does not reinstall', async () => {
    const path = join(projectDir, 'package.json');
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    pkg.devDependencies = { ...(pkg.devDependencies as object), [VENEER]: '0.0.4' };
    writeFileSync(path, JSON.stringify(pkg, null, 2));
    await init({ agent: true });
    expect(veneerInstalls()).toHaveLength(0);
    const after = JSON.parse(readFileSync(path, 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    expect(after.devDependencies[VENEER]).toBe('0.0.4');
  }, 60000);

  it('a refusal installs nothing', async () => {
    await init({ agent: true });
    vi.mocked(updateDependencies).mockClear();
    await expect(init({ agent: true })).rejects.toThrow('already exists');
    expect(vi.mocked(updateDependencies)).not.toHaveBeenCalled();
  }, 120000);

  it('a failed install names the command and leaves init written', async () => {
    vi.mocked(updateDependencies).mockImplementation(async (_deps, dev) => {
      if (dev.includes(VENEER)) throw new Error('offline');
    });
    const out = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await init({ agent: true });
      const events = out.mock.calls.map(([line]) => JSON.parse(String(line)) as { event: string });
      const failed = events.find((e) => e.event === 'init:veneer_install_failed') as
        | { command: string; error: string }
        | undefined;
      expect(failed?.command).toMatch(/ -D @rafters\/veneer$/);
      expect(failed?.error).toBe('offline');
      expect(events.at(-1)?.event).toBe('init:complete');
    } finally {
      out.mockRestore();
    }
    expect(readFileSync(join(projectDir, '.rafters', 'config.rafters.json'), 'utf8')).toContain(
      'framework',
    );
  }, 60000);
});
