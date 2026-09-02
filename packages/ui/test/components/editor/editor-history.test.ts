import { describe, expect, it } from 'vitest';
import { createEditorHistory } from '../../../src/components/editor/editor-history';
import type { EditorSelection } from '../../../src/components/editor/editor-history';
import type { BaseBlock } from '../../../src/primitives/types';

const block = (id: string, text: string): BaseBlock => ({
  id,
  type: 'text',
  content: [{ text }],
});

const at = (blockId: string, offset: number) => ({ blockId, offset });
const collapsed = (blockId: string, offset: number): EditorSelection => ({
  anchor: at(blockId, offset),
  focus: at(blockId, offset),
});

// -----------------------------------------------------------------------
// Functional tests -- from the issue's pinned interface contract verbatim.
// -----------------------------------------------------------------------

describe('editor history core', () => {
  it('typing into a selection replaces it, and undo carries the selection back', () => {
    const h = createEditorHistory({
      doc: [block('b1', 'hello')],
      sel: { anchor: at('b1', 2), focus: at('b1', 5) }, // he[llo]
    });

    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'y' }] });

    // insertText/removeText canonicalize markless content back to a plain
    // string (ops/content.ts's collapseIfPlain, #2105) rather than
    // gratuitously upgrading it to InlineContent[] -- content is still
    // InlineContent[]-native end to end (ops carry it; marks survive undo),
    // this is just the canonical rendering of markless text.
    expect(h.memory.get().doc[0]?.content).toEqual('hey');
    expect(h.memory.get().sel).toEqual(collapsed('b1', 3)); // hey|

    h.controls.undo();
    expect(h.memory.get().doc[0]?.content).toEqual('hello');
    expect(h.memory.get().sel).toEqual({ anchor: at('b1', 2), focus: at('b1', 5) }); // he[llo]
  });

  it('canUndo/canRedo are derived from the cell, never stored as separate fields', () => {
    const h = createEditorHistory({ doc: [block('b1', '')], sel: collapsed('b1', 0) });
    expect(h.canUndo).toBe(false);

    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 0, text: [{ text: 'hi' }] });
    expect(h.canUndo).toBe(true);
    expect(h.memory.get().done.length).toBe(1); // the fact canUndo reads, in the cell
    expect('canUndo' in h.memory.get()).toBe(false);
    expect('canRedo' in h.memory.get()).toBe(false);
    expect(Object.keys(h.memory.get()).sort()).toEqual(['doc', 'done', 'sel', 'undone']);
  });

  it('caps done at config.cap, dropping the oldest entries', () => {
    const h = createEditorHistory(
      { doc: [block('b1', '')], sel: collapsed('b1', 0) },
      { cap: 100 },
    );
    for (let i = 0; i < 150; i++) {
      h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: i, text: [{ text: 'x' }] });
      h.controls.closeGroup(); // force each op to be its own step for this assertion
    }
    expect(h.memory.get().done.length).toBe(100); // capped, oldest 50 dropped
    for (let i = 0; i < 100; i++) h.controls.undo();
    expect(h.canUndo).toBe(false); // only 100 entries were ever retained
  });

  it('applyExcluded bypasses the op-log, leaving done/undone unchanged (not merely empty)', () => {
    const h = createEditorHistory({ doc: [block('b1', 'a')], sel: collapsed('b1', 1) });
    // Seed non-empty done AND undone first, so "unchanged" is distinguishable
    // from "cleared" -- a buggy applyExcluded that reset undone to [] would
    // pass a test that started from empty stacks.
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 1, text: [{ text: 'b' }] });
    h.controls.closeGroup();
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'c' }] });
    h.controls.undo();
    const before = h.memory.get();
    expect(before.done.length).toBe(1);
    expect(before.undone.length).toBe(1);

    h.controls.applyExcluded({
      kind: 'insertText',
      blockId: 'b1',
      offset: 2,
      text: [{ text: '-remote' }],
    });

    const after = h.memory.get();
    expect(after.doc[0]?.content).toEqual('ab-remote'); // current doc was 'ab' (the 'c' insert is undone)
    expect(after.done).toEqual(before.done); // unchanged, not cleared
    expect(after.undone).toEqual(before.undone); // unchanged, not cleared
    expect(after.done.length).toBe(1);
    expect(after.undone.length).toBe(1);
  });
});

// -----------------------------------------------------------------------
// Single-cell / single-subscriber acceptance (FR-EDITOR-002 verification).
// -----------------------------------------------------------------------

