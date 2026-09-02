/**
 * Tests for installRegistryDependencies utility
 *
 * Verifies dependency collection, filtering, deduplication, and installation
 * behavior when adding components via `rafters add`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VERSION } from '../../src/version.js';
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
  let PlaceholderDependencyError: typeof import('../../src/utils/install-registry-deps.js').PlaceholderDependencyError;
  let readFileMock: ReturnType<typeof vi.fn>;
  let updateDependenciesMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const fsMod = await import('node:fs/promises');
    readFileMock = vi.mocked(fsMod.readFile);

    const updateMod = await import('../../src/utils/update-dependencies.js');
    updateDependenciesMock = vi.mocked(updateMod.updateDependencies);
    updateDependenciesMock.mockResolvedValue(undefined);

    const mod = await import('../../src/utils/install-registry-deps.js');
    installRegistryDependencies = mod.installRegistryDependencies;
    PlaceholderDependencyError = mod.PlaceholderDependencyError;
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

  it('installs @rafters/* published deps instead of skipping them', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'test-component',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/test.tsx',
          content: 'export const Test = () => null;',
          dependencies: ['@rafters/color-utils@0.1.0', 'lodash@4.17.21'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project');

    expect(result.installed).toContain(`@rafters/color-utils@${VERSION}`);
    expect(result.installed).toContain('lodash@4.17.21');
    expect(result.skipped).toHaveLength(0);
    expect(updateDependenciesMock).toHaveBeenCalledWith(
      [`@rafters/color-utils@${VERSION}`, 'lodash@4.17.21'],
      [],
      expect.objectContaining({ cwd: '/fake/project' }),
    );
  });

  it('pins @rafters/* dependencies to the CLI version', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'test-component',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/test.tsx',
          content: 'export const Test = () => null;',
          dependencies: [
            '@rafters/color-utils',
            '@rafters/shared',
            '@rafters/math-utils',
            'zod@^4.0.0',
          ],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project');

    expect(result.installed).toContain(`@rafters/color-utils@${VERSION}`);
    expect(result.installed).toContain(`@rafters/shared@${VERSION}`);
    expect(result.installed).toContain(`@rafters/math-utils@${VERSION}`);
    expect(result.installed).toContain('zod@^4.0.0');
    expect(result.installed).not.toContain('@rafters/color-utils');
  });

  it('replaces a registry-declared @rafters/* version with the CLI version', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'test-component',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/test.tsx',
          content: 'export const Test = () => null;',
          dependencies: ['@rafters/shared@0.0.1'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project');

    expect(result.installed).toEqual([`@rafters/shared@${VERSION}`]);
    expect(updateDependenciesMock).toHaveBeenCalledWith(
      [`@rafters/shared@${VERSION}`],
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

  it('drops React-family runtime deps when target is not React', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'slot',
      type: 'primitive',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'lib/primitives/slot.ts',
          content: 'export const slot = () => null;',
          dependencies: ['react@19.2.0', '@types/react@19.2.0', 'lodash@4.17.21'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project', {
      target: 'astro',
    });

    expect(result.installed).toEqual(['lodash@4.17.21']);
    expect(result.skipped).toContain('react@19.2.0');
    expect(result.skipped).toContain('@types/react@19.2.0');
    expect(updateDependenciesMock).toHaveBeenCalledWith(
      ['lodash@4.17.21'],
      [],
      expect.objectContaining({ cwd: '/fake/project' }),
    );
  });

  it('keeps React-family deps when target is React', async () => {
    mockPackageJson();

    const item = registryItemFactory.generate({
      name: 'slot',
      type: 'primitive',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'lib/primitives/slot.ts',
          content: 'export const slot = () => null;',
          dependencies: ['react@19.2.0', 'lodash@4.17.21'],
        }),
      ],
    });

    const result = await installRegistryDependencies([item], '/fake/project', {
      target: 'react',
    });

    expect(result.installed).toContain('react@19.2.0');
    expect(result.installed).toContain('lodash@4.17.21');
  });

  describe('placeholder dependency refusal (#2219)', () => {
    it.each(['none', 'n/a', 'None', ''])(
      'refuses to install "%s" and names the item and the bad entry',
      async (placeholder) => {
        mockPackageJson();

        const item = registryItemFactory.generate({
          name: 'cursor-tracker',
          type: 'primitive',
          primitives: [],
          files: [
            registryFileFactory.generate({
              path: 'lib/primitives/cursor-tracker.ts',
              content: 'export const trackCursor = () => null;',
              dependencies: [placeholder],
            }),
          ],
        });

        const attempt = installRegistryDependencies([item], '/fake/project');
        await expect(attempt).rejects.toThrow(PlaceholderDependencyError);
        await expect(attempt).rejects.toThrow(/cursor-tracker/);
        expect(updateDependenciesMock).not.toHaveBeenCalled();
      },
    );

    it('refuses the whole install when only one item among several is broken', async () => {
      mockPackageJson();

      const good = registryItemFactory.generate({
        name: 'block-handler',
        type: 'primitive',
        primitives: [],
        files: [
          registryFileFactory.generate({
            path: 'lib/primitives/block-handler.ts',
            content: 'export const handleBlock = () => null;',
            dependencies: ['nanostores@0.11.0'],
          }),
        ],
      });
      const broken = registryItemFactory.generate({
        name: 'serializer-text',
        type: 'primitive',
        primitives: [],
        files: [
          registryFileFactory.generate({
            path: 'lib/primitives/serializer-text.ts',
            content: 'export const serialize = () => null;',
            dependencies: ['none'],
          }),
        ],
      });

      await expect(installRegistryDependencies([good, broken], '/fake/project')).rejects.toThrow(
        /serializer-text/,
      );
      expect(updateDependenciesMock).not.toHaveBeenCalled();
    });

    it('installs a valid dependency list unaffected by the placeholder guard', async () => {
      mockPackageJson();

      const item = registryItemFactory.generate({
        name: 'document-editor',
        type: 'primitive',
        primitives: [],
        files: [
          registryFileFactory.generate({
            path: 'lib/primitives/document-editor.ts',
            content: 'export const DocumentEditor = () => null;',
            dependencies: ['nanostores@0.11.0'],
          }),
        ],
      });

      const result = await installRegistryDependencies([item], '/fake/project');

      expect(result.installed).toContain('nanostores@0.11.0');
      expect(updateDependenciesMock).toHaveBeenCalledWith(
        ['nanostores@0.11.0'],
        [],
        expect.objectContaining({ cwd: '/fake/project' }),
      );
    });
  });
});
