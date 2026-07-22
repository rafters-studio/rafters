import { describe, expect, it } from 'vitest';
import { createSelectionGroup } from '../../src/primitives/selection-group';

describe('createSelectionGroup', () => {
  describe('single mode (tabs)', () => {
    it('starts from initial and select replaces', () => {
      const g = createSelectionGroup({ initial: 'overview' });
      expect(g.get()).toEqual(['overview']);
      g.select('details');
      expect(g.get()).toEqual(['details']);
      expect(g.isSelected('details')).toBe(true);
      expect(g.isSelected('overview')).toBe(false);
    });

    it('toggle on the active value is a no-op when not collapsible', () => {
      const g = createSelectionGroup({ initial: 'a' });
      g.toggle('a');
      expect(g.get()).toEqual(['a']);
    });

    it('set clamps to one value', () => {
      const g = createSelectionGroup();
      g.set(['a', 'b', 'c']);
      expect(g.get()).toEqual(['a']);
    });
  });

  describe('single collapsible (menus)', () => {
    it('toggle off clears the active value', () => {
      const g = createSelectionGroup({ collapsible: true });
      g.toggle('file');
      expect(g.get()).toEqual(['file']);
      g.toggle('file');
      expect(g.get()).toEqual([]);
    });

    it('toggle to a different value switches', () => {
      const g = createSelectionGroup({ collapsible: true, initial: 'file' });
      g.toggle('edit');
      expect(g.get()).toEqual(['edit']);
    });
  });

  describe('multiple mode (accordion)', () => {
    it('toggle adds and removes independently', () => {
      const g = createSelectionGroup({ multiple: true });
      g.toggle('item-1');
      g.toggle('item-2');
      expect(g.get()).toEqual(['item-1', 'item-2']);
      g.toggle('item-1');
      expect(g.get()).toEqual(['item-2']);
    });

    it('select adds without duplicating', () => {
      const g = createSelectionGroup({ multiple: true, initial: ['a'] });
      g.select('a');
      g.select('b');
      expect(g.get()).toEqual(['a', 'b']);
    });

    it('set keeps the full array', () => {
      const g = createSelectionGroup({ multiple: true });
      g.set(['a', 'b', 'c']);
      expect(g.get()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('subscribe + clear', () => {
    it('notifies on change and clear empties', () => {
      const g = createSelectionGroup({ multiple: true, initial: ['a'] });
      const seen: string[][] = [];
      const stop = g.subscribe((s) => seen.push(s));
      g.toggle('b');
      g.clear();
      stop();
      g.toggle('c'); // after unsubscribe -> not observed
      expect(seen).toEqual([['a'], ['a', 'b'], []]);
    });
  });
});
