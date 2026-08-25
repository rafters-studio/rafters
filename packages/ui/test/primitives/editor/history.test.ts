import { describe, expect, it } from 'vitest';
import { createHistory } from '../../../src/primitives/editor/history';

describe('createHistory', () => {
  it('tracks state changes', () => {
    const history = createHistory({ initialState: 0 });

    expect(history.getState().current).toBe(0);

    history.push(1);
    expect(history.getState().current).toBe(1);

    history.push(2);
    expect(history.getState().current).toBe(2);

    history.push(3);
    expect(history.getState().current).toBe(3);
  });

  it('undoes to previous state', () => {
    const history = createHistory({ initialState: 'a' });

    history.push('b');
    history.push('c');

    expect(history.getState().current).toBe('c');
    expect(history.getState().canUndo).toBe(true);
    expect(history.getState().undoCount).toBe(2);

    const result = history.undo();
    expect(result).toBe('b');
    expect(history.getState().current).toBe('b');
    expect(history.getState().undoCount).toBe(1);

    const result2 = history.undo();
    expect(result2).toBe('a');
    expect(history.getState().current).toBe('a');
    expect(history.getState().undoCount).toBe(0);
    expect(history.getState().canUndo).toBe(false);
  });

  it('redoes to next state', () => {
    const history = createHistory({ initialState: 1 });

    history.push(2);
    history.push(3);

    history.undo();
    history.undo();

    expect(history.getState().current).toBe(1);
    expect(history.getState().canRedo).toBe(true);
    expect(history.getState().redoCount).toBe(2);

    const result = history.redo();
    expect(result).toBe(2);
    expect(history.getState().current).toBe(2);
    expect(history.getState().redoCount).toBe(1);

    const result2 = history.redo();
    expect(result2).toBe(3);
    expect(history.getState().current).toBe(3);
    expect(history.getState().redoCount).toBe(0);
    expect(history.getState().canRedo).toBe(false);
  });

  it('batches multiple changes into single undo step', () => {
    const history = createHistory({ initialState: '' });

    history.batch(() => {
      history.push('a');
      history.push('ab');
      history.push('abc');
    });

    expect(history.getState().current).toBe('abc');
    expect(history.getState().undoCount).toBe(1);

    const result = history.undo();
    expect(result).toBe('');
    expect(history.getState().current).toBe('');
    expect(history.getState().undoCount).toBe(0);
  });

  it('enforces history limit', () => {
    const history = createHistory({ initialState: 0, limit: 3 });

    history.push(1);
    history.push(2);
    history.push(3);
    history.push(4);
    history.push(5);

    // Current is 5, past should only have 3 entries: [2, 3, 4]
    expect(history.getState().current).toBe(5);
    expect(history.getState().undoCount).toBe(3);

    // Oldest entries should be dropped
    history.undo(); // back to 4
    history.undo(); // back to 3
    history.undo(); // back to 2

    expect(history.getState().current).toBe(2);
    expect(history.getState().canUndo).toBe(false);
  });

  it('skips duplicate states with isEqual', () => {
    const history = createHistory({
      initialState: { x: 0, y: 0 },
      isEqual: (a, b) => a.x === b.x && a.y === b.y,
    });

    history.push({ x: 1, y: 0 });
    history.push({ x: 1, y: 0 }); // duplicate, should be skipped
    history.push({ x: 1, y: 0 }); // duplicate, should be skipped
    history.push({ x: 2, y: 0 });

    expect(history.getState().undoCount).toBe(2);

    const result = history.undo();
    expect(result).toEqual({ x: 1, y: 0 });

    const result2 = history.undo();
    expect(result2).toEqual({ x: 0, y: 0 });
  });

  it('returns null from undo when at beginning', () => {
    const history = createHistory({ initialState: 'start' });

    const result = history.undo();
    expect(result).toBeNull();
    expect(history.getState().current).toBe('start');
  });

  it('returns null from redo when at end', () => {
    const history = createHistory({ initialState: 'start' });

    history.push('end');

    const result = history.redo();
    expect(result).toBeNull();
    expect(history.getState().current).toBe('end');
  });

  it('clears redo stack on push', () => {
    const history = createHistory({ initialState: 0 });

    history.push(1);
    history.push(2);
    history.push(3);

    history.undo();
    history.undo();

    expect(history.getState().current).toBe(1);
    expect(history.getState().redoCount).toBe(2);

    // Push new state should clear redo
    history.push(10);

    expect(history.getState().current).toBe(10);
    expect(history.getState().redoCount).toBe(0);
    expect(history.getState().canRedo).toBe(false);
  });

  it('clears history to initial state', () => {
    const history = createHistory({ initialState: 'init' });

    history.push('a');
    history.push('b');
    history.push('c');

    history.undo();

    expect(history.getState().undoCount).toBe(2);
    expect(history.getState().redoCount).toBe(1);

    history.clear();

    expect(history.getState().current).toBe('init');
    expect(history.getState().undoCount).toBe(0);
    expect(history.getState().redoCount).toBe(0);
    expect(history.getState().canUndo).toBe(false);
    expect(history.getState().canRedo).toBe(false);
  });

  it('handles nested batch calls', () => {
    const history = createHistory({ initialState: 0 });

    history.batch(() => {
      history.push(1);
      history.batch(() => {
        history.push(2);
        history.push(3);
      });
      history.push(4);
    });

    expect(history.getState().current).toBe(4);
    expect(history.getState().undoCount).toBe(1);

    history.undo();
    expect(history.getState().current).toBe(0);
  });

  it('skips batch recording when no state change', () => {
    const history = createHistory({
      initialState: 'same',
      isEqual: (a, b) => a === b,
    });

    history.batch(() => {
      // No push calls
    });

    expect(history.getState().undoCount).toBe(0);

    history.batch(() => {
      history.push('same'); // Same as initial, should be skipped
    });

    expect(history.getState().undoCount).toBe(0);
  });

  it('works with complex object states', () => {
    interface EditorState {
      content: string;
      selection: { start: number; end: number };
    }

    const history = createHistory<EditorState>({
      initialState: { content: '', selection: { start: 0, end: 0 } },
    });

    history.push({ content: 'Hello', selection: { start: 5, end: 5 } });
    history.push({ content: 'Hello World', selection: { start: 11, end: 11 } });

    expect(history.getState().current).toEqual({
      content: 'Hello World',
      selection: { start: 11, end: 11 },
    });

    const prev = history.undo();
    expect(prev).toEqual({
      content: 'Hello',
      selection: { start: 5, end: 5 },
    });
  });

  it('maintains correct state after undo/redo/push sequence', () => {
    const history = createHistory({ initialState: 'a' });

    history.push('b');
    history.push('c');
    history.push('d');

    history.undo(); // -> c
    history.undo(); // -> b

    history.push('e'); // Clears redo (c, d)

    expect(history.getState().current).toBe('e');
    expect(history.getState().undoCount).toBe(2); // a, b

    history.undo(); // -> b
    history.undo(); // -> a

    expect(history.getState().current).toBe('a');
    expect(history.getState().canUndo).toBe(false);
    expect(history.getState().redoCount).toBe(2); // b, e
  });
});