describe('one cell, one subscriber', () => {
  it('every apply/undo/redo writes the memory cell exactly once, in order, for a single subscriber', () => {
    const h = createEditorHistory({ doc: [block('b1', '')], sel: collapsed('b1', 0) });
    const emitted: Array<{ doc: number; done: number; undone: number }> = [];
    const textLength = (content: string | { text: string }[] | undefined): number =>
      typeof content === 'string'
        ? content.length
        : (content ?? []).reduce((n, r) => n + r.text.length, 0);
    h.memory.subscribe((s) => {
      emitted.push({
        doc: textLength(s.doc[0]?.content),
        done: s.done.length,
        undone: s.undone.length,
      });
    });

    expect(emitted).toHaveLength(1); // fires immediately with the seed value

    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 0, text: [{ text: 'ab' }] });
    h.controls.closeGroup();
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'c' }] });
    h.controls.undo();
    h.controls.redo();

    expect(emitted).toHaveLength(5); // seed + 4 writes, no extra/double writes
    expect(emitted[1]).toEqual({ doc: 2, done: 1, undone: 0 });
    expect(emitted[2]).toEqual({ doc: 3, done: 2, undone: 0 });
    expect(emitted[3]).toEqual({ doc: 2, done: 1, undone: 1 }); // undo
    expect(emitted[4]).toEqual({ doc: 3, done: 2, undone: 0 }); // redo
  });

  it('done and undone are fields of the same EditorHistoryState object as doc/sel', () => {
    const h = createEditorHistory({ doc: [block('b1', '')], sel: collapsed('b1', 0) });
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 0, text: [{ text: 'x' }] });
    const state = h.memory.get();
    expect(state).toHaveProperty('doc');
    expect(state).toHaveProperty('sel');
    expect(state).toHaveProperty('done');
    expect(state).toHaveProperty('undone');
  });
});

// -----------------------------------------------------------------------
// Redo id-stability (pinned contract point 6 / AMENDMENT B).
// -----------------------------------------------------------------------

describe('redo replays pre-assigned ids verbatim', () => {
  it('redo of a split reproduces the same block id, and later ops addressing it still resolve', () => {
    const h = createEditorHistory({
      doc: [block('b1', 'hello world')],
      sel: collapsed('b1', 5),
    });

    h.controls.apply({ kind: 'split', blockId: 'b1', offset: 5, newBlockId: 'b2' });
    expect(h.memory.get().doc.map((b) => b.id)).toEqual(['b1', 'b2']);

    h.controls.undo();
    expect(h.memory.get().doc.map((b) => b.id)).toEqual(['b1']);

    h.controls.redo();
    expect(h.memory.get().doc.map((b) => b.id)).toEqual(['b1', 'b2']); // same id, no re-mint

    // A later stack entry addressing 'b2' still resolves against the redo-produced block.
    h.controls.apply({ kind: 'insertText', blockId: 'b2', offset: 0, text: [{ text: '>' }] });
    expect(h.memory.get().doc[1]?.content).toEqual('> world');
  });
});

// -----------------------------------------------------------------------
// Coalescing (NFR-EDITOR-003).
// -----------------------------------------------------------------------

describe('coalescing', () => {
  it('a run of same-kind, adjacent-offset inserts within the coalescing window collapses into one undo step', () => {
    const h = createEditorHistory({ doc: [block('b1', '')], sel: collapsed('b1', 0) });

    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 0, text: [{ text: 'a' }] });
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 1, text: [{ text: 'b' }] });
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'c' }] });

    expect(h.memory.get().doc[0]?.content).toEqual('abc');
    expect(h.memory.get().done.length).toBe(1); // one coalesced entry

    h.controls.undo();
    expect(h.memory.get().doc[0]?.content).toEqual(''); // whole run unwound at once
    expect(h.canUndo).toBe(false);
  });

  it('closeGroup() forces a boundary so the next edit does not coalesce, even inside the window', () => {
    const h = createEditorHistory({ doc: [block('b1', '')], sel: collapsed('b1', 0) });

    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 0, text: [{ text: 'a' }] });
    h.controls.closeGroup();
    h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: 1, text: [{ text: 'b' }] });

    expect(h.memory.get().doc[0]?.content).toEqual('ab');
    expect(h.memory.get().done.length).toBe(2); // NOT coalesced

    h.controls.undo();
    expect(h.memory.get().doc[0]?.content).toEqual('a'); // only the second edit unwound
  });
});

// -----------------------------------------------------------------------
// Caret-notation BDD scenarios, seeded from RESEARCH-EDITOR-PROTOTYPE's
// editor.bdd.test.mjs (17/17 model-level), re-expressed over
// applyOp/TextOp via createEditorHistory's controls -- doc is BaseBlock[]
// with a single block 'b1' carrying InlineContent[] content, not a flat
// string. There are no type()/backspace()/del() intent methods on
// EditorHistoryControls (a later DOM-binding issue builds those); the
// helpers below play that caller role for the test, exactly as the
// prototype's caret notation intends.
// -----------------------------------------------------------------------

