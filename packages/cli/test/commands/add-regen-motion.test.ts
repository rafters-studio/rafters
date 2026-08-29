import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { regenerateAfterInstall } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/config/rafters-config.js';
import { init } from '../../src/commands/init.js';
import { setAgentMode } from '../../src/utils/ui.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { findToken, readNamespaceTokens, seedStaleMotion } from '../fixtures/stale-motion.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

/**
 * The `add` face of #2208 (filed separately as #2200). `regenerateAfterInstall`
 * reloaded the stored tokens and handed them to the exporter, so every
 * `rafters add` in a pre-0.3.0 project ended in `add:regen-failed` with the
 * same `unrecognized duration.kind null` the rebuild hit.
 *
 * One `init` for the whole file: the fixture is expensive and every case here
 * starts from the same initialized project.
 */
describe('regenerateAfterInstall -- stale motion (#2208)', () => {
  let projectDir = '';
  let originalCwd = '';
  let config: RaftersConfig;

  beforeAll(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
    await init({ agent: true });
    config = JSON.parse(
      readFileSync(join(projectDir, '.rafters', 'config.rafters.json'), 'utf8'),
    ) as RaftersConfig;
  }, 60000);

  afterAll(async () => {
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  function outputFile(name: string): string {
    return join(projectDir, '.rafters', 'output', name);
  }

  it('regenerates motion and the output sheet instead of failing the regen', async () => {
    seedStaleMotion(projectDir);
    rmSync(outputFile('rafters.css'), { force: true });

    // Agent mode makes `log` emit one JSON line per event on stdout, which is
    // the only seam this path has.
    setAgentMode(true);
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {});
    let events: string[] = [];
    try {
      await regenerateAfterInstall(projectDir, config);
      // Read the calls BEFORE restoring: `mockRestore` clears them, and an
      // assertion over a cleared list is green whatever happened.
      events = logged.mock.calls.map(([line]) => String(line));
    } finally {
      logged.mockRestore();
    }

    expect(events.filter((line) => line.includes('add:regen-failed'))).toEqual([]);

    // The positive assertion is the load-bearing one: an absent failure event
    // is also what a path that silently returned would produce.
    expect(existsSync(outputFile('rafters.css'))).toBe(true);
    const css = readFileSync(outputFile('rafters.css'), 'utf8');
    expect(css).toContain('animate-dialog-content-open');

    const rebuilt = readNamespaceTokens(projectDir, 'motion');
    expect(rebuilt.map((t) => t.name)).not.toContain('motion-easing-ease-in');
    const cell = findToken(rebuilt, 'motion-cell-dialog-content-open');
    expect(cell?.value).toContain('"duration"');
    expect(cell?.value).not.toContain('durationTier');
  }, 60000);

  it('does nothing on a project with no stored tokens', async () => {
    const uninitialized = await createFixture('vite-no-shadcn');
    try {
      // No `.rafters` at all: regenerating motion here would manufacture a
      // motion-only system, and the write would throw on the absent directory.
      await expect(regenerateAfterInstall(uninitialized, config)).resolves.toBeUndefined();
      expect(existsSync(join(uninitialized, '.rafters'))).toBe(false);
    } finally {
      await cleanupFixture(uninitialized);
    }
  }, 60000);
});
