import { describe, expect, it } from 'vitest';
import { instantiateBlocks, toBridgeItem, toBridgeItems } from '../src/bridge';
import type { CompositeBlock, CompositeFile } from '../src/manifest';

function makeComposite(overrides: Partial<CompositeFile['manifest']> = {}): CompositeFile {
  return {
    manifest: {
      id: 'test-composite',
      name: 'Test Composite',
      category: 'typography',
      description: 'A test composite',
      keywords: ['test'],
      cognitiveLoad: 2,
      ...overrides,
    },
    input: [],
    output: [],
    blocks: [{ id: '1', type: 'text' }],
  };
}

describe('toBridgeItem', () => {
  it('maps manifest fields to BlockPaletteItem', () => {
    const item = toBridgeItem(
      makeComposite({
        id: 'login-form',
        name: 'Login Form',
        category: 'form',
        keywords: ['auth', 'login'],
      }),
    );
    expect(item).toEqual({
      id: 'login-form',
      label: 'Login Form',
      category: 'form',
      keywords: ['auth', 'login'],
    });
  });

  it('omits keywords when empty', () => {
    const item = toBridgeItem(makeComposite({ keywords: [] }));
    expect(item.keywords).toBeUndefined();
  });

  it('ignores I/O and blocks (palette only needs manifest)', () => {
    const composite: CompositeFile = {
      manifest: {
        id: 'complex',
        name: 'Complex',
        category: 'widget',
        description: 'Many blocks',
        keywords: [],
        cognitiveLoad: 8,
      },
      input: ['email', 'password'],
      output: ['credentials'],
      blocks: [
        { id: '1', type: 'grid', children: ['2', '3'] },
        { id: '2', type: 'input', parentId: '1' },
        { id: '3', type: 'input', parentId: '1' },
      ],
    };
    const item = toBridgeItem(composite);
    expect(item.id).toBe('complex');
    expect(Object.keys(item)).toEqual(['id', 'label', 'category']);
  });
});

describe('toBridgeItems', () => {
  it('sorts alphabetically by label', () => {
    const items = toBridgeItems([
      makeComposite({ id: 'z', name: 'Zebra' }),
      makeComposite({ id: 'a', name: 'Apple' }),
      makeComposite({ id: 'm', name: 'Mango' }),
    ]);
    expect(items.map((i) => i.label)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('returns empty array for empty input', () => {
    expect(toBridgeItems([])).toEqual([]);
  });

  it('handles single composite', () => {
    const items = toBridgeItems([makeComposite({ id: 'solo', name: 'Solo' })]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('solo');
  });
});

describe('instantiateBlocks', () => {
  const templateBlocks: CompositeBlock[] = [
    { id: 'heading-1', type: 'heading', content: 'Sign In', meta: { level: 2 } },
    { id: 'email-1', type: 'input', content: '', rules: ['email', 'required'] },
    { id: 'submit-1', type: 'button', content: 'Sign In' },
  ];

  it('generates fresh IDs that differ from template', () => {
    const result = instantiateBlocks(templateBlocks);
    expect(result).toHaveLength(3);
    for (const block of result) {
      expect(templateBlocks.find((t) => t.id === block.id)).toBeUndefined();
    }
  });

  it('preserves type, content, meta, and rules', () => {
    const result = instantiateBlocks(templateBlocks);
    expect(result[0].type).toBe('heading');
    expect(result[0].content).toBe('Sign In');
    expect(result[0].meta).toEqual({ level: 2 });
    expect(result[1].rules).toEqual(['email', 'required']);
  });

  it('generates unique IDs across all blocks', () => {
    const result = instantiateBlocks(templateBlocks);
    const ids = result.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('remaps children references to new IDs', () => {
    const blocks: CompositeBlock[] = [
      { id: 'grid', type: 'grid', children: ['a', 'b'] },
      { id: 'a', type: 'input', parentId: 'grid' },
      { id: 'b', type: 'input', parentId: 'grid' },
    ];
    const result = instantiateBlocks(blocks);
    const grid = result.find((b) => b.type === 'grid');
    const inputs = result.filter((b) => b.type === 'input');
    expect(grid?.children).toHaveLength(2);
    expect(grid?.children).toEqual(inputs.map((i) => i.id));
    for (const input of inputs) {
      expect(input.parentId).toBe(grid?.id);
    }
  });

  it('does not include undefined optional fields', () => {
    const result = instantiateBlocks([{ id: 'a', type: 'text' }]);
    expect(result[0].type).toBe('text');
    expect('content' in result[0]).toBe(false);
    expect('children' in result[0]).toBe(false);
    expect('parentId' in result[0]).toBe(false);
    expect('meta' in result[0]).toBe(false);
    expect('rules' in result[0]).toBe(false);
  });

  describe('nested composite expansion', () => {
    const innerBlocks: CompositeBlock[] = [
      { id: 'inner-1', type: 'input', content: 'email' },
      { id: 'inner-2', type: 'input', content: 'password' },
    ];

    const innerComposite: CompositeFile = {
      manifest: {
        id: 'login-fields',
        name: 'Login Fields',
        category: 'form',
        description: 'Email and password fields',
        keywords: [],
        cognitiveLoad: 3,
      },
      input: [],
      output: [],
      blocks: innerBlocks,
    };

    it('expands composite: prefixed blocks', () => {
      const blocks: CompositeBlock[] = [{ id: 'wrapper', type: 'composite:login-fields' }];
      const result = instantiateBlocks(blocks, {
        resolveComposite: (id) => (id === 'login-fields' ? innerComposite : null),
      });
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('input');
      expect(result[1].type).toBe('input');
    });

    it('creates placeholder for unknown composites', () => {
      const blocks: CompositeBlock[] = [{ id: 'wrapper', type: 'composite:nonexistent' }];
      const result = instantiateBlocks(blocks, {
        resolveComposite: () => null,
      });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
      expect(result[0].content).toBe('Unknown composite: nonexistent');
    });

    it('respects maxDepth to prevent infinite recursion', () => {
      const selfRef: CompositeFile = {
        manifest: {
          id: 'recursive',
          name: 'Recursive',
          category: 'widget',
          description: 'Self-referencing',
          keywords: [],
          cognitiveLoad: 1,
        },
        input: [],
        output: [],
        blocks: [{ id: 'r1', type: 'composite:recursive' }],
      };
      const result = instantiateBlocks(selfRef.blocks, {
        resolveComposite: () => selfRef,
        maxDepth: 3,
      });
      // Should stop expanding at depth 3 and return empty for the deepest level
      expect(result.length).toBeLessThan(100);
    });
  });

  it('returns empty array for empty input', () => {
    expect(instantiateBlocks([])).toEqual([]);
  });
});
