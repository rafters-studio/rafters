import { describe, expect, it, vi } from 'vitest';
import { createMemory } from '../../src/primitives/memory';

describe('createMemory', () => {
  it('exposes the initial value', () => {
    const m = createMemory({ a: 1, b: 2 });
    expect(m.get()).toEqual({ a: 1, b: 2 });
  });

  it('accepts a factory for the initial value', () => {
    const m = createMemory(() => ({ a: 1 }));
    expect(m.get()).toEqual({ a: 1 });
  });

  describe('patch', () => {
    it('shallow-merges and preserves untouched reference fields', () => {
      const m = createMemory({
        selectedIds: new Set(['a']),
        focusedId: undefined as string | undefined,
        canUndo: false,
      });
      m.patch({ focusedId: 'x' });
      expect(m.get().focusedId).toBe('x');
      expect(m.get().selectedIds.has('a')).toBe(true);
      expect(m.get().canUndo).toBe(false);
    });

    it('produces a new object reference on each patch', () => {
      const m = createMemory({ a: 1 });
      const before = m.get();
      m.patch({ a: 2 });
      expect(m.get()).not.toBe(before);
    });
  });

  describe('set', () => {
    it('replaces the whole value', () => {
      const m = createMemory({ a: 1, b: 2 });
      m.set({ a: 9, b: 9 });
      expect(m.get()).toEqual({ a: 9, b: 9 });
    });
  });

  describe('subscribe', () => {
    it('fires immediately with the current value and stops after unsubscribe', () => {
      const m = createMemory({ n: 1 });
      const seen: number[] = [];
      const unsubscribe = m.subscribe((value) => seen.push(value.n));
      m.set({ n: 2 });
      unsubscribe();
      m.set({ n: 3 });
      expect(seen).toEqual([1, 2]);
    });
  });

  describe('reset', () => {
    it('value-form reset re-seats the same reference', () => {
      const initial = { ids: new Set<string>() };
      const m = createMemory(initial);
      m.get().ids.add('leaked');
      m.reset();
      expect(m.get().ids.has('leaked')).toBe(true);
    });

    it('factory-form reset yields a fresh value', () => {
      const m = createMemory(() => ({ ids: new Set<string>() }));
      m.get().ids.add('leaked');
      m.reset();
      expect(m.get().ids.has('leaked')).toBe(false);
    });
  });

  describe('select', () => {
    it('fires only when the selected slice changes', () => {
      const m = createMemory({ canUndo: false, focusedId: undefined as string | undefined });
      const fires: boolean[] = [];
      m.select(
        (s) => s.canUndo,
        (canUndo) => fires.push(canUndo),
      );
      m.patch({ focusedId: 'b' }); // unrelated -> no fire
      m.patch({ canUndo: true }); // relevant -> fire
      m.patch({ canUndo: true }); // same value -> no fire
      expect(fires).toEqual([true]);
    });

    it('does not fire on initial subscribe', () => {
      const m = createMemory({ x: 5 });
      const listener = vi.fn();
      m.select((s) => s.x, listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('honors a custom equality function', () => {
      const m = createMemory({ point: { x: 0, y: 0 } });
      const fires: Array<{ x: number; y: number }> = [];
      m.select(
        (s) => s.point,
        (point) => fires.push(point),
        (a, b) => a.x === b.x && a.y === b.y,
      );
      m.set({ point: { x: 0, y: 0 } }); // structurally equal -> no fire
      m.set({ point: { x: 1, y: 0 } }); // changed -> fire
      expect(fires).toEqual([{ x: 1, y: 0 }]);
    });

    it('stops firing after unsubscribe', () => {
      const m = createMemory({ x: 0 });
      const fires: number[] = [];
      const stop = m.select(
        (s) => s.x,
        (x) => fires.push(x),
      );
      m.patch({ x: 1 });
      stop();
      m.patch({ x: 2 });
      expect(fires).toEqual([1]);
    });
  });

  describe('derive', () => {
    it('recomputes when the source changes', () => {
      const m = createMemory({ a: 1, b: 2 });
      const sum = m.derive((s) => s.a + s.b);
      const seen: number[] = [];
      sum.subscribe((value) => seen.push(value));
      m.patch({ a: 10 });
      expect(seen).toEqual([3, 12]);
    });
  });

  describe('atom escape hatch', () => {
    it('exposes the underlying readable atom', () => {
      const m = createMemory({ a: 1 });
      expect(m.atom.get()).toEqual({ a: 1 });
      m.set({ a: 2 });
      expect(m.atom.get()).toEqual({ a: 2 });
    });
  });
});