function parseCaret(notation: string): { text: string; sel: EditorSelection } {
  if (notation.includes('[')) {
    const start = notation.indexOf('[');
    const afterStart = notation.replace('[', '');
    const end = afterStart.indexOf(']');
    return {
      text: afterStart.replace(']', ''),
      sel: { anchor: at('b1', start), focus: at('b1', end) },
    };
  }
  const start = notation.indexOf('|');
  return { text: notation.replace('|', ''), sel: collapsed('b1', start) };
}

function serializeCaret(text: string, sel: EditorSelection): string {
  const [a, b] = orderedOffsets(sel);
  if (a === b) return `${text.slice(0, a)}|${text.slice(a)}`;
  return `${text.slice(0, a)}[${text.slice(a, b)}]${text.slice(b)}`;
}

function orderedOffsets(sel: EditorSelection): [number, number] {
  const a = sel.anchor.offset;
  const b = sel.focus.offset;
  return a <= b ? [a, b] : [b, a];
}

function given(notation: string) {
  const { text, sel } = parseCaret(notation);
  return createEditorHistory({ doc: [block('b1', text)], sel });
}

function blockText(h: ReturnType<typeof given>): string {
  const content = h.memory.get().doc[0]?.content;
  if (typeof content === 'string') return content;
  return (content ?? []).map((run) => run.text).join('');
}

function notationOf(h: ReturnType<typeof given>): string {
  return serializeCaret(blockText(h), h.memory.get().sel);
}

function typeIntent(h: ReturnType<typeof given>, str: string): void {
  const sel = h.memory.get().sel;
  const [start] = orderedOffsets(sel);
  h.controls.apply({ kind: 'insertText', blockId: 'b1', offset: start, text: [{ text: str }] });
}

function backspaceIntent(h: ReturnType<typeof given>): void {
  const sel = h.memory.get().sel;
  if (!isCollapsedSel(sel)) {
    removeSelection(h, sel);
    return;
  }
  const offset = sel.anchor.offset;
  if (offset === 0) return; // no-op at doc start
  const text = blockText(h);
  h.controls.apply({
    kind: 'removeText',
    blockId: 'b1',
    offset: offset - 1,
    text: [{ text: text.slice(offset - 1, offset) }],
  });
}

function delIntent(h: ReturnType<typeof given>): void {
  const sel = h.memory.get().sel;
  if (!isCollapsedSel(sel)) {
    removeSelection(h, sel);
    return;
  }
  const offset = sel.anchor.offset;
  const text = blockText(h);
  if (offset >= text.length) return; // no-op at doc end
  h.controls.apply({
    kind: 'removeText',
    blockId: 'b1',
    offset,
    text: [{ text: text.slice(offset, offset + 1) }],
  });
}

function removeSelection(h: ReturnType<typeof given>, sel: EditorSelection): void {
  const [start, end] = orderedOffsets(sel);
  const text = blockText(h);
  h.controls.apply({
    kind: 'removeText',
    blockId: 'b1',
    offset: start,
    text: [{ text: text.slice(start, end) }],
  });
}

function isCollapsedSel(sel: EditorSelection): boolean {
  return sel.anchor.offset === sel.focus.offset;
}

