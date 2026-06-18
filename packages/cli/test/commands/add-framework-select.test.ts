import { describe, expect, it } from 'vitest';
import { selectCompositeFiles, selectFilesForFramework } from '../../src/commands/add.js';
import type { RegistryFile } from '../../src/registry/types.js';
import type { ComponentTarget } from '../../src/utils/detect.js';

function makeFile(path: string): RegistryFile {
  return { path, content: '', dependencies: [], devDependencies: [] };
}

describe('selectFilesForFramework', () => {
  const buttonFiles: RegistryFile[] = [
    makeFile('components/ui/button.tsx'),
    makeFile('components/ui/button.astro'),
    makeFile('components/ui/button.classes.ts'),
  ];

  it('selects .tsx files for react target', () => {
    const result = selectFilesForFramework(buttonFiles, 'react');
    expect(result.fallback).toBe(false);
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.tsx' }),
    );
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.classes.ts' }),
    );
    expect(result.files).not.toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.astro' }),
    );
  });

  it('selects .astro files for astro target', () => {
    const result = selectFilesForFramework(buttonFiles, 'astro');
    expect(result.fallback).toBe(false);
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.astro' }),
    );
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.classes.ts' }),
    );
    expect(result.files).not.toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.tsx' }),
    );
  });

  it('falls back to .tsx when target extension not available', () => {
    const dialogFiles: RegistryFile[] = [makeFile('components/ui/dialog.tsx')];
    const result = selectFilesForFramework(dialogFiles, 'astro');
    expect(result.fallback).toBe(true);
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/dialog.tsx' }),
    );
  });

  it('does not set fallback when react target has .tsx', () => {
    const dialogFiles: RegistryFile[] = [makeFile('components/ui/dialog.tsx')];
    const result = selectFilesForFramework(dialogFiles, 'react');
    expect(result.fallback).toBe(false);
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/dialog.tsx' }),
    );
  });

  it('always includes shared .classes.ts files', () => {
    const result = selectFilesForFramework(buttonFiles, 'astro');
    const paths = result.files.map((f) => f.path);
    expect(paths).toContain('components/ui/button.classes.ts');
  });

  it('handles vue target with fallback', () => {
    const result = selectFilesForFramework(buttonFiles, 'vue');
    expect(result.fallback).toBe(true);
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.tsx' }),
    );
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: 'components/ui/button.classes.ts' }),
    );
  });

  it('returns all files when nothing matches and target is react', () => {
    const oddFiles: RegistryFile[] = [makeFile('components/ui/widget.svelte')];
    const result = selectFilesForFramework(oddFiles, 'react');
    expect(result.fallback).toBe(false);
    expect(result.files).toEqual(oddFiles);
  });

  it('handles items with only shared files gracefully', () => {
    const sharedOnly: RegistryFile[] = [makeFile('components/ui/button.classes.ts')];
    const result = selectFilesForFramework(sharedOnly, 'react');
    expect(result.files).toHaveLength(1);
  });
});

describe('selectCompositeFiles', () => {
  // Mirrors the composites runtime item the registry emits via
  // loadCompositesRuntime: framework-agnostic runtime files plus the
  // Astro render engine at lib/composites/Composite.astro.
  const runtimeFiles: RegistryFile[] = [
    makeFile('lib/composites/manifest.ts'),
    makeFile('lib/composites/walk-blocks.ts'),
    makeFile('lib/composites/resolve-block.ts'),
    makeFile('lib/composites/discovery.ts'),
    makeFile('lib/composites/discovery-vite.ts'),
    makeFile('lib/composites/to-jsx.tsx'),
    makeFile('lib/composites/to-mdx.ts'),
    makeFile('lib/composites/bridge.ts'),
    makeFile('lib/composites/registry.ts'),
    makeFile('lib/composites/rules.ts'),
    makeFile('lib/composites/Composite.astro'),
  ];

  const paths = (files: RegistryFile[]): string[] => files.map((f) => f.path);

  it('installs Composite.astro for the astro target', () => {
    expect(paths(selectCompositeFiles(runtimeFiles, 'astro'))).toContain(
      'lib/composites/Composite.astro',
    );
  });

  const nonAstro: ComponentTarget[] = ['react', 'vue', 'svelte', 'wc'];
  for (const target of nonAstro) {
    it(`drops Composite.astro for the ${target} target`, () => {
      expect(paths(selectCompositeFiles(runtimeFiles, target))).not.toContain(
        'lib/composites/Composite.astro',
      );
    });
  }

  it('always installs the framework-agnostic runtime files', () => {
    for (const target of ['astro', 'react'] as ComponentTarget[]) {
      const result = paths(selectCompositeFiles(runtimeFiles, target));
      expect(result).toContain('lib/composites/manifest.ts');
      expect(result).toContain('lib/composites/resolve-block.ts');
      expect(result).toContain('lib/composites/discovery-vite.ts');
      expect(result).toContain('lib/composites/registry.ts');
    }
  });

  it('keeps non-astro runtime file count stable while only gating Composite.astro', () => {
    const astro = selectCompositeFiles(runtimeFiles, 'astro');
    const react = selectCompositeFiles(runtimeFiles, 'react');
    expect(astro).toHaveLength(runtimeFiles.length);
    expect(react).toHaveLength(runtimeFiles.length - 1);
  });
});
