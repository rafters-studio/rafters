import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { regenerateAfterInstall } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/config/rafters-config.js';
import { init } from '../../src/commands/init.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

const SANS = '@fontsource-variable/noto-sans';

describe('regenerateAfterInstall -- fonts.imports (#2754)', () => {
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

  it('writes the configured font imports atop rafters.css', async () => {
    config.fonts = { path: null, imports: [SANS] };
    await regenerateAfterInstall(projectDir, config);
    const css = readFileSync(join(projectDir, '.rafters', 'output', 'rafters.css'), 'utf8');
    expect(css.startsWith(`@import "${SANS}";\n@import "tailwindcss";`)).toBe(true);
  }, 60000);
});
