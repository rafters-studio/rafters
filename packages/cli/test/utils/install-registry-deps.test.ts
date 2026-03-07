/**
 * Tests for installRegistryDependencies utility
 *
 * Verifies dependency collection, filtering, deduplication, and installation
 * behavior when adding components via `rafters add`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registryFileFactory,
  registryFixtures,
  registryItemFactory,
} from '../fixtures/registry.js';

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
  let parseDependency: typeof import('../../src/utils/install-registry-deps.js').parseDependency;

  beforeEach(async () => {
    const mod = await import('../../src/utils/install-registry-deps.js');
    parseDependency = mod.parseDependency;
  });

  it.each([
    ['lodash@4.17.21', { name: 'lodash', version: '4.17.21' }],
    ['@radix-ui/react-dialog@2.1.0', { name: '@radix-ui/react-dialog', version: '2.1.0' }],
    ['lodash', { name: 'lodash', version: undefined }],
    ['@rafters/shared', { name: '@rafters/shared', version: undefined }],
    ['', { name: '', version: undefined }],
    ['   ', { name: '', version: undefined }],
  ] as const)('parses "%s"', (input, expected) => {
    expect(parseDependency(input)).toEqual(expected);
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

    const result = await installRegistryDependencies(
      [registryFixtures.dialogComponent()],
      '/fake/project',
    );

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

    const result = await installRegistryDependencies(
      [registryFixtures.dialogComponent()],
      '/fake/project',
    );

    expect(updateDependenciesMock).not.toHaveBeenCalled();
    expect(result.skipped).toContain('@radix-ui/react-dialog@2.1.0');
    expect(result.installed).toHaveLength(0);
  });

  it('skips @rafters/* workspace deps', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'test-component',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/test.tsx',
          content: 'export const Test = () => null;',
          dependencies: ['@rafters/shared@1.0.0', 'lodash@4.17.21'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project');

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

    const result = await installRegistryDependencies(
      [registryFixtures.dialogComponent()],
      '/fake/project',
      { dryRun: true },
    );

    expect(updateDependenciesMock).not.toHaveBeenCalled();
    expect(result.installed).toHaveLength(0);
  });

  it('handles install failure gracefully', async () => {
    mockPackageJson();
    updateDependenciesMock.mockRejectedValue(new Error('npm install failed'));

    const result = await installRegistryDependencies(
      [registryFixtures.dialogComponent()],
      '/fake/project',
    );

    expect(result.installed).toHaveLength(0);
    expect(result.failed).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('zero-dep items skip install entirely', async () => {
    mockPackageJson();

    const result = await installRegistryDependencies(
      [registryFixtures.cardComponent()],
      '/fake/project',
    );

    expect(updateDependenciesMock).not.toHaveBeenCalled();
    expect(result.installed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('deduplicates deps from multiple files', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'multi-file',
      type: 'ui',
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
    });

    const result = await installRegistryDependencies([item], '/fake/project');

    expect(result.installed).toHaveLength(3);
    expect(result.installed).toContain('@radix-ui/react-dialog@2.1.0');
    expect(result.installed).toContain('lodash@4.17.21');
    expect(result.installed).toContain('zod@3.23.0');
    expect(updateDependenciesMock).toHaveBeenCalledOnce();
  });

  it('warns when no package.json found', async () => {
    const enoent = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
    });
    readFileMock.mockRejectedValue(enoent);

    const result = await installRegistryDependencies(
      [registryFixtures.dialogComponent()],
      '/fake/project',
    );

    const { log: logMock } = await import('../../src/utils/ui.js');
    expect(vi.mocked(logMock)).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'add:deps:no-package-json' }),
    );
    expect(updateDependenciesMock).toHaveBeenCalled();
    expect(result.installed).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('deduplicates deps across multiple registry items', async () => {
    mockPackageJson();

    const item1 = registryItemFactory.generate({
      name: 'comp-a',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/a.tsx',
          content: 'export const A = () => null;',
          dependencies: ['react@19.2.0', 'lodash@4.17.21'],
        }),
      ],
    });

    const item2 = registryItemFactory.generate({
      name: 'comp-b',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/b.tsx',
          content: 'export const B = () => null;',
          dependencies: ['react@19.2.0', 'zod@3.23.0'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item1, item2], '/fake/project');

    const reactCount = result.installed.filter((d) => d.startsWith('react@')).length;
    expect(reactCount).toBe(1);
    expect(result.installed).toHaveLength(3);
  });
});
