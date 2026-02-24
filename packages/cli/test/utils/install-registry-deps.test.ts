/**
 * Tests for installRegistryDependencies utility
 *
 * Verifies dependency collection, filtering, deduplication, and installation
 * behavior when adding components via `rafters add`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistryItem } from '../../src/registry/types.js';
import { registryFileFactory, registryFixtures } from '../fixtures/registry.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

// Suppress log output in tests
vi.mock('../../src/utils/ui.js', () => ({
  log: vi.fn(),
  error: vi.fn(),
  setAgentMode: vi.fn(),
}));

describe('parseDependency', () => {
  // Import after mocks are set up
  let parseDependency: typeof import('../../src/utils/install-registry-deps.js').parseDependency;

  beforeEach(async () => {
    const mod = await import('../../src/utils/install-registry-deps.js');
    parseDependency = mod.parseDependency;
  });

  it('parses unscoped package with version', () => {
    const result = parseDependency('lodash@4.17.21');
    expect(result).toEqual({ name: 'lodash', version: '4.17.21' });
  });

  it('parses scoped package with version', () => {
    const result = parseDependency('@radix-ui/react-dialog@2.1.0');
    expect(result).toEqual({ name: '@radix-ui/react-dialog', version: '2.1.0' });
  });

  it('parses unscoped package without version', () => {
    const result = parseDependency('lodash');
    expect(result).toEqual({ name: 'lodash', version: undefined });
  });

  it('parses scoped package without version', () => {
    const result = parseDependency('@rafters/shared');
    expect(result).toEqual({ name: '@rafters/shared', version: undefined });
  });

  it('handles empty string input', () => {
    const result = parseDependency('');
    expect(result).toEqual({ name: '', version: undefined });
  });

  it('handles whitespace-only input', () => {
    const result = parseDependency('   ');
    expect(result).toEqual({ name: '', version: undefined });
  });
});

describe('installRegistryDependencies', () => {
  let installRegistryDependencies: typeof import('../../src/utils/install-registry-deps.js').installRegistryDependencies;
  let readFileMock: ReturnType<typeof vi.fn>;
  let updateDependenciesMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const fsMod = await import('node:fs/promises');
    readFileMock = vi.mocked(fsMod.readFile);

    const updateMod = await import('../../src/utils/update-dependencies.js');
    updateDependenciesMock = vi.mocked(updateMod.updateDependencies);

    const mod = await import('../../src/utils/install-registry-deps.js');
    installRegistryDependencies = mod.installRegistryDependencies;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to set up a fake consumer package.json
   */
  function mockPackageJson(deps: Record<string, string> = {}): void {
    readFileMock.mockResolvedValue(
      JSON.stringify({
        name: 'consumer-app',
        dependencies: deps,
      }),
    );
  }

  it('installs deps from registry item', async () => {
    mockPackageJson();

    const dialog = registryFixtures.dialogComponent();
    const result = await installRegistryDependencies([dialog], '/fake/project');

    expect(updateDependenciesMock).toHaveBeenCalledOnce();
    expect(updateDependenciesMock).toHaveBeenCalledWith(
      ['@radix-ui/react-dialog@2.1.0'],
      [],
      expect.objectContaining({ cwd: '/fake/project' }),
    );
    expect(result.installed).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('skips already-installed deps', async () => {
    mockPackageJson({ '@radix-ui/react-dialog': '2.1.0' });

    const dialog = registryFixtures.dialogComponent();
    const result = await installRegistryDependencies([dialog], '/fake/project');

    // Should not call updateDependencies since dep is already installed
    expect(updateDependenciesMock).not.toHaveBeenCalled();
    expect(result.skipped).toContain('@radix-ui/react-dialog@2.1.0');
    expect(result.installed).toHaveLength(0);
  });

  it('skips @rafters/* workspace deps', async () => {
    mockPackageJson();

    const item: RegistryItem = {
      name: 'test-component',
      type: 'registry:ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/test.tsx',
          content: 'export const Test = () => null;',
          dependencies: ['@rafters/shared@1.0.0', 'lodash@4.17.21'],
        }),
      ],
    };

    const result = await installRegistryDependencies([item], '/fake/project');

    // @rafters/shared should be skipped, lodash should be installed
    expect(result.skipped).toContain('@rafters/shared@1.0.0');
    expect(result.installed).toContain('lodash@4.17.21');
    expect(updateDependenciesMock).toHaveBeenCalledWith(
      ['lodash@4.17.21'],
      [],
      expect.objectContaining({ cwd: '/fake/project' }),
    );
  });

  it('dry run logs but does not install', async () => {
    mockPackageJson();

    const dialog = registryFixtures.dialogComponent();
    const result = await installRegistryDependencies([dialog], '/fake/project', {
      dryRun: true,
    });

    expect(updateDependenciesMock).not.toHaveBeenCalled();
    // Nothing was actually installed, so installed should be empty
    expect(result.installed).toHaveLength(0);
  });

  it('handles install failure gracefully', async () => {
    mockPackageJson();
    updateDependenciesMock.mockRejectedValue(new Error('npm install failed'));

    const dialog = registryFixtures.dialogComponent();
    // Should NOT throw
    const result = await installRegistryDependencies([dialog], '/fake/project');

    // Install was attempted but failed, so installed array should be empty
    expect(result.installed).toHaveLength(0);
    // Failed deps should be populated
    expect(result.failed).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('zero-dep items skip install entirely', async () => {
    mockPackageJson();

    const card = registryFixtures.cardComponent(); // has no deps
    const result = await installRegistryDependencies([card], '/fake/project');

    expect(updateDependenciesMock).not.toHaveBeenCalled();
    expect(result.installed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('deduplicates deps from multiple files', async () => {
    mockPackageJson();

    const item: RegistryItem = {
      name: 'multi-file',
      type: 'registry:ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/part-a.tsx',
          content: 'export const A = () => null;',
          dependencies: ['@radix-ui/react-dialog@2.1.0', 'lodash@4.17.21'],
        }),
        registryFileFactory.generate({
          path: 'components/ui/part-b.tsx',
          content: 'export const B = () => null;',
          dependencies: ['@radix-ui/react-dialog@2.1.0', 'zod@3.23.0'],
        }),
      ],
    };

    const result = await installRegistryDependencies([item], '/fake/project');

    // Should install 3 unique deps, not 4
    expect(result.installed).toHaveLength(3);
    expect(result.installed).toContain('@radix-ui/react-dialog@2.1.0');
    expect(result.installed).toContain('lodash@4.17.21');
    expect(result.installed).toContain('zod@3.23.0');

    // updateDependencies should be called once with all 3
    expect(updateDependenciesMock).toHaveBeenCalledOnce();
    const calledDeps = updateDependenciesMock.mock.calls[0][0] as string[];
    expect(calledDeps).toHaveLength(3);
  });

  it('warns when no package.json found', async () => {
    const enoent = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
    });
    readFileMock.mockRejectedValue(enoent);

    const dialog = registryFixtures.dialogComponent();

    // Should still attempt install (pm may create package.json)
    const result = await installRegistryDependencies([dialog], '/fake/project');

    // Verify the log utility was called with the no-package-json event
    const { log: logMock } = await import('../../src/utils/ui.js');
    expect(vi.mocked(logMock)).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'add:deps:no-package-json' }),
    );

    // Should still have attempted to install
    expect(updateDependenciesMock).toHaveBeenCalled();
    expect(result.installed).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('deduplicates deps across multiple registry items', async () => {
    mockPackageJson();

    const item1: RegistryItem = {
      name: 'comp-a',
      type: 'registry:ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/a.tsx',
          content: 'export const A = () => null;',
          dependencies: ['react@19.2.0', 'lodash@4.17.21'],
        }),
      ],
    };

    const item2: RegistryItem = {
      name: 'comp-b',
      type: 'registry:ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/b.tsx',
          content: 'export const B = () => null;',
          dependencies: ['react@19.2.0', 'zod@3.23.0'],
        }),
      ],
    };

    const result = await installRegistryDependencies([item1, item2], '/fake/project');

    // react should appear only once
    const reactCount = result.installed.filter((d) => d.startsWith('react@')).length;
    expect(reactCount).toBe(1);
    expect(result.installed).toHaveLength(3);
  });
});
