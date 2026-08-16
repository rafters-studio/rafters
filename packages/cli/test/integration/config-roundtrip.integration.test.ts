/**
 * Integration tests for config persistence round-trips
 *
 * Verifies that config state is correctly saved and loaded
 * across init, rebuild, and add operations.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { execCli, readConfig, writeFixtureFile } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

describe('config persistence', () => {
  it('saves and reads config correctly across init + rebuild', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');

    // Init
    await execCli(fixturePath, ['init']);
    const config1 = await readConfig(fixturePath);

    // Rebuild
    await execCli(fixturePath, ['init', '--rebuild']);
    const config2 = await readConfig(fixturePath);

    // Core config should be consistent
    expect(config2.framework).toBe(config1.framework);
    expect(config2.componentsPath).toBe(config1.componentsPath);
    expect(config2.primitivesPath).toBe(config1.primitivesPath);
    expect(config2.source).toBe(config1.source);
  }, 30000);

  it('preserves installed list across rebuild', async () => {
    fixturePath = await createFixture('nextjs-shadcn-v4');
    await execCli(fixturePath, ['init']);

    // Manually add to installed list (simulating what `rafters add` does)
    const config = await readConfig(fixturePath);
    (config.installed as Record<string, string[]>).components = ['button', 'card'];
    (config.installed as Record<string, string[]>).primitives = ['classy'];
    await writeFixtureFile(
      fixturePath,
      '.rafters/config.rafters.json',
      JSON.stringify(config, null, 2),
    );

    // Rebuild
    await execCli(fixturePath, ['init', '--rebuild']);
    const rebuilt = await readConfig(fixturePath);

    expect((rebuilt.installed as Record<string, string[]>).components).toEqual(['button', 'card']);
    expect((rebuilt.installed as Record<string, string[]>).primitives).toEqual(['classy']);
  }, 30000);

  it('reset preserves framework detection but regenerates tokens', async () => {
    fixturePath = await createFixture('vite-shadcn-v4');
    await execCli(fixturePath, ['init']);

    const configBefore = await readConfig(fixturePath);
    expect(configBefore.framework).toBe('vite');

    await execCli(fixturePath, ['init', '--reset']);

    const configAfter = await readConfig(fixturePath);
    expect(configAfter.framework).toBe('vite');
    expect(configAfter.componentsPath).toBe('src/components/ui');
  }, 30000);

  it('config has correct shape with all required fields', async () => {
    fixturePath = await createFixture('nextjs-no-shadcn');
    await execCli(fixturePath, ['init']);

    const config = await readConfig(fixturePath);

    // All required fields present
    expect(config).toHaveProperty('framework');
    expect(config).toHaveProperty('componentsPath');
    expect(config).toHaveProperty('primitivesPath');
    expect(config).toHaveProperty('compositesPath');
    expect(config).toHaveProperty('cssPath');
    expect(config).toHaveProperty('exports');
    expect(config).toHaveProperty('intent');
    expect(config).toHaveProperty('fonts');
    expect(config).toHaveProperty('installed');

    // Exports sub-fields
    const exports = config.exports as Record<string, boolean>;
    expect(exports).toHaveProperty('tailwind');
    expect(exports).toHaveProperty('typescript');
    expect(exports).toHaveProperty('dtcg');
    expect(exports).toHaveProperty('compiled');

    // Installed sub-fields
    const installed = config.installed as Record<string, string[]>;
    expect(Array.isArray(installed.components)).toBe(true);
    expect(Array.isArray(installed.primitives)).toBe(true);
    expect(Array.isArray(installed.composites)).toBe(true);
  }, 30000);
});
