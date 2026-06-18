import { describe, expect, it } from 'vitest';
import { discoverComposites, type RawCompositeEntry } from '../src/discovery';

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

function entry(source: string, data: unknown): RawCompositeEntry {
  return { source, raw: JSON.stringify(data) };
}

describe('discoverComposites', () => {
  it('validates and indexes good entries by manifest id', () => {
    const { registry, errors } = discoverComposites([
      entry('a.composite.json', composite('heading')),
      entry('b.composite.json', composite('paragraph')),
    ]);

    expect(errors).toHaveLength(0);
    expect(registry.size).toBe(2);
    expect(registry.get('heading')?.manifest.id).toBe('heading');
    expect(registry.get('paragraph')?.manifest.id).toBe('paragraph');
  });

  it('applies schema defaults for input/output', () => {
    const { registry } = discoverComposites([entry('a.composite.json', composite('heading'))]);
    expect(registry.get('heading')?.input).toEqual([]);
    expect(registry.get('heading')?.output).toEqual([]);
  });

  it('reports invalid JSON without throwing', () => {
    const { registry, errors } = discoverComposites([
      { source: 'bad.composite.json', raw: '{ not json }' },
    ]);
    expect(registry.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('bad.composite.json');
    expect(errors[0].error).toContain('Invalid JSON');
  });

  it('reports schema validation failures', () => {
    const { registry, errors } = discoverComposites([
      { source: 'invalid.composite.json', raw: JSON.stringify({ manifest: { id: 'x' } }) },
    ]);
    expect(registry.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('invalid.composite.json');
  });

  it('separates valid and invalid entries', () => {
    const { registry, errors } = discoverComposites([
      entry('good.composite.json', composite('heading')),
      { source: 'bad.composite.json', raw: 'not json' },
    ]);
    expect(registry.size).toBe(1);
    expect(registry.get('heading')).toBeDefined();
    expect(errors).toHaveLength(1);
  });

  it('detects duplicate ids -- first wins, later reported', () => {
    const first = composite('heading', {
      blocks: [{ id: '1', type: 'heading', content: 'First' }],
    });
    const second = composite('heading', {
      blocks: [{ id: '1', type: 'heading', content: 'Second' }],
    });

    const { registry, errors } = discoverComposites([
      entry('first.composite.json', first),
      entry('second.composite.json', second),
    ]);

    expect(registry.size).toBe(1);
    expect(registry.get('heading')?.blocks[0].content).toBe('First');
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('second.composite.json');
    expect(errors[0].error).toContain('Duplicate composite id "heading"');
  });

  it('resolves nested composite:* references against the gathered set', () => {
    const child = composite('child');
    const parent = composite('parent', {
      blocks: [
        { id: 'root', type: 'section', children: ['nested'] },
        { id: 'nested', type: 'composite:child', parentId: 'root' },
      ],
    });

    const { registry, errors } = discoverComposites([
      entry('child.composite.json', child),
      entry('parent.composite.json', parent),
    ]);

    expect(errors).toHaveLength(0);
    expect(registry.size).toBe(2);
  });

  it('reports unresolved composite:* references', () => {
    const parent = composite('parent', {
      blocks: [{ id: 'nested', type: 'composite:missing' }],
    });

    const { registry, errors } = discoverComposites([entry('parent.composite.json', parent)]);

    expect(registry.has('parent')).toBe(true);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('parent');
    expect(errors[0].error).toContain('composite:missing');
  });

  it('returns empty result for no entries', () => {
    const { registry, errors } = discoverComposites([]);
    expect(registry.size).toBe(0);
    expect(errors).toHaveLength(0);
  });
});
