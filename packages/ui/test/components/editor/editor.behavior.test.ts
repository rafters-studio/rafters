/**
 * editor.behavior.test.ts (vitest / happy-dom) -- the PURE, browser-free
 * surface of FR-EDITOR-004: `translateBeforeInput` (event -> op),
 * `projectDocument` (model -> DOM, identity-gated), and the capture-side
 * coalescing SHAPE (translateBeforeInput -> controls -> one `done` entry).
 *
 * `beforeinput` CAPTURE itself is proven only in Playwright
 * (test/editor/editor-capture.e2e.ts) -- happy-dom has no real `beforeinput`
 * semantics, so no synthetic `beforeinput` is dispatched here (AC).
 */
import { describe, expect, it } from 'vitest';
import { createEditorHistory } from '../../../src/components/editor/editor-history';
import {
  editorAria,
  editorKeymap,
  parts,
  projectDocument,
  translateBeforeInput,
  type EditorConfig,
} from '../../../src/components/editor/editor.behavior';
import { applyOp } from '../../../src/components/editor/ops';
import type { BaseBlock } from '../../../src/primitives/types';
import { given, thenAssert as then, when } from '../../harness/caret';
import { EDITOR_SCENARIOS } from '../../harness/editor-scenarios';

describe('translateBeforeInput', () => {
  it('maps insertText to an insertText op at the current selection (InlineContent[] text)', () => {
    const op = translateBeforeInput(
      { inputType: 'insertText', data: 'y' },
      { anchor: { blockId: 'b1', offset: 2 }, focus: { blockId: 'b1', offset: 2 } },
    );
    expect(op).toEqual({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'y' }] });
  });

  it('inserts at the ordered start of a range selection on one block', () => {
    const op = translateBeforeInput(
      { inputType: 'insertText', data: 'z' },
      { anchor: { blockId: 'b1', offset: 5 }, focus: { blockId: 'b1', offset: 2 } },
    );
    expect(op).toEqual({ kind: 'insertText', blockId: 'b1', offset: 2, text: [{ text: 'z' }] });
  });

  it('returns null for an unhandled inputType', () => {
    const op = translateBeforeInput(
      { inputType: 'formatBold', data: null },
      { anchor: { blockId: 'b1', offset: 0 }, focus: { blockId: 'b1', offset: 0 } },
    );
    expect(op).toBeNull();
  });

  it('returns null for a delete (doc-dependent, owned by bindEditor)', () => {
    const op = translateBeforeInput(
      { inputType: 'deleteContentBackward', data: null },
      { anchor: { blockId: 'b1', offset: 3 }, focus: { blockId: 'b1', offset: 3 } },
    );
    expect(op).toBeNull();
  });
});

describe('projectDocument', () => {
  it("touches only the changed block's DOM subtree, for a real applyOp edit over 1000 blocks", () => {
    const doc: BaseBlock[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `b${i}`,
      type: 'text',
      content: 'x',
    }));

    const root = document.createElement('div');
    projectDocument(root, doc, null);

    // Real op, real structural sharing (FR-EDITOR-003) -- not a hand-built spread.
    const { blocks: nextDoc } = applyOp(doc, {
      kind: 'insertText',
      blockId: 'b500',
      offset: 1,
      text: [{ text: 'y' }],
    });
    for (let i = 0; i < 1000; i++) {
      if (i !== 500) expect(nextDoc[i]).toBe(doc[i]); // reference-equal, from applyOp itself
    }

    const b0El = root.querySelector('[data-block-id="b0"]');
    expect(b0El).not.toBeNull();
    const observer = new MutationObserver(() => {});
    (observer as MutationObserver).observe(b0El as Element, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    projectDocument(root, nextDoc, doc);

    // Drain synchronously: MutationObserver callbacks are microtask-scheduled,
    // so an assertion right after projectDocument would pass vacuously without
    // takeRecords().
    const records = observer.takeRecords();
    expect(records).toHaveLength(0); // b0's subtree saw zero mutations
    expect(root.querySelector('[data-block-id="b500"]')?.textContent).toBe('xy');

    // Negative control: the observer IS wired -- a deliberate touch of b0's
    // subtree produces records. Without this, "zero mutations" is
    // indistinguishable from "observer never fired in happy-dom".
    (b0El as Element).appendChild(document.createTextNode('!'));
    expect(observer.takeRecords().length).toBeGreaterThan(0);
    observer.disconnect();
  });

  it('adds new block elements and removes deleted ones', () => {
    const root = document.createElement('div');
    const a: BaseBlock = { id: 'a', type: 'text', content: 'one' };
    const b: BaseBlock = { id: 'b', type: 'text', content: 'two' };
    projectDocument(root, [a, b], null);
    expect(Array.from(root.children).map((c) => c.getAttribute('data-block-id'))).toEqual([
      'a',
      'b',
    ]);

    // Split a into a + c (real op), keeping a's identity? split replaces a's
    // content, so both a and the new block render; b stays reference-equal.
    const { blocks: next } = applyOp([a, b], {
      kind: 'split',
      blockId: 'a',
      offset: 1,
      newBlockId: 'c',
    });
    projectDocument(root, next, [a, b]);
    const ids = Array.from(root.children).map((c) => c.getAttribute('data-block-id'));
    expect(ids).toEqual(['a', 'c', 'b']);
  });

  it('renders an empty block as a <br> so it can hold a caret', () => {
    const root = document.createElement('div');
    projectDocument(root, [{ id: 'e', type: 'text', content: '' }], null);
    const el = root.querySelector('[data-block-id="e"]');
    expect(el?.querySelector('br')).not.toBeNull();
    expect(el?.textContent).toBe('');
  });
});

