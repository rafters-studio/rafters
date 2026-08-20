/**
 * editor.behavior.ts -- controlled contenteditable binding (FR-EDITOR-004).
 *
 * `bindEditor` intercepts `beforeinput`, translates each input into an
 * `EditorOp` applied through the editor history's `controls`, `preventDefault`s
 * so the MODEL owns the edit (the browser never mutates the contenteditable),
 * projects model state -> DOM (`projectDocument`), and restores the DOM
 * selection from `state.sel` after every render.
 *
 * Per RULING-EDITOR-HISTORY's pinned "Editor interface contract" this file
 * composes `createEditorHistory` (FR-EDITOR-002) and `applyOp`'s op vocabulary
 * (FR-EDITOR-003) DIRECTLY -- there is NO import of `compose`, `createBehavior`,
 * or `BehaviorSpec`; the editor is out of the behavior-layer composer (frozen
 * Spec 00). It borrows only the Spec 05 `bindX` LIFECYCLE (read config off
 * `root`'s `data-*`, subscribe to the memory cell, render on change, restore
 * selection, return a teardown).
 */
import { z } from 'zod';
import { createClipboard } from '../../primitives/clipboard';
import { createInputHandler } from '../../primitives/input-events';
import type { BaseBlock, InlineContent } from '../../primitives/types';
import type { EditorHistoryState } from './editor-history';
import { createEditorHistory } from './editor-history';
import { normalizeRuns, splitRuns, totalTextLength } from './ops/content';
import type { EditorOp } from './ops';

// ---------------------------------------------------------------------------
// Config parsing (external data off `root`'s data-* attributes -> Zod).
// ---------------------------------------------------------------------------

const inlineContentSchema = z.object({
  text: z.string(),
  marks: z.array(z.enum(['bold', 'italic', 'code', 'strikethrough', 'link'])).optional(),
  href: z.string().optional(),
});

const baseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.union([z.string(), z.array(inlineContentSchema)]).optional(),
  children: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const docSchema = z.array(baseBlockSchema);
const caretSchema = z.object({ blockId: z.string(), offset: z.number() });

function parseSeed(root: HTMLElement): Pick<EditorHistoryState, 'doc' | 'sel'> {
  const rawDoc = root.dataset.initialDoc;
  // Zod validates the external shape; the inferred `optional` fields widen to
  // `... | undefined`, so narrow back to BaseBlock[] for the history seed.
  const doc = (rawDoc ? docSchema.parse(JSON.parse(rawDoc)) : []) as BaseBlock[];

  const rawCaret = root.dataset.caret;
  const firstId = doc[0]?.id ?? '';
  const caret = rawCaret
    ? caretSchema.parse(JSON.parse(rawCaret))
    : { blockId: firstId, offset: 0 };

  const pos = { blockId: caret.blockId, offset: caret.offset };
  return { doc, sel: { anchor: pos, focus: pos } };
}

// ---------------------------------------------------------------------------
// Selection arithmetic helpers (generic, doc-free).
// ---------------------------------------------------------------------------

function isCollapsed(sel: EditorHistoryState['sel']): boolean {
  return sel.anchor.blockId === sel.focus.blockId && sel.anchor.offset === sel.focus.offset;
}

/** The block id + offset the caret/anchor of an edit acts at. For a range on
 *  one block this is the ordered start; otherwise the focus position. */
function caretStart(sel: EditorHistoryState['sel']): { blockId: string; offset: number } {
  if (sel.anchor.blockId === sel.focus.blockId) {
    return { blockId: sel.focus.blockId, offset: Math.min(sel.anchor.offset, sel.focus.offset) };
  }
  return { blockId: sel.focus.blockId, offset: sel.focus.offset };
}

/** Slice content to [start, end) preserving marks/href per run -- identical to
 *  the splice `removeText` itself computes (both go through `splitRuns`), so a
 *  `removeText` op built from this slice passes `removeText`'s exact
 *  `runsEqual` check instead of throwing. */
