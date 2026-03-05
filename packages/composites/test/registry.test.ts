import { afterEach, describe, expect, it } from 'vitest';
import {
  clearRegistry,
  getAllComposites,
  getComposite,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '../src/index';
import type { CompositeFile } from '../src/manifest';

function makeComposite(overrides: Partial<CompositeFile['manifest']> = {}): CompositeFile {
  return {
    manifest: {
      id: 'test-heading',
      name: 'Heading',
      category: 'typography',
      description: 'A heading block',
      keywords: ['title', 'h1', 'h2'],
      cognitiveLoad: 1,
      ...overrides,
    },
    input: [],
    output: [],
    blocks: [{ id: '1', type: 'heading', content: 'Untitled', meta: { level: 2 } }],
  };
}

describe('composite registry', () => {
  afterEach(() => {
    clearRegistry();
  });

  it('registers and retrieves a composite by ID', () => {
    const composite = makeComposite();
    registerComposite(composite);

    const result = getComposite('test-heading');
    expect(result).toBe(composite);
  });

  it('returns undefined for unknown ID', () => {
    expect(getComposite('nonexistent')).toBeUndefined();
  });

  it('rejects duplicate IDs', () => {
    registerComposite(makeComposite());
    expect(() => registerComposite(makeComposite())).toThrow('already registered');
  });

  it('retrieves composites by category', () => {
    registerComposite(makeComposite({ id: 'heading', category: 'typography' }));
    registerComposite(makeComposite({ id: 'paragraph', category: 'typography' }));
    registerComposite(makeComposite({ id: 'form-input', category: 'form' }));

    const typo = getCompositesByCategory('typography');
    expect(typo).toHaveLength(2);
    expect(typo.map((c) => c.manifest.id)).toEqual(['heading', 'paragraph']);

    const forms = getCompositesByCategory('form');
    expect(forms).toHaveLength(1);
  });

  it('searches by name with fuzzy matching', () => {
    registerComposite(makeComposite({ id: 'heading', name: 'Heading' }));
    registerComposite(makeComposite({ id: 'paragraph', name: 'Paragraph' }));

    const results = searchComposites('hd');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.manifest.id).toBe('heading');
  });

  it('searches by keywords with fuzzy matching', () => {
    registerComposite(makeComposite({ id: 'heading', name: 'Heading', keywords: ['title', 'h1'] }));
    registerComposite(makeComposite({ id: 'paragraph', name: 'Paragraph', keywords: ['text', 'body'] }));

    const results = searchComposites('title');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.manifest.id).toBe('heading');
  });

  it('returns all composites for empty search', () => {
    registerComposite(makeComposite({ id: 'heading' }));
    registerComposite(makeComposite({ id: 'paragraph' }));

    const results = searchComposites('');
    expect(results).toHaveLength(2);
  });

  it('returns empty array for no search matches', () => {
    registerComposite(makeComposite({ id: 'heading' }));
    const results = searchComposites('zzzzz');
    expect(results).toHaveLength(0);
  });

  it('getAll returns all registered composites', () => {
    registerComposite(makeComposite({ id: 'a' }));
    registerComposite(makeComposite({ id: 'b' }));
    registerComposite(makeComposite({ id: 'c' }));

    expect(getAllComposites()).toHaveLength(3);
  });

  it('clearRegistry removes all composites', () => {
    registerComposite(makeComposite({ id: 'a' }));
    clearRegistry();
    expect(getAllComposites()).toHaveLength(0);
  });
});
