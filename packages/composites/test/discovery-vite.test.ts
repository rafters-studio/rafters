import { describe, expect, it } from 'vitest';
import { discoverFromVite, viteAdapter, viteGlobEntries } from '../src/discovery-vite';

const LOGO = JSON.stringify({
  manifest: {
    id: 'site-logo',
    name: 'Site Logo',
    category: 'brand',
    description: 'mark',
    keywords: ['logo'],
    cognitiveLoad: 1,
  },
  input: [],
  output: [],
  blocks: [{ id: 'a', type: 'image', meta: { src: '/glyph.svg', alt: '' } }],
});

describe('viteGlobEntries', () => {
  it('normalizes an eager-raw glob record into raw entries keyed by source', () => {
    const entries = viteGlobEntries({ '/src/composites/site-logo.composite.json': LOGO });
    expect(entries).toEqual([{ source: '/src/composites/site-logo.composite.json', raw: LOGO }]);
  });

  it('returns an empty array for an empty glob', () => {
    expect(viteGlobEntries({})).toEqual([]);
  });
});

describe('viteAdapter', () => {
  it('builds an adapter that yields the glob entries', async () => {
    const adapter = viteAdapter({ '/a/site-logo.composite.json': LOGO });
    expect(await adapter()).toEqual([{ source: '/a/site-logo.composite.json', raw: LOGO }]);
  });
});

describe('discoverFromVite', () => {
  it('discovers and indexes composites from a glob record', () => {
    const { registry, errors } = discoverFromVite({ '/a/site-logo.composite.json': LOGO });
    expect(errors).toEqual([]);
    expect(registry.get('site-logo')?.manifest.name).toBe('Site Logo');
  });

  it('reports invalid JSON against its glob-key source', () => {
    const { registry, errors } = discoverFromVite({ '/a/broken.composite.json': '{ not json' });
    expect(registry.size).toBe(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.source).toBe('/a/broken.composite.json');
  });
});
