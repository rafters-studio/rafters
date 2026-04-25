/**
 * Integration tests for `rafters init`
 *
 * Tests the full initialization workflow against real fixture projects.
 * Each test creates a temporary project, runs `rafters init`, and verifies
 * the resulting .rafters/ directory structure, config, and outputs.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture, type FixtureType } from '../fixtures/projects.js';
import { execCli, fixtureFileExists, readConfig, readFixtureFile } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

describe('rafters init - fresh initialization', () => {
  it('initializes a Next.js project with shadcn', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);
    expect(fixtureFileExists(fixturePath, '.rafters/config.rafters.json')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/tokens')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.ts')).toBe(true);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('next');
    expect(config.shadcn).toBe(true);
    expect(config.componentsPath).toBe('components/ui');
    expect(config.primitivesPath).toBe('lib/primitives');
    expect(config.exports).toEqual({
      tailwind: true,
      typescript: true,
      dtcg: false,
      compiled: false,
    });
    expect(config.installed).toEqual({
      components: [],
      primitives: [],
      composites: [],
      rules: [],
    });
  }, 30000);

  it('initializes a Vite project with shadcn', async () => {
    fixturePath = await createFixture('vite-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('vite');
    expect(config.shadcn).toBe(true);
    expect(config.componentsPath).toBe('src/components/ui');
  }, 30000);

  it('initializes a Vite project without shadcn', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('vite');
    expect(config.shadcn).toBe(false);
  }, 30000);

  it('initializes a Remix project with shadcn', async () => {
    fixturePath = await createFixture('remix-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('remix');
    expect(config.componentsPath).toBe('app/components/ui');
  }, 30000);

  it('initializes an Astro project with shadcn', async () => {
    fixturePath = await createFixture('astro-shadcn-v4');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).toBe(0);

    const config = await readConfig(fixturePath);
    expect(config.framework).toBe('astro');
    expect(config.componentsPath).toBe('src/components/ui');
  }, 30000);

  it('rejects Tailwind v3 projects', async () => {
    fixturePath = await createFixture('tailwind-v3-error');
    const result = await execCli(fixturePath, ['init']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Tailwind v3');
  }, 30000);

  it('generates token namespace files', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    const tokensDir = join(fixturePath, '.rafters', 'tokens');
    const files = readdirSync(tokensDir);

    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('.rafters.json'))).toBe(true);
  }, 30000);

  it('generates valid Tailwind CSS output', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const css = await readFixtureFile(fixturePath, '.rafters/output/rafters.css');
    expect(css).toContain('@import "tailwindcss"');
    expect(css).toContain('--');
  }, 30000);

  it('generates valid TypeScript output', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const ts = await readFixtureFile(fixturePath, '.rafters/output/rafters.ts');
    expect(ts).toContain('export');
  }, 30000);

  it('updates main CSS file with rafters import for non-shadcn projects', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    const css = await readFixtureFile(fixturePath, 'src/index.css');
    expect(css).toContain('.rafters/output/rafters.css');
    // Original tailwindcss import should be replaced
    expect(css).not.toContain('@import "tailwindcss"');
  }, 30000);

  it('creates CSS backup when modifying main CSS', async () => {
    fixturePath = await createFixture('vite-no-shadcn');
    await execCli(fixturePath, ['init']);

    expect(fixtureFileExists(fixturePath, 'src/index.backup.css')).toBe(true);
  }, 30000);

  it('fails on second init without --rebuild flag', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    const result = await execCli(fixturePath, ['init']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('already exists');
  }, 30000);
});

describe('rafters init --rebuild', () => {
  it('regenerates outputs from existing tokens', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Verify initial outputs exist
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);

    // Rebuild
    const result = await execCli(fixturePath, ['init', '--rebuild']);
    expect(result.exitCode).toBe(0);

    // Outputs should still exist
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.css')).toBe(true);
    expect(fixtureFileExists(fixturePath, '.rafters/output/rafters.ts')).toBe(true);
  }, 30000);

  it('preserves existing config and installed components', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Read initial config
    const initialConfig = await readConfig(fixturePath);

    // Rebuild
    await execCli(fixturePath, ['init', '--rebuild']);

    // Config should be preserved
    const rebuiltConfig = await readConfig(fixturePath);
    expect(rebuiltConfig.framework).toBe(initialConfig.framework);
    expect(rebuiltConfig.shadcn).toBe(initialConfig.shadcn);
  }, 30000);
});

describe('rafters init --reset', () => {
  it('replaces tokens with defaults', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Get initial token count
    const tokensDir = join(fixturePath, '.rafters', 'tokens');
    const _initialFiles = readdirSync(tokensDir);

    // Reset
    const result = await execCli(fixturePath, ['init', '--reset']);
    expect(result.exitCode).toBe(0);

    // Tokens should exist (regenerated from defaults)
    const resetFiles = readdirSync(tokensDir);
    expect(resetFiles.length).toBeGreaterThan(0);
  }, 30000);

  it('fails when .rafters does not exist', async () => {
    fixturePath = await createFixture('nextjs-no-shadcn');
    const result = await execCli(fixturePath, ['init', '--reset']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Nothing to reset');
  }, 30000);
});

describe('rafters init - framework detection across all types', () => {
  const frameworkTests: Array<{ fixture: FixtureType; expected: string }> = [
    { fixture: 'nextjs-shadcn-v4', expected: 'next' },
    { fixture: 'nextjs-no-shadcn', expected: 'next' },
    { fixture: 'vite-shadcn-v4', expected: 'vite' },
    { fixture: 'vite-no-shadcn', expected: 'vite' },
    { fixture: 'remix-shadcn-v4', expected: 'remix' },
    { fixture: 'astro-shadcn-v4', expected: 'astro' },
  ];

  for (const { fixture, expected } of frameworkTests) {
    it(`detects ${expected} from ${fixture}`, async () => {
      fixturePath = await createFixture(fixture);
      await execCli(fixturePath, ['init']);

      const config = await readConfig(fixturePath);
      expect(config.framework).toBe(expected);
    }, 30000);
  }
});
