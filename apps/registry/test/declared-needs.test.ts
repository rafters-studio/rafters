/**
 * Each served file declares what it needs in its JSDoc (#2900), and the
 * registry serves those declarations per file. The tags are checked against the
 * file's own imports here so a new import without its tag fails the build.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  extractDepsFromSource,
  extractNeedsFromSource,
  listComponentNames,
  loadComponent,
  loadPrimitive,
  loadSubstrate,
  type RegistryItem,
} from '../src/lib/registry/componentService';

const repoRoot = join(process.cwd(), '../..');
const uiSrc = join(repoRoot, 'packages/ui/src');

const SPECIFIER =
  /(?:import|export)\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?['"]([^'"]+)['"]/g;

type Kind = 'dependencies' | 'components' | 'primitives' | 'hooks' | 'lib';

/** What a file's imports say it needs, by tag kind. */
function importedNeeds(file: string, content: string): Record<Kind, string[]> {
  const found: Record<Kind, Set<string>> = {
    dependencies: new Set(),
    components: new Set(),
    primitives: new Set(),
    hooks: new Set(),
    lib: new Set(),
  };
  const own = relative(uiSrc, file).split(sep);
  const ownComponent = own[0] === 'components' ? own[1] : undefined;
  for (const match of content.matchAll(SPECIFIER)) {
    const spec = match[1];
    if (spec.startsWith('.')) {
      const target = relative(uiSrc, resolve(dirname(file), spec)).split(sep);
      const name = (target.at(-1) ?? '').replace(/\.(tsx?|jsx?|astro)$/, '');
      const [kind, dir] = target;
      if (kind === 'primitives' || kind === 'hooks' || kind === 'lib') found[kind].add(name);
      else if (kind === 'components' && dir !== undefined && dir !== ownComponent)
        found.components.add(dir);
      else if (kind !== 'components') throw new Error(`${file}: unmapped import ${spec}`);
      continue;
    }
    if (spec.startsWith('node:') || spec.startsWith('@rafters/') || spec.startsWith('astro:'))
      continue;
    const parts = spec.split('/');
    found.dependencies.add(spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
  }
  return {
    dependencies: [...found.dependencies].sort(),
    components: [...found.components].sort(),
    primitives: [...found.primitives].sort(),
    hooks: [...found.hooks].sort(),
    lib: [...found.lib].sort(),
  };
}

/** What a file's JSDoc declares, by tag kind; npm versions are dropped. */
function declaredNeeds(content: string): Record<Kind, string[]> {
  return {
    dependencies: extractDepsFromSource(content)
      .dependencies.map((dep) => dep.replace(/(.)@.*$/, '$1'))
      .sort(),
    components: tagValues(content, 'components'),
    primitives: tagValues(content, 'primitives'),
    hooks: tagValues(content, 'hooks'),
    lib: tagValues(content, 'lib'),
  };
}

function tagValues(content: string, tag: string): string[] {
  const values = new Set<string>();
  for (const match of content.matchAll(new RegExp(`^\\s*\\*\\s*@${tag}[ \\t]+([^\\n]*)$`, 'gm'))) {
    for (const name of match[1].split(/\s+/)) if (name) values.add(name);
  }
  return [...values].sort();
}

const servedFiles = execFileSync('git', ['ls-files', 'packages/ui/src'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => /\.(ts|tsx|astro)$/.test(f))
  .filter((f) => !/\.test\.|\.spec\.|\.d\.ts$|(^|\/)index\.ts$|\/__tests__\//.test(f));

describe('every ui file declares what it imports (#2900)', () => {
  it('finds the files', () => {
    expect(servedFiles.length).toBeGreaterThan(300);
  });

  it.each(servedFiles)('%s', (path) => {
    const file = join(repoRoot, path);
    const content = readFileSync(file, 'utf8');
    expect(declaredNeeds(content)).toEqual(importedNeeds(file, content));
  });
});

describe('extractNeedsFromSource', () => {
  it('reads every name from the four need tags', () => {
    const source = [
      '/**',
      ' * A file.',
      ' *',
      ' * @dependencies react',
      ' * @components sheet',
      ' * @primitives slot classy',
      ' * @hooks use-memory',
      ' * @lib contract',
      ' */',
    ].join('\n');
    expect(extractNeedsFromSource(source)).toEqual([
      'classy',
      'contract',
      'sheet',
      'slot',
      'use-memory',
    ]);
  });

  it('returns nothing for a file with no need tags', () => {
    expect(extractNeedsFromSource('/** Plain. */\nexport const x = 1;')).toEqual([]);
  });
});

describe('the registry serves each file its own declared needs (#2900)', () => {
  it('dialog.tsx declares slot and use-memory; dialog.astro declares neither', () => {
    const dialog = loadComponent('dialog');
    const byPath = new Map(dialog?.files.map((f) => [f.path, f]));
    const tsx = byPath.get('components/ui/dialog.tsx');
    const astro = byPath.get('components/ui/dialog.astro');
    expect(tsx?.registryDependencies).toEqual(expect.arrayContaining(['slot', 'use-memory']));
    expect(astro?.registryDependencies).not.toContain('slot');
    expect(astro?.registryDependencies).not.toContain('use-memory');
  });

  it('serves npm dependencies from @dependencies, versioned', () => {
    const tsx = loadComponent('dialog')?.files.find((f) => f.path.endsWith('dialog.tsx'));
    expect(tsx?.dependencies).toContain('react@19.2.0');
  });
});

/**
 * The files `rafters add` installs for the astro target (packages/cli
 * selectFilesForFramework): the `.astro` files, `.behavior.ts` and `.classes.ts`,
 * and subsystem `.ts` nested under the component.
 */
function astroFiles(item: RegistryItem): RegistryItem['files'] {
  const shared = item.files.filter(
    (f) =>
      !/\.(tsx|astro|vue|svelte)$/.test(f.path) &&
      (/\.(behavior|classes)\.ts$/.test(f.path) ||
        f.path.slice('components/ui/'.length).includes('/')),
  );
  return [...item.files.filter((f) => f.path.endsWith('.astro')), ...shared];
}

function loadAny(name: string): RegistryItem | null {
  return loadComponent(name) ?? loadPrimitive(name) ?? loadSubstrate(name);
}

describe('an astro install writes no file that imports react (#2900)', () => {
  it.each(listComponentNames())('%s', (name) => {
    const root = loadComponent(name);
    expect(root).not.toBeNull();
    if (!root) return;
    expect(
      root.files.some((f) => f.path.endsWith('.astro')),
      'serves an .astro file',
    ).toBe(true);

    const seen = new Set<string>([name]);
    const queue: RegistryItem[] = [root];
    for (let item = queue.pop(); item; item = queue.pop()) {
      const files = item.type === 'ui' ? astroFiles(item) : item.files;
      for (const file of files) {
        expect(file.content, `${item.name}: ${file.path}`).not.toMatch(/from\s+['"]react['"]/);
        for (const need of file.registryDependencies) {
          if (seen.has(need)) continue;
          seen.add(need);
          const dep = loadAny(need);
          expect(dep, `${file.path} needs ${need}`).not.toBeNull();
          if (dep) queue.push(dep);
        }
      }
    }
  });
});
