/**
 * @tailwindcss/cli on demand (#2843).
 *
 * rafters no longer depends on @tailwindcss/cli, so resolving it is the
 * project's business. These tests make it unresolvable and watch what init
 * checks and installs.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TokenRegistry } from '@rafters/design-tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureTailwindCli, generateOutputs } from '../../src/commands/init.js';
import { getRaftersPaths } from '../../src/utils/paths.js';
import { setAgentMode } from '../../src/utils/ui.js';
import { updateDependencies } from '../../src/utils/update-dependencies.js';

const TAILWIND_CLI = '@tailwindcss/cli/package.json';
const resolveCalls = vi.hoisted(() => ({ tailwindCli: 0 }));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    createRequire: (from: string | URL) => {
      const real = actual.createRequire(from);
      const resolve = (request: string, options?: { paths?: string[] }): string => {
        if (request === TAILWIND_CLI) {
          resolveCalls.tailwindCli += 1;
          throw Object.assign(new Error(`Cannot find module '${request}'`), {
            code: 'MODULE_NOT_FOUND',
          });
        }
        return real.resolve(request, options);
      };
      return Object.assign(real, { resolve });
    },
  };
});

vi.mock('@rafters/design-tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rafters/design-tokens')>();
  return { ...actual, regenerateOutputs: vi.fn().mockResolvedValue([]) };
});

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

const UNRESOLVABLE =
  '@tailwindcss/cli was installed but cannot be resolved. Try installing at the workspace root.';

describe('@tailwindcss/cli on demand (#2843)', () => {
  let savedStdinTTY: boolean | undefined;
  let savedStdoutTTY: boolean | undefined;

  beforeEach(() => {
    savedStdinTTY = process.stdin.isTTY;
    savedStdoutTTY = process.stdout.isTTY;
    resolveCalls.tailwindCli = 0;
    vi.mocked(updateDependencies).mockClear();
  });

  afterEach(() => {
    process.stdin.isTTY = savedStdinTTY as boolean;
    process.stdout.isTTY = savedStdoutTTY as boolean;
    setAgentMode(false);
  });

  function setTTY(interactive: boolean): void {
    const value = interactive ? true : (undefined as unknown as boolean);
    process.stdin.isTTY = value;
    process.stdout.isTTY = value;
  }

  it('rafters does not list @tailwindcss/cli as a dependency', () => {
    const raw: unknown = JSON.parse(
      readFileSync(join(import.meta.dirname, '../../package.json'), 'utf8'),
    );
    if (typeof raw !== 'object' || raw === null) throw new Error('package.json is not an object');
    const deps = (raw as Record<string, unknown>).dependencies;
    expect(typeof deps === 'object' && deps !== null && '@tailwindcss/cli' in deps).toBe(false);
  });

  it('with the compiled export off, neither checks for nor installs @tailwindcss/cli', async () => {
    setAgentMode(true);
    const cwd = process.cwd();
    await generateOutputs(
      cwd,
      getRaftersPaths(cwd),
      new TokenRegistry(),
      {
        tailwind: true,
        typescript: true,
        dtcg: false,
        compiled: false,
        documentation: false,
      },
      undefined,
    );

    expect(resolveCalls.tailwindCli).toBe(0);
    expect(updateDependencies).not.toHaveBeenCalled();
  });

  it('with --agent, installs @tailwindcss/cli without prompting', async () => {
    setAgentMode(true);
    const { confirm } = await import('@inquirer/prompts');
    vi.mocked(confirm).mockClear();

    await expect(ensureTailwindCli(process.cwd())).rejects.toThrow(UNRESOLVABLE);

    expect(confirm).not.toHaveBeenCalled();
    expect(updateDependencies).toHaveBeenCalledWith([], ['@tailwindcss/cli'], {
      cwd: process.cwd(),
    });
  });

  it('with the compiled export on and the CLI unresolvable after install, fails naming it', async () => {
    setTTY(true);
    const { confirm } = await import('@inquirer/prompts');
    vi.mocked(confirm).mockResolvedValue(true);
    const cwd = process.cwd();

    await expect(
      generateOutputs(
        cwd,
        getRaftersPaths(cwd),
        new TokenRegistry(),
        {
          tailwind: true,
          typescript: true,
          dtcg: false,
          compiled: true,
          documentation: false,
        },
        undefined,
      ),
    ).rejects.toThrow(UNRESOLVABLE);

    expect(updateDependencies).toHaveBeenCalledWith([], ['@tailwindcss/cli'], { cwd });
  });
});