const EMPTY = { canUndo: false, canRedo: false, undoCount: 0, redoCount: 0 };

describe('createHistory reactive snapshot', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory<number>({ initialState: 0 });
    expect(h.snapshot.get()).toEqual({ current: 0, ...EMPTY });
  });

  it('getState() reflects the live snapshot values', () => {
    const h = createHistory<number>({ initialState: 0 });
    expect(h.getState()).toEqual({ current: 0, ...EMPTY });
    h.push(1);
    expect(h.getState().current).toBe(1);
    expect(h.getState().canUndo).toBe(true);
    expect(h.getState().undoCount).toBe(1);
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
    const unsubscribe = h.snapshot.subscribe((s) =>
      seen.push({ canUndo: s.canUndo, canRedo: s.canRedo }),
    );

    h.push(1);
    h.undo();
    unsubscribe();
    h.push(2);

    expect(seen).toEqual([
      { canUndo: false, canRedo: false },
      { canUndo: true, canRedo: false },
      { canUndo: false, canRedo: true },
    ]);
  });

  it('emits one notification per batch, not one per push', () => {
    const h = createHistory<number>({ initialState: 0 });
    const seen: number[] = [];
    h.snapshot.subscribe((s) => seen.push(s.current));
    h.batch(() => {
      h.push(1);
      h.push(2);
      h.push(3);
    });
    expect(seen).toEqual([0, 3]);
  });

  it('exposes a Memory: select fires only when the chosen slice changes', () => {
    const h = createHistory<number>({ initialState: 0 });
    const undoStates: boolean[] = [];
    h.snapshot.select(
      (s) => s.canUndo,
      (canUndo) => undoStates.push(canUndo),
    );
    h.push(1);
    h.push(2);
    expect(undoStates).toEqual([true]);
  });
});
