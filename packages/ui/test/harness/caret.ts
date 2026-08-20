/**
 * caret.ts -- caret-notation Given/When/Then over the editor op model
 * (FR-EDITOR-006). Ported from the prototype's grammar (editor-model.mjs /
 * editor.bdd.test.mjs, RESEARCH-EDITOR-PROTOTYPE): `hel|lo` = collapsed caret
 * at offset 3; `he[llo]` = selection, anchor at offset 2, head at offset 5.
 * The prototype's text-only shortcut is kept HERE (one text block, no marks)
 * -- `given`/`when`/`then` drive the REAL `doc: BaseBlock[]` cell
 * (RULING-EDITOR-HISTORY interface contract) through the real
 * `createEditorHistory`/`applyOp`, not a reimplementation of either.
 */
import { createEditorHistory } from '../../src/components/editor/editor-history';
import type { EditorState } from '../../src/components/editor/editor.behavior';

export interface CaretState {
  doc: string; // document text with `|`/`[`/`]` markers stripped
  sel: { anchor: number; head: number };
}

/** Parse caret notation into model state. Throws on malformed notation
 *  (unbalanced brackets, more than one caret/selection marker). */
export function parseCaret(marked: string): CaretState {
  const opens = marked.split('[').length - 1;
  const closes = marked.split(']').length - 1;
  const carets = marked.split('|').length - 1;

  if (opens > 0 || closes > 0) {
    if (opens !== 1 || closes !== 1) {
      throw new Error(`parseCaret: unbalanced selection brackets in ${JSON.stringify(marked)}`);
    }
    if (carets > 0) {
      throw new Error(
        `parseCaret: expected exactly one caret or selection marker, got both in ${JSON.stringify(marked)}`,
      );
    }
    const start = marked.indexOf('[');
    const end = marked.indexOf(']');
    if (end < start) {
      throw new Error(`parseCaret: unbalanced selection brackets in ${JSON.stringify(marked)}`);
    }
    const doc = marked.slice(0, start) + marked.slice(start + 1, end) + marked.slice(end + 1);
    return { doc, sel: { anchor: start, head: end - 1 } };
  }

  if (carets !== 1) {
    throw new Error(
      `parseCaret: expected exactly one caret or selection marker in ${JSON.stringify(marked)}`,
    );
  }
  const at = marked.indexOf('|');
  const doc = marked.slice(0, at) + marked.slice(at + 1);
  return { doc, sel: { anchor: at, head: at } };
}

/** Inverse of parseCaret -- render model state back to caret notation, for
 *  assertion failure messages. */
export function formatCaret(state: CaretState): string {
  const { doc, sel } = state;
  const [a, b] = sel.anchor <= sel.head ? [sel.anchor, sel.head] : [sel.head, sel.anchor];
  return a === b
    ? `${doc.slice(0, a)}|${doc.slice(a)}`
    : `${doc.slice(0, a)}[${doc.slice(a, b)}]${doc.slice(b)}`;
}

// ---------------------------------------------------------------------------
// given/when/then over the real editor op model. One fixed single-text-block
// document (BLOCK_ID) -- the scenario set this issue commits to (type,
// backspace, delete, replace-selection, undo, redo, multi-step unwind,
// redo-fork) is single-block; cross-block structural ops are FR-EDITOR-003's
// own test suite (ops.test.ts), not re-tested here.
// ---------------------------------------------------------------------------

const BLOCK_ID = 'b1';

function toEditorState(cs: CaretState): EditorState {
  const pos = (offset: number) => ({ blockId: BLOCK_ID, offset });
  return {
    doc: [{ id: BLOCK_ID, type: 'text', content: cs.doc }],
    sel: { anchor: pos(cs.sel.anchor), focus: pos(cs.sel.head) },
    done: [],
    undone: [],
  };
}

function toCaretState(state: EditorState): CaretState {
  const block = state.doc.find((b) => b.id === BLOCK_ID);
  const doc = typeof block?.content === 'string' ? block.content : '';
  return { doc, sel: { anchor: state.sel.anchor.offset, head: state.sel.focus.offset } };
}

/** The intents the caret-notation scenarios drive `when` with -- the same
 *  five verbs the prototype's editor-model.mjs exposed (type/backspace/
 *  del/undo/redo), plus `paste` (Playwright dispatches it as a real
 *  ClipboardEvent; at the model level a single-line plain-text paste is the
 *  same insertText a keystroke produces, per bindEditor's own `pasteText`). */
