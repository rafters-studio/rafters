import { describe, expect, it, vi } from 'vitest';
import type { Block } from '../../src/primitives/block-handler';
import { createBlockHandler } from '../../src/primitives/block-handler';

// ============================================================================
// Helpers
// ============================================================================

function makeBlock(id: string, overrides?: Partial<Block>): Block {
  return { id, type: 'paragraph', content: `Content for ${id}`, ...overrides };
}

// ============================================================================
// Tests
// ============================================================================

describe('createBlockHandler', () => {
  // --------------------------------------------------------------------------
  // Creation
  // --------------------------------------------------------------------------

  it('creates with empty defaults', () => {
    const handler = createBlockHandler();

    expect(handler.$blocks.get()).toEqual([]);
    expect(handler.$selectedIds.get()).toEqual(new Set());
    expect(handler.$focusedId.get()).toBeNull();
    expect(handler.$blockCount.get()).toBe(0);
    expect(handler.$blockMap.get()).toEqual(new Map());
  });

  it('creates with initial blocks', () => {
    const blocks = [makeBlock('a'), makeBlock('b')];
    const handler = createBlockHandler({ initialBlocks: blocks });

    expect(handler.$blocks.get()).toHaveLength(2);
    expect(handler.$blockCount.get()).toBe(2);
    expect(handler.$blockMap.get().has('a')).toBe(true);
    expect(handler.$blockMap.get().has('b')).toBe(true);
  });

  it('does not mutate the initial blocks array', () => {
    const blocks = [makeBlock('a')];
    const handler = createBlockHandler({ initialBlocks: blocks });

    handler.addBlock(makeBlock('b'));

    expect(blocks).toHaveLength(1);
    expect(handler.$blocks.get()).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // addBlock
  // --------------------------------------------------------------------------

  describe('addBlock', () => {
    it('appends a block when no index given', () => {
      const handler = createBlockHandler({ initialBlocks: [makeBlock('a')] });

      handler.addBlock(makeBlock('b'));

      const blocks = handler.$blocks.get();
      expect(blocks).toHaveLength(2);
      expect(blocks[1]?.id).toBe('b');
    });

    it('inserts at a specific index', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('c')],
      });

      handler.addBlock(makeBlock('b'), 1);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['a', 'b', 'c']);
    });

    it('clamps negative index to 0', () => {
      const handler = createBlockHandler({ initialBlocks: [makeBlock('a')] });

      handler.addBlock(makeBlock('b'), -5);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b', 'a']);
    });

    it('clamps out-of-range index to length', () => {
      const handler = createBlockHandler({ initialBlocks: [makeBlock('a')] });

      handler.addBlock(makeBlock('b'), 999);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['a', 'b']);
    });

    it('throws on duplicate ID', () => {
      const handler = createBlockHandler({ initialBlocks: [makeBlock('a')] });

      expect(() => handler.addBlock(makeBlock('a'))).toThrowError(
        "Block with id 'a' already exists",
      );
    });
  });

  // --------------------------------------------------------------------------
  // removeBlocks
  // --------------------------------------------------------------------------

  describe('removeBlocks', () => {
    it('removes a single block', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.removeBlocks(new Set(['b']));

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['a', 'c']);
    });

    it('removes multiple blocks', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.removeBlocks(new Set(['a', 'c']));

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b']);
    });

    it('cascades removal to nested children', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent', { children: ['child1', 'child2'] }),
          makeBlock('child1', { parentId: 'parent', children: ['grandchild'] }),
          makeBlock('child2', { parentId: 'parent' }),
          makeBlock('grandchild', { parentId: 'child1' }),
          makeBlock('other'),
        ],
      });

      handler.removeBlocks(new Set(['parent']));

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['other']);
    });

    it('cleans up children references from surviving parents', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent', { children: ['child1', 'child2'] }),
          makeBlock('child1', { parentId: 'parent' }),
          makeBlock('child2', { parentId: 'parent' }),
        ],
      });

      handler.removeBlocks(new Set(['child1']));

      const parent = handler.$blocks.get().find((b) => b.id === 'parent');
      expect(parent?.children).toEqual(['child2']);
    });

    it('cleans orphaned parentId when parent is removed but child survives', () => {
      // Simulate inconsistent state: child has parentId but parent does not list it in children.
      // This can occur when external data is loaded with partial relationships.
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent'),
          makeBlock('child', { parentId: 'parent' }),
          makeBlock('other'),
        ],
      });

      // Remove the parent -- child survives because it is not in parent.children
      handler.removeBlocks(new Set(['parent']));

      const child = handler.$blocks.get().find((b) => b.id === 'child');
      expect(child).toBeDefined();
      expect(child?.parentId).toBeUndefined();
    });

    it('short-circuits when none of the IDs exist in current blocks', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
        onChange,
      });

      handler.removeBlocks(new Set(['nonexistent']));

      // onChange should not fire since nothing was actually removed
      expect(onChange).not.toHaveBeenCalled();
    });

    it('clears selection for removed blocks', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.setSelection(new Set(['a', 'b']));
      handler.removeBlocks(new Set(['a']));

      expect(handler.$selectedIds.get()).toEqual(new Set(['b']));
    });

    it('clears focus if focused block is removed', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
      });

      handler.setFocus('a');
      handler.removeBlocks(new Set(['a']));

      expect(handler.$focusedId.get()).toBeNull();
    });

    it('handles removing non-existent IDs gracefully', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      handler.removeBlocks(new Set(['nonexistent']));

      expect(handler.$blocks.get()).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // moveBlock
  // --------------------------------------------------------------------------

  describe('moveBlock', () => {
    it('moves a block to a new position', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.moveBlock('a', 2);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('clamps target index to valid range', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
      });

      handler.moveBlock('a', 999);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b', 'a']);
    });

    it('throws for unknown block ID', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      expect(() => handler.moveBlock('nonexistent', 0)).toThrowError(
        "Block with id 'nonexistent' not found",
      );
    });
  });

  // --------------------------------------------------------------------------
  // reorderBlocks
  // --------------------------------------------------------------------------

  describe('reorderBlocks', () => {
    it('swaps two blocks by index', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.reorderBlocks(0, 2);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('clamps out-of-range indices', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b'), makeBlock('c')],
      });

      handler.reorderBlocks(-1, 100);

      const ids = handler.$blocks.get().map((b) => b.id);
      expect(ids).toEqual(['b', 'c', 'a']);
    });

    it('is a no-op when from and to are the same', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
        onChange,
      });

      handler.reorderBlocks(1, 1);

      // Should not have been called since indices are equal
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles empty block list', () => {
      const handler = createBlockHandler();

      // Should not throw
      handler.reorderBlocks(0, 1);

      expect(handler.$blocks.get()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // updateBlock
  // --------------------------------------------------------------------------

  describe('updateBlock', () => {
    it('partially updates a block', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a', { content: 'old' })],
      });

      handler.updateBlock('a', { content: 'new' });

      const block = handler.$blocks.get()[0];
      expect(block?.content).toBe('new');
      expect(block?.type).toBe('paragraph');
      expect(block?.id).toBe('a');
    });

    it('preserves the original ID even if updates include a different id', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      handler.updateBlock('a', { id: 'should-be-ignored' } as Partial<Block>);

      expect(handler.$blocks.get()[0]?.id).toBe('a');
    });

    it('throws for unknown block ID', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      expect(() => handler.updateBlock('nonexistent', { content: 'x' })).toThrowError(
        "Block with id 'nonexistent' not found",
      );
    });

    it('throws when attempting to update parentId via updateBlock', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      expect(() => handler.updateBlock('a', { parentId: 'some-parent' })).toThrowError(
        'Cannot update parentId or children via updateBlock. Use nestBlock() and unnestBlock() to modify block tree structure.',
      );
    });

    it('throws when attempting to update children via updateBlock', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      expect(() => handler.updateBlock('a', { children: ['b'] })).toThrowError(
        'Cannot update parentId or children via updateBlock. Use nestBlock() and unnestBlock() to modify block tree structure.',
      );
    });
  });

  // --------------------------------------------------------------------------
  // nestBlock
  // --------------------------------------------------------------------------

  describe('nestBlock', () => {
    it('nests a child under a parent', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('parent'), makeBlock('child')],
      });

      handler.nestBlock('child', 'parent');

      const blocks = handler.$blocks.get();
      const parent = blocks.find((b) => b.id === 'parent');
      const child = blocks.find((b) => b.id === 'child');

      expect(parent?.children).toEqual(['child']);
      expect(child?.parentId).toBe('parent');
    });

    it('moves a child from one parent to another', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent1', { children: ['child'] }),
          makeBlock('parent2'),
          makeBlock('child', { parentId: 'parent1' }),
        ],
      });

      handler.nestBlock('child', 'parent2');

      const blocks = handler.$blocks.get();
      const parent1 = blocks.find((b) => b.id === 'parent1');
      const parent2 = blocks.find((b) => b.id === 'parent2');
      const child = blocks.find((b) => b.id === 'child');

      expect(parent1?.children).toEqual([]);
      expect(parent2?.children).toEqual(['child']);
      expect(child?.parentId).toBe('parent2');
    });

    it('throws on self-nesting', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      expect(() => handler.nestBlock('a', 'a')).toThrowError(
        "Cannot nest block 'a' under 'a': circular reference",
      );
    });

    it('throws on circular nesting (child has parent as descendant)', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('grandparent', { children: ['parent'] }),
          makeBlock('parent', { parentId: 'grandparent', children: ['child'] }),
          makeBlock('child', { parentId: 'parent' }),
        ],
      });

      expect(() => handler.nestBlock('grandparent', 'child')).toThrowError(
        "Cannot nest block 'grandparent' under 'child': circular reference",
      );
    });

    it('throws for unknown child ID', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('parent')],
      });

      expect(() => handler.nestBlock('nonexistent', 'parent')).toThrowError(
        "Block with id 'nonexistent' not found",
      );
    });

    it('throws for unknown parent ID', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('child')],
      });

      expect(() => handler.nestBlock('child', 'nonexistent')).toThrowError(
        "Block with id 'nonexistent' not found",
      );
    });

    it('does not duplicate child in parent children array', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent', { children: ['child'] }),
          makeBlock('child', { parentId: 'parent' }),
        ],
      });

      // Nesting again under the same parent should not add a duplicate
      handler.nestBlock('child', 'parent');

      const parent = handler.$blocks.get().find((b) => b.id === 'parent');
      expect(parent?.children).toEqual(['child']);
    });
  });

  // --------------------------------------------------------------------------
  // unnestBlock
  // --------------------------------------------------------------------------

  describe('unnestBlock', () => {
    it('removes a child from its parent', () => {
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent', { children: ['child'] }),
          makeBlock('child', { parentId: 'parent' }),
        ],
      });

      handler.unnestBlock('child');

      const blocks = handler.$blocks.get();
      const parent = blocks.find((b) => b.id === 'parent');
      const child = blocks.find((b) => b.id === 'child');

      expect(parent?.children).toEqual([]);
      expect(child?.parentId).toBeUndefined();
    });

    it('is a no-op for top-level blocks', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
        onChange,
      });

      handler.unnestBlock('a');

      // Should not trigger a state change
      expect(onChange).not.toHaveBeenCalled();
    });

    it('throws for unknown block ID', () => {
      const handler = createBlockHandler();

      expect(() => handler.unnestBlock('nonexistent')).toThrowError(
        "Block with id 'nonexistent' not found",
      );
    });
  });

  // --------------------------------------------------------------------------
  // setSelection / setFocus
  // --------------------------------------------------------------------------

  describe('selection and focus', () => {
    it('sets selection', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
      });

      handler.setSelection(new Set(['a', 'b']));

      expect(handler.$selectedIds.get()).toEqual(new Set(['a', 'b']));
    });

    it('replaces previous selection', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
      });

      handler.setSelection(new Set(['a']));
      handler.setSelection(new Set(['b']));

      expect(handler.$selectedIds.get()).toEqual(new Set(['b']));
    });

    it('sets focus', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      handler.setFocus('a');
      expect(handler.$focusedId.get()).toBe('a');

      handler.setFocus(null);
      expect(handler.$focusedId.get()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getCanvasCallbacks
  // --------------------------------------------------------------------------

  describe('getCanvasCallbacks', () => {
    it('returns callbacks matching BlockCanvasOptions shape', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a', { type: 'heading' })],
      });

      const callbacks = handler.getCanvasCallbacks();

      // Must have these keys
      expect(callbacks).toHaveProperty('getBlocks');
      expect(callbacks).toHaveProperty('getSelectedIds');
      expect(callbacks).toHaveProperty('getFocusedId');
      expect(callbacks).toHaveProperty('onSelectionChange');
      expect(callbacks).toHaveProperty('onFocusChange');

      // Must NOT have container (that comes from the caller)
      expect(callbacks).not.toHaveProperty('container');
    });

    it('getBlocks returns BlockCanvasBlock[] shape (id + type only)', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a', { type: 'heading', content: 'Hello' })],
      });

      const callbacks = handler.getCanvasCallbacks();
      const blocks = callbacks.getBlocks();

      expect(blocks).toEqual([{ id: 'a', type: 'heading' }]);
      // Should NOT include content or other Block fields
      expect(blocks[0]).not.toHaveProperty('content');
    });

    it('getSelectedIds reads from the handler atom', () => {
      const handler = createBlockHandler();
      const callbacks = handler.getCanvasCallbacks();

      handler.setSelection(new Set(['x']));
      expect(callbacks.getSelectedIds()).toEqual(new Set(['x']));
    });

    it('getFocusedId returns undefined when null (matching canvas interface)', () => {
      const handler = createBlockHandler();
      const callbacks = handler.getCanvasCallbacks();

      expect(callbacks.getFocusedId()).toBeUndefined();

      handler.setFocus('a');
      expect(callbacks.getFocusedId()).toBe('a');
    });

    it('onSelectionChange writes back to the handler atom', () => {
      const handler = createBlockHandler();
      const callbacks = handler.getCanvasCallbacks();

      callbacks.onSelectionChange(new Set(['a', 'b']));
      expect(handler.$selectedIds.get()).toEqual(new Set(['a', 'b']));
    });

    it('onFocusChange writes back to the handler atom', () => {
      const handler = createBlockHandler();
      const callbacks = handler.getCanvasCallbacks();

      callbacks.onFocusChange?.('block-1');
      expect(handler.$focusedId.get()).toBe('block-1');

      callbacks.onFocusChange?.(null);
      expect(handler.$focusedId.get()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // onChange callback
  // --------------------------------------------------------------------------

  describe('onChange callback', () => {
    it('fires on addBlock', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({ onChange });

      handler.addBlock(makeBlock('a'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith([makeBlock('a')]);
    });

    it('fires on removeBlocks', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
        onChange,
      });

      handler.removeBlocks(new Set(['a']));

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires on moveBlock', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
        onChange,
      });

      handler.moveBlock('a', 1);

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires on updateBlock', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
        onChange,
      });

      handler.updateBlock('a', { content: 'updated' });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires on nestBlock', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('parent'), makeBlock('child')],
        onChange,
      });

      handler.nestBlock('child', 'parent');

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('fires on unnestBlock', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [
          makeBlock('parent', { children: ['child'] }),
          makeBlock('child', { parentId: 'parent' }),
        ],
        onChange,
      });

      handler.unnestBlock('child');

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('does not fire on selection or focus changes', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
        onChange,
      });

      handler.setSelection(new Set(['a']));
      handler.setFocus('a');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // destroy
  // --------------------------------------------------------------------------

  describe('destroy', () => {
    it('unsubscribes onChange listener', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({ onChange });

      handler.destroy();

      handler.addBlock(makeBlock('a'));

      // onChange should NOT have been called after destroy
      expect(onChange).not.toHaveBeenCalled();
    });

    it('can be called multiple times safely', () => {
      const handler = createBlockHandler();

      handler.destroy();
      handler.destroy();

      // No error thrown
    });

    it('atoms remain readable after destroy', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
      });

      handler.destroy();

      // Atoms should still be readable (just not subscribed)
      expect(handler.$blocks.get()).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Computed stores
  // --------------------------------------------------------------------------

  describe('computed stores', () => {
    it('$blockCount reflects current block count', () => {
      const handler = createBlockHandler();

      expect(handler.$blockCount.get()).toBe(0);

      handler.addBlock(makeBlock('a'));
      expect(handler.$blockCount.get()).toBe(1);

      handler.addBlock(makeBlock('b'));
      expect(handler.$blockCount.get()).toBe(2);

      handler.removeBlocks(new Set(['a']));
      expect(handler.$blockCount.get()).toBe(1);
    });

    it('$blockMap reflects current blocks as a Map', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a'), makeBlock('b')],
      });

      const map = handler.$blockMap.get();
      expect(map.size).toBe(2);
      expect(map.get('a')?.id).toBe('a');
      expect(map.get('b')?.id).toBe('b');
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles rapid successive mutations', () => {
      const handler = createBlockHandler();

      for (let i = 0; i < 100; i++) {
        handler.addBlock(makeBlock(`block-${i}`));
      }

      expect(handler.$blockCount.get()).toBe(100);

      handler.removeBlocks(new Set(['block-0', 'block-50', 'block-99']));
      expect(handler.$blockCount.get()).toBe(97);
    });

    it('handles meta property on blocks', () => {
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a', { meta: { color: 'red', order: 1 } })],
      });

      handler.updateBlock('a', { meta: { color: 'blue', order: 2 } });

      const block = handler.$blocks.get()[0];
      expect(block?.meta).toEqual({ color: 'blue', order: 2 });
    });

    it('reorderBlocks with equal clamped indices is a no-op', () => {
      const onChange = vi.fn();
      const handler = createBlockHandler({
        initialBlocks: [makeBlock('a')],
        onChange,
      });

      // Both will clamp to 0
      handler.reorderBlocks(0, 0);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
