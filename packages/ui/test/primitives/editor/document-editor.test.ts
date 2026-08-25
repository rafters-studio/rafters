/**
 * document-editor.test.ts -- smoke coverage for FR-EDITOR-005's swap of this
 * primitive's history dependency from primitives/history.ts (snapshot
 * push/pop) to FR-EDITOR-002's editor-history.ts (op-based, undoable).
 *
 * document-editor.ts renders no block markup itself (the consumer does --
 * see old/ui/editor.tsx); these tests build minimal `[data-block-id]` markup
 * by hand to exercise the primitive's own event handling and public API.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createDocumentEditor } from '../../../src/primitives/editor/document-editor';
import { setCursorInBlock } from '../../../src/primitives/editor/cursor-tracker';
import type { BaseBlock } from '../../../src/primitives/types';

let container: HTMLElement;

afterEach(() => {
  container?.remove();
});

function mountContainer(): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

function renderBlock(id: string, text: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-block-id', id);
  el.textContent = text;
  container.appendChild(el);
  return el;
}

describe('createDocumentEditor (FR-EDITOR-002 history)', () => {
  it('undo/redo round-trip via a real keyboard action (Cmd+Alt+1 -> convert), publishing exactly once', () => {
    mountContainer();
    renderBlock('a', 'hello');
    const changes: BaseBlock[][] = [];
    const editor = createDocumentEditor({
      container,
      initialBlocks: [{ id: 'a', type: 'text', content: 'hello' }],
      onBlocksChange: (blocks) => changes.push(blocks),
    });

    expect(editor.$state.get()).toMatchObject({ canUndo: false, canRedo: false });

    setCursorInBlock(container, 'a', 0);
    container.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '1',
        metaKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(editor.$state.get().canUndo).toBe(true);
    expect(editor.$state.get().blocks[0]).toMatchObject({ id: 'a', type: 'heading' });
    expect(changes).toHaveLength(1); // one user action, one publish

    editor.undo();
    expect(editor.$state.get().canUndo).toBe(false);
    expect(editor.$state.get().canRedo).toBe(true);
    expect(editor.$state.get().blocks[0]).toMatchObject({ id: 'a', type: 'text' });

    editor.redo();
    expect(editor.$state.get().canUndo).toBe(true);
    expect(editor.$state.get().blocks[0]).toMatchObject({ id: 'a', type: 'heading' });

    editor.destroy();
  });

  it('reconcileDOM batches a changed block into ONE publish, never exposing the transient empty-content step', () => {
    mountContainer();
    const blockEl = renderBlock('a', 'hello');
    const changes: BaseBlock[][] = [];
    const editor = createDocumentEditor({
      container,
      initialBlocks: [{ id: 'a', type: 'text', content: 'hello' }],
      onBlocksChange: (blocks) => changes.push(blocks),
    });

    // Simulate what native contenteditable editing would have already done
    // to the DOM (browser mutates first, THEN fires `input`) -- the
    // reconciler's job is to read this back into the model.
    blockEl.textContent = 'hello world';
    container.dispatchEvent(
      new InputEvent('input', { inputType: 'insertText', data: ' world', bubbles: true }),
    );

    expect(changes).toHaveLength(1); // NOT one publish per internal op
    expect(changes[0]?.[0]?.content).toBe('hello world'); // final state, never the empty intermediate
    expect(editor.$state.get().blocks[0]?.content).toBe('hello world');
    expect(editor.$state.get().canUndo).toBe(true);

    // Two `done` entries land here (a removeText + an insertText -- see
    // commitReconciled's own doc comment: FR-EDITOR-003 has no whole-block
    // "replace content" op, so a content diff is two ops, two undo steps),
    // so full round-trip back to the original text takes two undos.
    editor.undo();
    expect(editor.$state.get().blocks[0]?.content).toBe('');
    editor.undo();
    expect(editor.$state.get().blocks[0]?.content).toBe('hello');
    expect(editor.$state.get().canUndo).toBe(false);

    editor.destroy();
  });

  it('setBlocks replaces the doc and is reflected in $state and onBlocksChange (op-log bypass, by design)', () => {
    mountContainer();
    const changes: BaseBlock[][] = [];
    const editor = createDocumentEditor({
      container,
      initialBlocks: [{ id: 'a', type: 'text', content: 'hello' }],
      onBlocksChange: (blocks) => changes.push(blocks),
    });

    editor.setBlocks([{ id: 'z', type: 'text', content: 'fresh' }]);

    expect(editor.$state.get().blocks).toEqual([{ id: 'z', type: 'text', content: 'fresh' }]);
    expect(changes.at(-1)).toEqual([{ id: 'z', type: 'text', content: 'fresh' }]);
    // A wholesale replace has no derived op sequence back to the prior doc
    // (FR-EDITOR-003 has no such op) -- not undoable through this history,
    // by design (see document-editor.ts's setBlocks doc comment).
    expect(editor.$state.get().canUndo).toBe(false);

    editor.destroy();
  });

  it('addBlocks inserts at an index and is reflected in $state and onBlocksChange', () => {
    mountContainer();
    const changes: BaseBlock[][] = [];
    const editor = createDocumentEditor({
      container,
      initialBlocks: [{ id: 'a', type: 'text', content: 'first' }],
      onBlocksChange: (blocks) => changes.push(blocks),
    });

    editor.addBlocks([{ id: 'b', type: 'text', content: 'second' }], 1);

    expect(editor.$state.get().blocks.map((b) => b.id)).toEqual(['a', 'b']);
    expect(changes.at(-1)?.map((b) => b.id)).toEqual(['a', 'b']);

    editor.destroy();
  });
});