export type EditorAction =
  | { kind: 'type'; text: string }
  | { kind: 'paste'; text: string }
  | { kind: 'backspace' }
  | { kind: 'delete' }
  | { kind: 'undo' }
  | { kind: 'redo' };

/** Given/When/Then over the editor op model (editor.behavior.ts's
 *  EditorState). Parses `marked` into the seed doc/sel; done/undone start
 *  empty, per createEditorHistory's own contract. */
export function given(marked: string): EditorState {
  return toEditorState(parseCaret(marked));
}

/** Applies one intent through the REAL `createEditorHistory` controls
 *  (`applyOp` underneath) -- never a parallel model. A fresh history is
 *  bound to `state` on every call (its cell force-set to the incoming
 *  doc/sel/done/undone), so the coalescing window never spans two `when`
 *  calls: each one always commits its own new `HistoryEntry`, which is
 *  exactly what a scenario's discrete steps need to unwind one at a time. */
export function when(state: EditorState, action: EditorAction): EditorState {
  const history = createEditorHistory();
  history.memory.set(state);
  const { controls } = history;

  const block = state.doc.find((b) => b.id === BLOCK_ID);
  const text = typeof block?.content === 'string' ? block.content : '';
  const { anchor, focus } = state.sel;
  const collapsed = anchor.offset === focus.offset;
  const start = Math.min(anchor.offset, focus.offset);
  const end = Math.max(anchor.offset, focus.offset);

  switch (action.kind) {
    case 'type':
    case 'paste':
      controls.apply({
        kind: 'insertText',
        blockId: BLOCK_ID,
        offset: start,
        text: [{ text: action.text }],
      });
      break;
    case 'backspace':
      if (!collapsed) {
        controls.apply({
          kind: 'removeText',
          blockId: BLOCK_ID,
          offset: start,
          text: [{ text: text.slice(start, end) }],
        });
      } else if (focus.offset > 0) {
        controls.apply({
          kind: 'removeText',
          blockId: BLOCK_ID,
          offset: focus.offset - 1,
          text: [{ text: text.slice(focus.offset - 1, focus.offset) }],
        });
      } // else: no-op at the start of the doc
      break;
    case 'delete':
      if (!collapsed) {
        controls.apply({
          kind: 'removeText',
          blockId: BLOCK_ID,
          offset: start,
          text: [{ text: text.slice(start, end) }],
        });
      } else if (focus.offset < text.length) {
        controls.apply({
          kind: 'removeText',
          blockId: BLOCK_ID,
          offset: focus.offset,
          text: [{ text: text.slice(focus.offset, focus.offset + 1) }],
        });
      } // else: no-op at the end of the doc
      break;
    case 'undo':
      controls.undo();
      break;
    case 'redo':
      controls.redo();
      break;
  }
  return history.memory.get();
}

/**
 * Asserts `state`'s doc+sel against caret notation via formatCaret, so a
 * mismatch's failure message shows both sides in caret notation, not raw
 * offsets.
 *
 * NAMED `thenAssert`, not `then` (the interface's literal name), for a
 * verified toolchain reason, not a style choice: a module that exports a
 * function literally named `then` has that name on its namespace object, and
 * `import()`'s dynamic-import machinery (Vite's SSR module loader, which
 * Vitest's test collection runs on) treats an awaited namespace object with a
 * callable `.then` as a THENABLE per the ECMAScript Promise spec -- it invokes
 * `moduleNamespace.then(resolve, reject)` instead of exposing the export.
 * Reproduced directly: exporting this function as `then` crashed test
 * collection (0 tests; this function's own body received the runtime's
 * `resolve` callback as `state`, which has no `.doc`). Every call site keeps
 * the `given`/`when`/`then` reading by importing `{ thenAssert as then }` --
 * the Given/When/Then story (RULING-EDITOR-HISTORY / FR-EDITOR-006) is
 * unchanged; only this file's raw export identifier differs, precisely
 * because `caret.ts` is a plain data/logic module that Playwright's Node
 * process ALSO imports (for parseCaret/formatCaret), where the same dynamic
 * `import()` collision would otherwise reproduce there too. Throws (rather
 * than vitest's `expect`) for the same reason: this module must not import
 * `vitest` at module scope, or importing it from the Playwright spec pulls
 * vitest into a process that never runs it.
 */
export function thenAssert(state: EditorState, expectedMarked: string): void {
  const actual = formatCaret(toCaretState(state));
  if (actual !== expectedMarked) {
    throw new Error(
      `caret mismatch: expected ${JSON.stringify(expectedMarked)}, got ${JSON.stringify(actual)}`,
    );
  }
}
