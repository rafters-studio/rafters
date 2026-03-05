import { describe, expect, it } from 'vitest';
import { toBridgeItem, toBridgeItems } from '../src/bridge';
import type { CompositeFile } from '../src/manifest';

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