describe('caret-notation BDD scenarios (seeded from RESEARCH-EDITOR-PROTOTYPE)', () => {
  it('type inserts at the caret', () => {
    const h = given('hel|lo');
    typeIntent(h, 'p');
    expect(notationOf(h)).toBe('help|lo');
  });

  it('type at the start of the doc', () => {
    const h = given('|abc');
    typeIntent(h, 'X');
    expect(notationOf(h)).toBe('X|abc');
  });

  it('typing into a selection replaces it', () => {
    const h = given('he[llo]');
    typeIntent(h, 'y');
    expect(notationOf(h)).toBe('hey|');
  });

  it('backspace deletes the char before the caret', () => {
    const h = given('hello|');
    backspaceIntent(h);
    expect(notationOf(h)).toBe('hell|');
  });

  it('backspace at the start of the doc is a no-op', () => {
    const h = given('|abc');
    backspaceIntent(h);
    expect(notationOf(h)).toBe('|abc');
    expect(h.canUndo).toBe(false);
  });

  it('backspace over a selection deletes the selection', () => {
    const h = given('he[llo]');
    backspaceIntent(h);
    expect(notationOf(h)).toBe('he|');
  });

  it('delete removes the char after the caret', () => {
    const h = given('hel|lo');
    delIntent(h);
    expect(notationOf(h)).toBe('hel|o');
  });

  it('undo restores the pre-typing state and caret', () => {
    const h = given('|');
    typeIntent(h, 'hello');
    expect(notationOf(h)).toBe('hello|');
    h.controls.undo();
    expect(notationOf(h)).toBe('|');
  });

  it('undo carries the selection back (selection is not re-found)', () => {
    const h = given('he[llo]');
    typeIntent(h, 'y');
    expect(notationOf(h)).toBe('hey|');
    h.controls.undo();
    expect(notationOf(h)).toBe('he[llo]');
  });

  it('redo reapplies an undone edit', () => {
    const h = given('|');
    typeIntent(h, 'hi');
    h.controls.undo();
    h.controls.redo();
    expect(notationOf(h)).toBe('hi|');
  });

  it('multi-step history unwinds one edit at a time', () => {
    const h = given('|');
    typeIntent(h, 'ab');
    // The prototype's two `type()` calls were separate undo steps by
    // construction (no coalescing existed). This module coalesces
    // same-kind adjacent-offset inserts by default (NFR-EDITOR-003), so an
    // explicit closeGroup() boundary is what expresses "two distinct
    // edits" here, matching the prototype's intent rather than gaming the
    // assertion.
    h.controls.closeGroup();
    typeIntent(h, 'c');
    expect(notationOf(h)).toBe('abc|');
    h.controls.undo();
    expect(notationOf(h)).toBe('ab|');
    h.controls.undo();
    expect(notationOf(h)).toBe('|');
  });

  it('a fresh edit after an undo forks history (redo stack drops)', () => {
    const h = given('|');
    typeIntent(h, 'a');
    // See the closeGroup() note above: forcing a boundary here reproduces
    // the prototype's "two separate edits" shape under this module's
    // default coalescing.
    h.controls.closeGroup();
    typeIntent(h, 'b');
    h.controls.undo();
    typeIntent(h, 'X');
    expect(notationOf(h)).toBe('aX|');
    expect(h.canRedo).toBe(false); // the fresh edit dropped the redo stack
    h.controls.redo(); // no-op: nothing to redo
    expect(notationOf(h)).toBe('aX|');
  });
});

// -----------------------------------------------------------------------
// Benchmark (NFR-EDITOR-001): p95 undo and p95 redo <= 16ms scaled to a
// 1000-block document.
// -----------------------------------------------------------------------

describe('history perf (NFR-EDITOR-001)', () => {
  it('p95 undo and p95 redo stay within 16ms on a 1000-block document', () => {
    const doc: BaseBlock[] = Array.from({ length: 1000 }, (_, i) =>
      block(`b${i}`, `block number ${i} has some representative body text in it`),
    );
    const h = createEditorHistory({ doc, sel: collapsed('b0', 0) }, { cap: 1000 });

    const undoSamples: number[] = [];
    const redoSamples: number[] = [];
    const iterations = 200;

    for (let i = 0; i < iterations; i++) {
      h.controls.apply({ kind: 'insertText', blockId: 'b0', offset: 0, text: [{ text: 'x' }] });
      h.controls.closeGroup();

      const undoStart = performance.now();
      h.controls.undo();
      undoSamples.push(performance.now() - undoStart);

      const redoStart = performance.now();
      h.controls.redo();
      redoSamples.push(performance.now() - redoStart);

      h.controls.undo(); // reset to baseline before the next iteration's apply
    }

    const p95 = (samples: number[]): number => {
      const sorted = [...samples].sort((a, b) => a - b);
      const index = Math.min(sorted.length - 1, Math.floor(0.95 * (sorted.length - 1)));
      return sorted[index] as number;
    };

    expect(p95(undoSamples)).toBeLessThanOrEqual(16);
    expect(p95(redoSamples)).toBeLessThanOrEqual(16);
  });
});

// -----------------------------------------------------------------------
// Relaxed `initial` seeding (#2212): `doc` and `sel` are independently
// optional, so a caller (the React `initialDocument` prop) can seed a
// document without also constructing a selection.
// -----------------------------------------------------------------------

describe('relaxed initial seeding', () => {
  it('seeding only doc defaults the selection to a collapsed caret at the first block', () => {
    const h = createEditorHistory({ doc: [block('b1', 'hello'), block('b2', 'world')] });
    expect(h.memory.get().sel).toEqual(collapsed('b1', 0));
    expect(h.memory.get().doc.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('seeding neither doc nor sel (or omitting initial entirely) keeps the existing empty-editor default', () => {
    const withEmptyObject = createEditorHistory({});
    expect(withEmptyObject.memory.get().doc).toEqual([]);
    expect(withEmptyObject.memory.get().sel).toEqual(collapsed('', 0));

    const withNoArg = createEditorHistory();
    expect(withNoArg.memory.get().doc).toEqual([]);
    expect(withNoArg.memory.get().sel).toEqual(collapsed('', 0));
  });

  it('an explicit sel is honored even when doc is also seeded', () => {
    const h = createEditorHistory({
      doc: [block('b1', 'hello'), block('b2', 'world')],
      sel: collapsed('b2', 3),
    });
    expect(h.memory.get().sel).toEqual(collapsed('b2', 3));
  });
});
