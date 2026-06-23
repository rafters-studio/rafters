import { describe, expect, it } from 'vitest';
import { createHistory } from './history';

const EMPTY = { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 };

describe('createHistory reactive snapshot', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory<number>({ initialState: 0 });
    expect(h.snapshot.get()).toEqual({ current: 0, ...EMPTY });
  });

  it('getState() reads through the reactive snapshot', () => {
    const h = createHistory<number>({ initialState: 0 });
    h.push(1);
    expect(h.getState()).toEqual(h.snapshot.get());
    expect(h.getState().current).toBe(1);
  });

  it('updates the snapshot on push, undo, and redo', () => {
    const h = createHistory<number>({ initialState: 0 });

    h.push(1);
    expect(h.snapshot.get().canUndo).toBe(true);
    expect(h.snapshot.get().canRedo).toBe(false);
    expect(h.snapshot.get().current).toBe(1);

    h.undo();
    expect(h.snapshot.get().canUndo).toBe(false);
    expect(h.snapshot.get().canRedo).toBe(true);
    expect(h.snapshot.get().current).toBe(0);

    h.redo();
    expect(h.snapshot.get().canUndo).toBe(true);
    expect(h.snapshot.get().canRedo).toBe(false);
    expect(h.snapshot.get().current).toBe(1);
  });

  it('notifies subscribers as availability changes', () => {
    const h = createHistory<number>({ initialState: 0 });
    const seen: Array<{ canUndo: boolean; canRedo: boolean }> = [];
    // nanostores subscribe fires immediately with the current value, then on change
    const unsubscribe = h.snapshot.subscribe((s) =>
      seen.push({ canUndo: s.canUndo, canRedo: s.canRedo }),
    );

    h.push(1);
    h.undo();
    unsubscribe();
    h.push(2); // after unsubscribe -> not observed

    expect(seen).toEqual([
      { canUndo: false, canRedo: false }, // immediate
      { canUndo: true, canRedo: false }, // push
      { canUndo: false, canRedo: true }, // undo
    ]);
  });

  it('records a batch as a single undo step', () => {
    const h = createHistory<number>({ initialState: 0 });
    h.batch(() => {
      h.push(1);
      h.push(2);
      h.push(3);
    });
    expect(h.snapshot.get().current).toBe(3);
    expect(h.snapshot.get().undoCount).toBe(1);

    h.undo();
    expect(h.snapshot.get().current).toBe(0);
  });

  it('clear resets the snapshot to the initial state', () => {
    const h = createHistory<number>({ initialState: 0 });
    h.push(1);
    h.push(2);
    h.clear();
    expect(h.snapshot.get()).toEqual({ current: 0, ...EMPTY });
  });

  it('skips duplicate pushes via isEqual (no snapshot change)', () => {
    const h = createHistory<{ n: number }>({
      initialState: { n: 0 },
      isEqual: (a, b) => a.n === b.n,
    });
    h.push({ n: 0 }); // equal -> skipped
    expect(h.snapshot.get().canUndo).toBe(false);
    h.push({ n: 1 }); // changed -> recorded
    expect(h.snapshot.get().canUndo).toBe(true);
  });
});