function sliceContent(
  content: string | InlineContent[] | undefined,
  start: number,
  end: number,
): InlineContent[] {
  const runs = normalizeRuns(content);
  const [, fromStart] = splitRuns(runs, start);
  const [middle] = splitRuns(fromStart, end - start);
  return middle;
}

function mintBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without the Web Crypto API. Block ids only need
  // to be unique within one document session, not cryptographically strong.
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// translateBeforeInput -- the PURE, doc-free translation.
// ---------------------------------------------------------------------------

/**
 * Pure translation: a native `beforeinput` event + the current selection ->
 * the `EditorOp` it represents, or `null` when the inputType is unhandled.
 *
 * Only the ops fully determined WITHOUT the document are produced here --
 * `insertText`, whose payload is `event.data`. Deletes, merges, and paste are
 * NOT translated here and return `null`: a `removeText` op carries the removed
 * `InlineContent[]`, and `removeText()` throws unless that content
 * `runsEqual`s what is actually in the block, so it cannot be constructed
 * without reading the doc. `bindEditor` owns those doc-dependent ops; this
 * function is what vitest drives without a browser, `bindEditor` is what
 * Playwright drives with one. `text` is `InlineContent[]` end to end
 * (RULING-EDITOR-HISTORY AMENDMENT A), never a bare string.
 */
export function translateBeforeInput(
  event: Pick<InputEvent, 'inputType' | 'data'>,
  sel: EditorHistoryState['sel'],
): EditorOp | null {
  switch (event.inputType) {
    case 'insertText':
    case 'insertReplacementText': {
      if (event.data == null) return null;
      const { blockId, offset } = caretStart(sel);
      return { kind: 'insertText', blockId, offset, text: [{ text: event.data }] };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// projectDocument -- model -> DOM, touching only changed blocks.
// ---------------------------------------------------------------------------

const MARK_TAG: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  code: 'code',
  strikethrough: 's',
  link: 'a',
};

/** Render one InlineContent run to a DOM node (text node, or nested mark
 *  wrappers around it). */
function renderRun(doc: Document, run: InlineContent): Node {
  let node: Node = doc.createTextNode(run.text);
  for (const mark of run.marks ?? []) {
    const tag = MARK_TAG[mark] ?? 'span';
    const wrapper = doc.createElement(tag);
    if (mark === 'link' && run.href !== undefined) wrapper.setAttribute('href', run.href);
    wrapper.appendChild(node);
    node = wrapper;
  }
  return node;
}

/** (Re)build a block element's content children from its model content. An
 *  empty block gets a single `<br>` -- as browsers render natively -- so it
 *  has height and accepts a caret; a `<br>` contributes nothing to
 *  `textContent`. */
function renderBlockContent(el: HTMLElement, block: BaseBlock): void {
  const doc = el.ownerDocument;
  el.replaceChildren();
  const runs = normalizeRuns(block.content);
  if (runs.length === 0 || totalTextLength(runs) === 0) {
    el.appendChild(doc.createElement('br'));
    return;
  }
  for (const run of runs) {
    if (run.text.length === 0) continue;
    el.appendChild(renderRun(doc, run));
  }
}

function createBlockElement(doc: Document, block: BaseBlock): HTMLElement {
  const el = doc.createElement('div');
  el.setAttribute('data-block-id', block.id);
  el.setAttribute('data-block-type', block.type);
  renderBlockContent(el, block);
  return el;
}

/**
 * Projects `doc` onto the contenteditable subtree under `root`, touching only
 * the DOM for blocks whose object identity changed since `previousDoc`
 * (NFR-EDITOR-004). Blocks reference-equal to their `previousDoc` entry are
 * left entirely untouched -- zero DOM writes for that subtree. Object-identity
 * preservation across an edit is `applyOp`'s job (FR-EDITOR-003's copy-on-write
 * convention); this function ACTS on that identity. Each block element carries
 * `data-block-id`; the bound root carries `data-part="root"`.
 */
export function projectDocument(
  root: HTMLElement,
  doc: EditorHistoryState['doc'],
  previousDoc: EditorHistoryState['doc'] | null,
): void {
  const ownerDoc = root.ownerDocument;

  const prevById = new Map<string, BaseBlock>();
  if (previousDoc) for (const block of previousDoc) prevById.set(block.id, block);

  const existing = new Map<string, HTMLElement>();
  for (const child of Array.from(root.children)) {
    const id = child.getAttribute('data-block-id');
    if (id !== null) existing.set(id, child as HTMLElement);
  }

  const docIds = new Set(doc.map((block) => block.id));
  for (const [id, el] of existing) {
    if (!docIds.has(id)) {
      el.remove();
      existing.delete(id);
    }
  }

  const desired: HTMLElement[] = [];
  for (const block of doc) {
    let el = existing.get(block.id);
    if (el === undefined) {
      el = createBlockElement(ownerDoc, block);
    } else if (prevById.get(block.id) !== block) {
      // Identity changed (or first sight of this block after a `null`
      // previousDoc): rebuild only this block's content in place.
      if (el.getAttribute('data-block-type') !== block.type) {
        el.setAttribute('data-block-type', block.type);
      }
      renderBlockContent(el, block);
    }
    desired.push(el);
  }

  // Order the children to match `doc`. Reusing an already-correctly-placed
  // element is a no-op; moving an untouched block's element is a mutation on
  // `root`, never on that block's own subtree, so it does not disturb the
  // reference-equality skip above.
  for (let i = 0; i < desired.length; i++) {
    const want = desired[i] as HTMLElement;
    const current = root.children[i] ?? null;
    if (current !== want) root.insertBefore(want, current);
  }
}

// ---------------------------------------------------------------------------
// Selection restore -- state.sel -> DOM Selection/Range.
// ---------------------------------------------------------------------------

function collectTextNodes(el: Node, out: Text[]): void {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3 /* TEXT_NODE */) out.push(child as Text);
    else collectTextNodes(child, out);
  }
}