describe('capture-side coalescing shape (translateBeforeInput -> controls)', () => {
  it('coalesces a run of typed characters into one done entry; closeGroup breaks it', () => {
    const first: BaseBlock = { id: 'b1', type: 'text', content: '' };
    const history = createEditorHistory({
      doc: [first],
      sel: { anchor: { blockId: 'b1', offset: 0 }, focus: { blockId: 'b1', offset: 0 } },
    });

    // Type "hey" one char at a time, each op built by translateBeforeInput from
    // the live selection (which controls.apply advances) -- the exact
    // capture-side call shape bindEditor issues.
    for (const ch of ['h', 'e', 'y']) {
      const op = translateBeforeInput(
        { inputType: 'insertText', data: ch },
        history.memory.get().sel,
      );
      expect(op).not.toBeNull();
      history.controls.apply(op as NonNullable<typeof op>);
    }
    expect(history.memory.get().done).toHaveLength(1); // coalesced within the window

    // A forced boundary starts a new entry even inside the coalescing window.
    history.controls.closeGroup();
    const op = translateBeforeInput(
      { inputType: 'insertText', data: '!' },
      history.memory.get().sel,
    );
    history.controls.apply(op as NonNullable<typeof op>);
    expect(history.memory.get().done).toHaveLength(2);

    // The doc reflects every op (sanity that the shape actually applied).
    const block = history.memory.get().doc.find((b) => b.id === 'b1');
    expect(block?.content).toBe('hey!');
  });
});

// -----------------------------------------------------------------------------
// The editor score (FR-EDITOR-005) -- parts, editorAria, editorKeymap.
// -----------------------------------------------------------------------------

describe('parts', () => {
  it('declares exactly one part, root, with role: textbox', () => {
    expect(Object.keys(parts)).toEqual(['root']);
    expect(parts.root.role).toBe('textbox');
  });
});

describe('editorAria', () => {
  const config: EditorConfig = { label: 'Document' };
  const { memory } = createEditorHistory();
  const state = memory.get();

  it('projects role, aria-multiline, and aria-label from config.label', () => {
    expect(editorAria(state, config, { root: 'doc-1' }).root).toMatchObject({
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': 'Document',
    });
  });

  it('projects aria-labelledby instead when config.labelledBy is set', () => {
    const byId: EditorConfig = { labelledBy: 'external-heading' };
    const projection = editorAria(state, byId, { root: 'doc-1' }).root;
    expect(projection).toMatchObject({
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-labelledby': 'external-heading',
    });
    expect(projection?.['aria-label']).toBeUndefined();
  });
});

describe('editorKeymap', () => {
  const config: EditorConfig = { label: 'Document' };
  const { memory } = createEditorHistory();
  const state = memory.get();

  it('claims Cmd+Z and Ctrl+Z as undo', () => {
    expect(editorKeymap({ key: 'z', metaKey: true }, state, 'root', config)).toBe('undo');
    expect(editorKeymap({ key: 'z', ctrlKey: true }, state, 'root', config)).toBe('undo');
  });

  it('claims Cmd+Shift+Z and Ctrl+Shift+Z as redo', () => {
    expect(editorKeymap({ key: 'z', metaKey: true, shiftKey: true }, state, 'root', config)).toBe(
      'redo',
    );
    expect(editorKeymap({ key: 'z', ctrlKey: true, shiftKey: true }, state, 'root', config)).toBe(
      'redo',
    );
  });

  it('claims the shifted-character chord a real browser sends for Shift', () => {
    // KeyboardEvent.key reports the shifted character ('Z', not 'z') when
    // Shift is held -- a strict `key === 'z'` check would pass the fixture
    // above and still silently fail in a real browser.
    expect(editorKeymap({ key: 'Z', metaKey: true, shiftKey: true }, state, 'root', config)).toBe(
      'redo',
    );
  });

  it('leaves every other key unclaimed, including plain character input', () => {
    expect(editorKeymap({ key: 'a' }, state, 'root', config)).toBeNull();
    expect(editorKeymap({ key: 'z' }, state, 'root', config)).toBeNull(); // no modifier
    expect(editorKeymap({ key: 'y', metaKey: true }, state, 'root', config)).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Caret-notation BDD (FR-EDITOR-006) -- DOM-free, model-level scenarios over
// editor.behavior.ts's EditorState via the caret.ts Given/When/Then. The
// IDENTICAL named scenarios (EDITOR_SCENARIOS) replay through a real
// contenteditable in test/editor/editor-capture.e2e.ts (Playwright); this is
// the one authored list, not a re-authored duplicate.
// -----------------------------------------------------------------------------

describe('caret-notation BDD scenarios', () => {
  for (const scenario of EDITOR_SCENARIOS) {
    it(scenario.name, () => {
      let state = given(scenario.given);
      for (const step of scenario.steps) {
        state = when(state, step.action);
        then(state, step.expected);
      }
    });
  }
});

describe('caret-notation BDD: canUndo/canRedo (FR-EDITOR-006 functional test, verbatim)', () => {
  it('undo restores document AND selection (the canonical scenario)', () => {
    const typed = when(given('he[llo]'), { kind: 'type', text: 'y' });
    then(typed, 'hey|');
    then(when(typed, { kind: 'undo' }), 'he[llo]');
  });

  it('canUndo/canRedo are derived, never stored', () => {
    const initial = given('hello|');
    expect(initial.done.length === 0).toBe(true); // canUndo false
    const edited = when(initial, { kind: 'type', text: '!' });
    expect(edited.done.length > 0).toBe(true); // canUndo true
    expect(edited.undone.length === 0).toBe(true); // canRedo false, nothing undone yet
    const undone = when(edited, { kind: 'undo' });
    expect(undone.done.length === 0).toBe(true); // canUndo false again
    expect(undone.undone.length > 0).toBe(true); // canRedo true
  });
});
