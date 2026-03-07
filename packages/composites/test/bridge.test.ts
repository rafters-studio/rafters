import { describe, expect, it } from 'vitest';
import type { SerializableBlock } from '../src/bridge';
import {
  instantiateBlocks,
  serializeToComposite,
  toBridgeItem,
  toBridgeItems,
  toKebabId,
} from '../src/bridge';
import type { CompositeBlock, CompositeFile } from '../src/manifest';
import { CompositeFileSchema } from '../src/manifest';

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

    it('expands composite inside a parent-child hierarchy', () => {
      const blocks: CompositeBlock[] = [
        { id: 'grid', type: 'grid', children: ['comp-placeholder', 'static'] },
        { id: 'comp-placeholder', type: 'composite:login-fields', parentId: 'grid' },
        { id: 'static', type: 'text', content: 'Footer', parentId: 'grid' },
      ];
      const result = instantiateBlocks(blocks, {
        resolveComposite: (id) => (id === 'login-fields' ? innerComposite : null),
      });
      const grid = result.find((b) => b.type === 'grid');
      const expanded = result.filter((b) => b.type === 'input');
      expect(expanded).toHaveLength(2);
      // Expanded blocks should be parented to the grid
      for (const eb of expanded) {
        expect(eb.parentId).toBe(grid?.id);
      }
    });

    it('passes through composite: type when no resolveComposite provided', () => {
      const blocks: CompositeBlock[] = [{ id: 'x', type: 'composite:foo' }];
      const result = instantiateBlocks(blocks);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('composite:foo');
      expect(result[0].id).not.toBe('x');
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
      // All blocks are composite:recursive, so at depth 3 expansion stops
      // and returns [], making the result empty
      expect(result).toHaveLength(0);
    });
  });

  it('returns empty array for empty input', () => {
    expect(instantiateBlocks([])).toEqual([]);
  });
});

describe('toKebabId', () => {
  it('converts display name to kebab-case', () => {
    expect(toKebabId('Login Form')).toBe('login-form');
  });

  it('handles special characters', () => {
    expect(toKebabId('My Cool Widget!!')).toBe('my-cool-widget');
  });

  it('trims leading/trailing hyphens', () => {
    expect(toKebabId('  --Hello--  ')).toBe('hello');
  });

  it('collapses multiple separators', () => {
    expect(toKebabId('a   b   c')).toBe('a-b-c');
  });

  it('returns empty string for input with no alphanumeric characters', () => {
    expect(toKebabId('!!!')).toBe('');
    expect(toKebabId('---')).toBe('');
  });
});

describe('serializeToComposite', () => {
  const blocks: SerializableBlock[] = [
    { id: 'h1', type: 'heading', content: 'Sign In', meta: { level: 2 } },
    { id: 'email', type: 'input', content: '', rules: ['email', 'required'] },
    { id: 'pw', type: 'input', content: '', rules: ['password', 'required'] },
    { id: 'btn', type: 'button', content: 'Submit' },
  ];

  it('produces a valid CompositeFile that passes schema validation', () => {
    const result = serializeToComposite(blocks, {
      name: 'Login Form',
      category: 'form',
      description: 'Email and password login',
    });
    const parsed = CompositeFileSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it('derives kebab-case ID from name', () => {
    const result = serializeToComposite(blocks, {
      name: 'Login Form',
      category: 'form',
      description: 'test',
    });
    expect(result.manifest.id).toBe('login-form');
  });

  it('derives input rules from root blocks', () => {
    const result = serializeToComposite(blocks, {
      name: 'Test',
      category: 'form',
      description: 'test',
    });
    expect(result.input).toContain('email');
    expect(result.input).toContain('password');
    expect(result.input).toContain('required');
  });

  it('derives output rules from leaf blocks', () => {
    const result = serializeToComposite(blocks, {
      name: 'Test',
      category: 'form',
      description: 'test',
    });
    expect(result.output).toContain('email');
    expect(result.output).toContain('password');
  });

  it('derives keywords from block types and rule names', () => {
    const result = serializeToComposite(blocks, {
      name: 'Test',
      category: 'form',
      description: 'test',
    });
    expect(result.manifest.keywords).toContain('heading');
    expect(result.manifest.keywords).toContain('input');
    expect(result.manifest.keywords).toContain('button');
    expect(result.manifest.keywords).toContain('email');
  });

  it('uses block count for cognitiveLoad when not provided', () => {
    const result = serializeToComposite(blocks, {
      name: 'Test',
      category: 'form',
      description: 'test',
    });
    expect(result.manifest.cognitiveLoad).toBe(4);
  });

  it('uses explicit cognitiveLoad when provided', () => {
    const result = serializeToComposite(blocks, {
      name: 'Test',
      category: 'form',
      description: 'test',
      cognitiveLoad: 7,
    });
    expect(result.manifest.cognitiveLoad).toBe(7);
  });

  it('omits undefined optional fields from serialized blocks', () => {
    const result = serializeToComposite([{ id: 'a', type: 'text' }], {
      name: 'Simple',
      category: 'typography',
      description: 'test',
    });
    expect(result.blocks[0]).toEqual({ id: 'a', type: 'text' });
    expect('content' in result.blocks[0]).toBe(false);
    expect('children' in result.blocks[0]).toBe(false);
  });

  it('preserves parent-child relationships', () => {
    const nested: SerializableBlock[] = [
      { id: 'grid', type: 'grid', children: ['a', 'b'] },
      { id: 'a', type: 'input', parentId: 'grid' },
      { id: 'b', type: 'input', parentId: 'grid' },
    ];
    const result = serializeToComposite(nested, {
      name: 'Nested',
      category: 'layout',
      description: 'test',
    });
    expect(result.blocks[0].children).toEqual(['a', 'b']);
    expect(result.blocks[1].parentId).toBe('grid');
  });

  it('throws for empty blocks array', () => {
    expect(() =>
      serializeToComposite([], { name: 'Empty', category: 'layout', description: 'test' }),
    ).toThrow('zero blocks');
  });

  it('throws for name that produces no valid ID', () => {
    expect(() =>
      serializeToComposite([{ id: 'a', type: 'text' }], {
        name: '!!!',
        category: 'layout',
        description: 'test',
      }),
    ).toThrow('alphanumeric');
  });

  it('clamps explicit cognitiveLoad to 1-10 range', () => {
    const result = serializeToComposite([{ id: 'a', type: 'text' }], {
      name: 'Test',
      category: 'layout',
      description: 'test',
      cognitiveLoad: 50,
    });
    expect(result.manifest.cognitiveLoad).toBe(10);
  });

  it('caps cognitiveLoad at 10 for large block counts', () => {
    const manyBlocks = Array.from({ length: 15 }, (_, i) => ({ id: `b${i}`, type: 'text' }));
    const result = serializeToComposite(manyBlocks, {
      name: 'Big',
      category: 'layout',
      description: 'test',
    });
    expect(result.manifest.cognitiveLoad).toBe(10);
  });

  it('handles object-style rules in I/O derivation', () => {
    const blocksWithObjectRules: SerializableBlock[] = [
      {
        id: 'x',
        type: 'input',
        rules: [{ name: 'validate', config: { pattern: '.*' } }, 'required'],
      },
    ];
    const result = serializeToComposite(blocksWithObjectRules, {
      name: 'Object Rules',
      category: 'form',
      description: 'test',
    });
    expect(result.input).toContain('validate');
    expect(result.input).toContain('required');
    expect(result.manifest.keywords).toContain('validate');
  });
});
