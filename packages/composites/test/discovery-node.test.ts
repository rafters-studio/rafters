import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverFromDirs, nodeFsAdapter } from '../src/discovery-node';

const tmpDir = join(import.meta.dirname, '__discovery-node__');

function writeComposite(relativePath: string, data: unknown): void {
  const full = join(tmpDir, relativePath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, JSON.stringify(data));
}

function composite(id: string, extra: Record<string, unknown> = {}): unknown {
  return {
    manifest: {
      id,
      name: id,
      category: 'typography',
      description: `${id} block`,
      keywords: [],
      cognitiveLoad: 1,
    },
    blocks: [{ id: '1', type: 'heading', content: 'Hello' }],
    ...extra,
  };
}

beforeEach(() => mkdirSync(tmpDir, { recursive: true }));
afterEach(() => rmSync(tmpDir, { recursive: true, force: true }));

describe('nodeFsAdapter', () => {
  it('walks a NESTED directory tree recursively', async () => {
    writeComposite('top.composite.json', composite('top'));
    writeComposite('a/nested.composite.json', composite('nested'));
    writeComposite('a/b/deep.composite.json', composite('deep'));

    const entries = await nodeFsAdapter(tmpDir)();
    const ids = entries.map((e) => JSON.parse(e.raw).manifest.id as string).sort();

    expect(ids).toEqual(['deep', 'nested', 'top']);
    expect(entries.every((e) => e.source.endsWith('.composite.json'))).toBe(true);
  });

  it('ignores non-composite files', async () => {
    writeComposite('valid.composite.json', composite('valid'));
    writeFileSync(join(tmpDir, 'readme.txt'), 'not a composite');
    writeFileSync(join(tmpDir, 'data.json'), '{}');

    const entries = await nodeFsAdapter(tmpDir)();
    expect(entries).toHaveLength(1);
  });

  it('returns nothing for a nonexistent directory', async () => {
    const entries = await nodeFsAdapter('/nonexistent/path/to/composites')();
    expect(entries).toHaveLength(0);
  });

  it('scans multiple directories in order', async () => {
    const dirA = join(tmpDir, 'dirA');
    const dirB = join(tmpDir, 'dirB');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    writeFileSync(join(dirA, 'one.composite.json'), JSON.stringify(composite('one')));
    writeFileSync(join(dirB, 'two.composite.json'), JSON.stringify(composite('two')));

    const entries = await nodeFsAdapter(dirA, dirB)();
    expect(entries).toHaveLength(2);
  });
});

describe('discoverFromDirs', () => {
  it('discovers and indexes a nested tree through the core', async () => {
    writeComposite('top.composite.json', composite('top'));
    writeComposite('a/b/deep.composite.json', composite('deep'));

    const { registry, errors } = await discoverFromDirs(tmpDir);
    expect(errors).toHaveLength(0);
    expect(registry.size).toBe(2);
    expect(registry.get('top')).toBeDefined();
    expect(registry.get('deep')).toBeDefined();
  });

  it('resolves nested composite:* references discovered across the tree', async () => {
    writeComposite('lib/child.composite.json', composite('child'));
    writeComposite(
      'parent.composite.json',
      composite('parent', {
        blocks: [
          { id: 'root', type: 'section', children: ['nested'] },
          { id: 'nested', type: 'composite:child', parentId: 'root' },
        ],
      }),
    );

    const { registry, errors } = await discoverFromDirs(tmpDir);
    expect(errors).toHaveLength(0);
    expect(registry.size).toBe(2);
  });

  it('reports schema failures from disk without throwing', async () => {
    writeComposite('good.composite.json', composite('good'));
    writeFileSync(join(tmpDir, 'bad.composite.json'), '{ invalid json }');

    const { registry, errors } = await discoverFromDirs(tmpDir);
    expect(registry.size).toBe(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toContain('bad.composite.json');
  });
});