/** Map a model (blockId, offset) to a concrete DOM (node, offset). */
function locatePosition(
  root: HTMLElement,
  pos: { blockId: string; offset: number },
): { node: Node; offset: number } | null {
  const blockEl = root.querySelector(`[data-block-id="${CSS.escape(pos.blockId)}"]`);
  if (blockEl === null) return null;

  const textNodes: Text[] = [];
  collectTextNodes(blockEl, textNodes);
  if (textNodes.length === 0) {
    // Empty block (renders a <br>): place the caret in the block element.
    return { node: blockEl, offset: 0 };
  }

  let remaining = pos.offset;
  for (const textNode of textNodes) {
    const len = textNode.data.length;
    if (remaining <= len) return { node: textNode, offset: remaining };
    remaining -= len;
  }
  const last = textNodes[textNodes.length - 1] as Text;
  return { node: last, offset: last.data.length };
}

function restoreSelection(root: HTMLElement, sel: EditorHistoryState['sel']): void {
  const view = root.ownerDocument.defaultView;
  const selection = view?.getSelection?.() ?? null;
  if (selection === null) return;

  const focus = locatePosition(root, sel.focus);
  if (focus === null) return;
  const anchor = isCollapsed(sel) ? focus : locatePosition(root, sel.anchor);
  if (anchor === null) return;

  if (typeof selection.setBaseAndExtent === 'function') {
    selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
    return;
  }
  const range = root.ownerDocument.createRange();
  range.setStart(anchor.node, anchor.offset);
  range.setEnd(focus.node, focus.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

// ---------------------------------------------------------------------------
// bindEditor -- the controlled contenteditable lifecycle.
// ---------------------------------------------------------------------------

/**
 * Bind a controlled contenteditable to a fresh editor history seeded from
 * `root`'s `data-initial-doc` / `data-caret`. Returns a teardown that removes
 * every listener and the history subscription.
 *
 * FR-EDITOR-005 EXTENDS this same export with aria/keymap wiring for
 * undo/redo; it does not add a second binder. Nothing undo/redo-keymap-shaped
 * lives here.
 */
export function bindEditor(root: HTMLElement): () => void {
  root.setAttribute('data-part', 'root');
  root.setAttribute('contenteditable', 'true');

  const history = createEditorHistory(parseSeed(root));
  const { controls, memory } = history;

  let prevDoc: BaseBlock[] | null = null;
  function render(): void {
    const state = memory.get();
    projectDocument(root, state.doc, prevDoc);
    prevDoc = state.doc;
    restoreSelection(root, state.sel);
  }

  // -- op construction for the doc-dependent inputs (deletes / structural) --

  function deleteBackwardOp(state: EditorHistoryState): EditorOp | null {
    const { sel, doc } = state;
    if (!isCollapsed(sel) && sel.anchor.blockId === sel.focus.blockId) {
      const start = Math.min(sel.anchor.offset, sel.focus.offset);
      const end = Math.max(sel.anchor.offset, sel.focus.offset);
      const block = doc.find((b) => b.id === sel.focus.blockId);
      return {
        kind: 'removeText',
        blockId: sel.focus.blockId,
        offset: start,
        text: sliceContent(block?.content, start, end),
      };
    }
    const { blockId, offset } = sel.focus;
    if (offset === 0) {
      const index = doc.findIndex((b) => b.id === blockId);
      if (index <= 0) return null; // first block: nothing to merge into
      return { kind: 'mergePrev', blockId };
    }
    const block = doc.find((b) => b.id === blockId);
    return {
      kind: 'removeText',
      blockId,
      offset: offset - 1,
      text: sliceContent(block?.content, offset - 1, offset),
    };
  }

  function deleteForwardOp(state: EditorHistoryState): EditorOp | null {
    const { sel, doc } = state;
    if (!isCollapsed(sel) && sel.anchor.blockId === sel.focus.blockId) {
      const start = Math.min(sel.anchor.offset, sel.focus.offset);
      const end = Math.max(sel.anchor.offset, sel.focus.offset);
      const block = doc.find((b) => b.id === sel.focus.blockId);
      return {
        kind: 'removeText',
        blockId: sel.focus.blockId,
        offset: start,
        text: sliceContent(block?.content, start, end),
      };
    }
    const { blockId, offset } = sel.focus;
    const block = doc.find((b) => b.id === blockId);
    const total = totalTextLength(normalizeRuns(block?.content));
    if (offset >= total) {
      const index = doc.findIndex((b) => b.id === blockId);
      if (index === -1 || index >= doc.length - 1) return null; // last block: nothing to merge
      return { kind: 'mergeNext', blockId };
    }
    return {
      kind: 'removeText',
      blockId,
      offset,
      text: sliceContent(block?.content, offset, offset + 1),
    };
  }

  /** Enter -> split. With a range selection, remove the range first (as a
   *  separate op) so the split lands at the collapsed point. */
  function splitOps(state: EditorHistoryState): EditorOp[] {
    const { sel } = state;
    const ops: EditorOp[] = [];
    let offset = sel.focus.offset;
    const blockId = sel.focus.blockId;
    if (!isCollapsed(sel) && sel.anchor.blockId === blockId) {
      const start = Math.min(sel.anchor.offset, sel.focus.offset);
      const end = Math.max(sel.anchor.offset, sel.focus.offset);
      const block = state.doc.find((b) => b.id === blockId);
      ops.push({
        kind: 'removeText',
        blockId,
        offset: start,
        text: sliceContent(block?.content, start, end),
      });
      offset = start;
    }
    ops.push({ kind: 'split', blockId, offset, newBlockId: mintBlockId() });
    return ops;
  }

  function applyOps(ops: EditorOp[]): void {
    try {
      for (const op of ops) controls.apply(op);
    } catch {
      // applyOp threw (unresolvable blockId / out-of-bounds offset): the native
      // edit was already prevented and the cell is untouched (commitEntry runs
      // the whole applyOp pass before any memory.set), so the next render
      // re-projects from the last valid state -- the DOM never diverges.
    }
  }

  // -- paste: read via createClipboard, own the insert --

  function pasteText(text: string): void {
    const lines = text.split('\n');
    const start = caretStart(memory.get().sel);
    controls.apply({
      kind: 'insertText',
      blockId: start.blockId,
      offset: start.offset,
      text: [{ text: lines[0] ?? '' }],
    });
    for (let i = 1; i < lines.length; i++) {
      const afterSplit = memory.get().sel.focus;
      controls.apply({
        kind: 'split',
        blockId: afterSplit.blockId,
        offset: afterSplit.offset,
        newBlockId: mintBlockId(),
      });
      const line = lines[i] ?? '';
      if (line.length > 0) {
        const at = memory.get().sel.focus;
        controls.apply({
          kind: 'insertText',
          blockId: at.blockId,
          offset: 0,
          text: [{ text: line }],
        });
      }
    }
  }

  const clipboard = createClipboard({
    container: root,
    onPaste: (data) => {
      if (data.text) {
        try {
          pasteText(data.text);
        } catch {
          // See applyOps: the cell is left valid; the next render re-projects.
        }
      }
    },
  });
  // createClipboard reads the payload but does NOT preventDefault; the model
  // owns the edit, so the browser paste must be cancelled here.
  const onPasteRaw = (event: Event): void => {
    event.preventDefault();
  };
  root.addEventListener('paste', onPasteRaw);

  // -- capture: preventDefault + translate, IME via composition --

  let composing = false;
  let compositionAnchor = memory.get().sel;

  // Every `beforeinput` is preventDefault'd unconditionally so the browser
  // never mutates the contenteditable -- EXCEPT while an IME composition is
  // active, when the browser must render the in-progress composition (the
  // finalized string commits as one op on `compositionend`). Composition
  // inputTypes are otherwise not translated (see createInputHandler, which
  // suppresses insertText while composing).
  const onBeforeInputRaw = (event: Event): void => {
    if (composing || (event as InputEvent).isComposing) return;
    event.preventDefault();
  };
  root.addEventListener('beforeinput', onBeforeInputRaw);

  const inputHandler = createInputHandler({
    element: root,
    onBeforeInput: (data) => {
      const state = memory.get();
      switch (data.inputType) {
        case 'insertText': {
          const op = translateBeforeInput(data, state.sel);
          if (op) applyOps([op]);
          return;
        }
        case 'deleteContentBackward': {
          const op = deleteBackwardOp(state);
          if (op) applyOps([op]);
          return;
        }
        case 'deleteContentForward': {
          const op = deleteForwardOp(state);
          if (op) applyOps([op]);
          return;
        }
        case 'insertParagraph':
        case 'insertLineBreak':
          applyOps(splitOps(state));
          return;
        case 'insertFromPaste':
          // Handled by the clipboard read path above -- preventDefault only,
          // never apply here (double-apply guard).
          return;
        default:
          // Unrecognized/unsupported inputType (e.g. a native formatBold
          // shortcut): already preventDefault'd, treated as a no-op, never
          // throws -- typing must never break.
          return;
      }
    },
    onCompositionStart: () => {
      composing = true;
      compositionAnchor = memory.get().sel;
    },
    onCompositionEnd: (event) => {
      composing = false;
      const text = event.data;
      if (text) {
        const start = caretStart(compositionAnchor);
        applyOps([
          { kind: 'insertText', blockId: start.blockId, offset: start.offset, text: [{ text }] },
        ]);
      }
      // Force a full re-projection: the browser rendered the composition into
      // the DOM directly, and a CANCELLED composition applies no op (no block
      // identity changes), so the reference-equality skip would otherwise leave
      // the browser's leftover composition DOM in place forever.
      prevDoc = null;
      render();
    },
  });

  const unsubscribe = memory.subscribe(() => render());

  return () => {
    unsubscribe();
    inputHandler.cleanup();
    clipboard.cleanup();
    root.removeEventListener('paste', onPasteRaw);
    root.removeEventListener('beforeinput', onBeforeInputRaw);
  };
}
