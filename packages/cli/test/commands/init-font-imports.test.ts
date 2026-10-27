import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateBaseSystem, REGISTRY_PLUGINS, TokenRegistry } from '@rafters/design-tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateOutputs, init } from '../../src/commands/init.js';
import { getRaftersPaths } from '../../src/utils/paths.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

const SANS = '@fontsource-variable/noto-sans';

describe('generateOutputs -- fontImports (#2754)', () => {
  let cwd = '';

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'rafters-init-fonts-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  it('writes the given font imports atop rafters.css', async () => {
    const paths = getRaftersPaths(cwd);
    const registry = new TokenRegistry(generateBaseSystem({}).allTokens, REGISTRY_PLUGINS);
    const exports = {
      tailwind: true,
      typescript: false,
      dtcg: false,
      compiled: false,
      documentation: false,
    };
    await generateOutputs(cwd, paths, registry, exports, undefined, 'class', null, [SANS]);
    const css = readFileSync(join(paths.output, 'rafters.css'), 'utf8');
    expect(css.startsWith(`@import "${SANS}";\n@import "tailwindcss";\n`)).toBe(true);
  }, 60000);
});

describe('init --scripts -- fontImports (#2754)', () => {
  let projectDir = '';
  let originalCwd = '';

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
  });

  it('starts rafters.css with exactly the fonts.imports entries, in order', async () => {
    await init({ agent: true, scripts: 'Latn,Arab' });
    const config = JSON.parse(
      readFileSync(join(projectDir, '.rafters', 'config.rafters.json'), 'utf8'),
    ) as { fonts: { imports: string[] } };
    expect(config.fonts.imports).toEqual([SANS, '@fontsource-variable/noto-sans-arabic']);
    const css = readFileSync(join(projectDir, '.rafters', 'output', 'rafters.css'), 'utf8');
    const lines = config.fonts.imports.map((entry) => `@import "${entry}";`);
    expect(css.startsWith(`${lines.join('\n')}\n@import "tailwindcss";\n`)).toBe(true);
  }, 60000);
});
