import { afterEach, describe, expect, it } from 'vitest';
import {
  clearRegistry,
  getAllComposites,
  getComposite,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '../src/index';
import type { CompositeDefinition } from '../src/manifest';
import { CompositeManifestSchema } from '../src/manifest';

function makeDef(overrides: Partial<CompositeDefinition['manifest']> = {}): CompositeDefinition {
  return {
    manifest: {
      id: 'test-heading',
      name: 'Heading',
      category: 'typography',
      description: 'A heading block',
      keywords: ['title', 'h1', 'h2'],
      cognitiveLoad: 1,
      defaultBlock: { type: 'heading', content: '', meta: { level: 2 } },
      ...overrides,
    },
    Preview: () => null,
    Render: () => null,
  };
}

describe('composite registry', () => {
  afterEach(() => {
    clearRegistry();
  });

  it('registers and retrieves a composite by ID', () => {
    const def = makeDef();
    registerComposite(def);

    const result = getComposite('test-heading');
    expect(result).toBe(def);
  });

  it('returns undefined for unknown ID', () => {
    expect(getComposite('nonexistent')).toBeUndefined();
  });

  it('rejects duplicate IDs', () => {
    registerComposite(makeDef());
    expect(() => registerComposite(makeDef())).toThrow('already registered');
  });

  it('retrieves composites by category', () => {
    registerComposite(makeDef({ id: 'heading', category: 'typography' }));
    registerComposite(makeDef({ id: 'paragraph', category: 'typography' }));
    registerComposite(makeDef({ id: 'form-input', category: 'form' }));

    const typo = getCompositesByCategory('typography');
    expect(typo).toHaveLength(2);
    expect(typo.map((d) => d.manifest.id)).toEqual(['heading', 'paragraph']);

    const forms = getCompositesByCategory('form');
    expect(forms).toHaveLength(1);
  });

  it('searches by name with fuzzy matching', () => {
    registerComposite(makeDef({ id: 'heading', name: 'Heading' }));
    registerComposite(makeDef({ id: 'paragraph', name: 'Paragraph' }));

    const results = searchComposites('hd');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.manifest.id).toBe('heading');
  });

  it('searches by keywords with fuzzy matching', () => {
    registerComposite(makeDef({ id: 'heading', name: 'Heading', keywords: ['title', 'h1'] }));
    registerComposite(makeDef({ id: 'paragraph', name: 'Paragraph', keywords: ['text', 'body'] }));

    const results = searchComposites('title');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.manifest.id).toBe('heading');
  });

  it('returns all composites for empty search', () => {
    registerComposite(makeDef({ id: 'heading' }));
    registerComposite(makeDef({ id: 'paragraph' }));

    const results = searchComposites('');
    expect(results).toHaveLength(2);
  });

  it('returns empty array for no search matches', () => {
    registerComposite(makeDef({ id: 'heading' }));
    const results = searchComposites('zzzzz');
    expect(results).toHaveLength(0);
  });

  it('getAll returns all registered composites', () => {
    registerComposite(makeDef({ id: 'a' }));
    registerComposite(makeDef({ id: 'b' }));
    registerComposite(makeDef({ id: 'c' }));

    expect(getAllComposites()).toHaveLength(3);
  });

  it('clearRegistry removes all composites', () => {
    registerComposite(makeDef({ id: 'a' }));
    clearRegistry();
    expect(getAllComposites()).toHaveLength(0);
  });
});

describe('CompositeManifestSchema', () => {
  it('validates a correct manifest', () => {
    const result = CompositeManifestSchema.safeParse({
      id: 'heading',
      name: 'Heading',
      category: 'typography',
      description: 'A heading block',
      keywords: ['title'],
      cognitiveLoad: 1,
      defaultBlock: { type: 'heading', content: '' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty id', () => {
    const result = CompositeManifestSchema.safeParse({
      id: '',
      name: 'Heading',
      category: 'typography',
      description: 'A heading block',
      keywords: [],
      cognitiveLoad: 1,
      defaultBlock: { type: 'heading', content: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = CompositeManifestSchema.safeParse({
      id: 'heading',
      name: 'Heading',
      category: 'invalid',
      description: 'A heading block',
      keywords: [],
      cognitiveLoad: 1,
      defaultBlock: { type: 'heading', content: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects cognitiveLoad out of range', () => {
    const result = CompositeManifestSchema.safeParse({
      id: 'heading',
      name: 'Heading',
      category: 'typography',
      description: 'A heading block',
      keywords: [],
      cognitiveLoad: 11,
      defaultBlock: { type: 'heading', content: '' },
    });
    expect(result.success).toBe(false);
  });
});
