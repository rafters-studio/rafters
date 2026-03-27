/**
 * Document editor composition primitive - unified contentEditable surface
 *
 * Orchestrates leaf primitives into a document editing experience:
 * - input-events: content change detection with IME support
 * - clipboard: paste/copy/cut with format detection
 * - keyboard-handler: block type shortcuts (Cmd+Alt+1, etc.)
 * - cursor-tracker: cursor position relative to blocks
 * - block-operations: split/merge/delete/convert (pure functions)
 * - inline-formatter: bold/italic/code/etc
 * - history: undo/redo
 * - serializer-html/text: paste deserialization, copy serialization
 *
 * The React component layer is a thin wrapper: state + render. This primitive
 * owns all event handling and block mutation logic.
 *
 * @registry-name document-editor
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/document-editor.ts
 * @registry-type registry:primitive
 *
 * @dependencies nanostores
 * @internal-dependencies primitives/input-events.ts, primitives/clipboard.ts,
 *   primitives/keyboard-handler.ts, primitives/cursor-tracker.ts,
 *   primitives/block-operations.ts, primitives/history.ts,
 *   primitives/serializer-html.ts, primitives/serializer-text.ts
 */
import { atom } from 'nanostores';
import {
  blockContentToText,
  convertBlockType,
  deleteBlock,
  insertBlocksAt,
  mergeWithNext,
  mergeWithPrevious,
  splitBlock,
} from './block-operations';
import { createClipboard } from './clipboard';
import {
  findBlockElement,
  getCursorPosition,
  isCursorAtBlockEnd,
  isSelectionCollapsed,
  setCursorAtBlockEnd,
  setCursorAtBlockStart,
  setCursorInBlock,
} from './cursor-tracker';
import { createHistory } from './history';
import { createInputHandler } from './input-events';
import { createKeyboardHandler } from './keyboard-handler';
import { htmlSerializer } from './serializer-html';
import { textSerializer } from './serializer-text';
import type { BaseBlock, CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

export interface DocumentEditorState {
  blocks: BaseBlock[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface DocumentEditorOptions {
  /** Container element that becomes contentEditable */
  container: HTMLElement;
  /** Initial blocks */
  initialBlocks: BaseBlock[];
  /** Called when blocks change */
  onBlocksChange?: (blocks: BaseBlock[]) => void;
}

export interface DocumentEditorControls {
  /** Reactive state atom */
  $state: {
    get(): DocumentEditorState;
    subscribe(cb: (v: DocumentEditorState) => void): () => void;
  };
  /** Replace blocks (e.g., from external load/import) */
  setBlocks: (blocks: BaseBlock[]) => void;
  /** Add blocks at a position */
  addBlocks: (blocks: BaseBlock[], index?: number) => void;
  /** Undo */
  undo: () => void;
  /** Redo */
  redo: () => void;
  /** Focus a block at an offset */
  focusBlock: (blockId: string, offset?: number) => void;
  /** Destroy all listeners */
  destroy: CleanupFunction;
}

// =============================================================================
// Markdown shortcuts (detected on space after prefix)
// =============================================================================

interface MarkdownShortcut {
  pattern: RegExp;
  type: string;
  meta?: Record<string, unknown>;
}

const MARKDOWN_SHORTCUTS: MarkdownShortcut[] = [
  { pattern: /^####$/, type: 'heading', meta: { level: 4 } },
  { pattern: /^###$/, type: 'heading', meta: { level: 3 } },
  { pattern: /^##$/, type: 'heading', meta: { level: 2 } },
  { pattern: /^#$/, type: 'heading', meta: { level: 1 } },
  { pattern: /^>$/, type: 'quote' },
  { pattern: /^[-*]$/, type: 'list-item', meta: { listType: 'unordered' } },
  { pattern: /^\d+\.$/, type: 'list-item', meta: { listType: 'ordered' } },
  { pattern: /^```$/, type: 'code' },
  { pattern: /^---$/, type: 'divider' },
];

// =============================================================================
// Implementation
// =============================================================================

export function createDocumentEditor(options: DocumentEditorOptions): DocumentEditorControls {
  const { container, initialBlocks, onBlocksChange } = options;
  const cleanups: CleanupFunction[] = [];

  // -- Shared state --
  const history = createHistory<BaseBlock[]>({
    initialState: initialBlocks,
    limit: 100,
  });

  const $state = atom<DocumentEditorState>({
    blocks: initialBlocks,
    canUndo: false,
    canRedo: false,
  });

  function updateBlocks(next: BaseBlock[]): void {
    history.push(next);
    $state.set({
      blocks: next,
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
    onBlocksChange?.(next);
  }

  // -- Make container contentEditable --
  container.setAttribute('contenteditable', 'true');
  container.setAttribute('spellcheck', 'true');
  container.setAttribute('role', 'textbox');
  container.setAttribute('aria-multiline', 'true');
  container.setAttribute('aria-label', 'Document editor');
  cleanups.push(() => {
    container.removeAttribute('contenteditable');
    container.removeAttribute('spellcheck');
    container.removeAttribute('role');
    container.removeAttribute('aria-multiline');
    container.removeAttribute('aria-label');
  });

  // -- DOM reconciliation: read block elements and sync to model --
  function reconcileDOM(): void {
    const blockEls = container.querySelectorAll('[data-block-id]');
    const blocks = $state.get().blocks;
    const blockMap = new Map(blocks.map((b) => [b.id, b]));

    // Build new block list from DOM order
    const reconciled: BaseBlock[] = [];
    const seen = new Set<string>();

    for (const el of blockEls) {
      const id = el.getAttribute('data-block-id');
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const existing = blockMap.get(id);
      if (existing) {
        // Update content from DOM
        const text = el.textContent ?? '';
        if (blockContentToText(existing.content) !== text) {
          reconciled.push({ ...existing, content: text });
        } else {
          reconciled.push(existing);
        }
      }
    }

    // Only update if something changed
    if (
      reconciled.length !== blocks.length ||
      reconciled.some((b, i) => {
        const orig = blocks[i];
        return (
          !orig ||
          b.id !== orig.id ||
          blockContentToText(b.content) !== blockContentToText(orig.content)
        );
      })
    ) {
      updateBlocks(reconciled);
    }
  }

  // -- Input events: sync DOM text changes back to block model --
  const inputHandler = createInputHandler({
    element: container,
    onInput: (data) => {
      if (data.isComposing) return;

      const pos = getCursorPosition();
      if (!pos) return;

      // insertParagraph = Enter key (browser already split the DOM)
      if (data.inputType === 'insertParagraph') {
        const result = splitBlock($state.get().blocks, pos.blockId, pos.offset);
        updateBlocks(result.blocks);
        // Focus the new block after React re-renders
        requestAnimationFrame(() => {
          setCursorAtBlockStart(container, result.newBlockId);
        });
        return;
      }

      // Reconcile DOM with block model after any mutation.
      // The browser may have deleted blocks (cross-block selection delete),
      // merged text across blocks, or modified content.
      reconcileDOM();
    },
    onBeforeInput: (data) => {
      // Detect markdown shortcuts: check if text before cursor + typed char matches
      if (data.inputType === 'insertText' && data.data === ' ') {
        const pos = getCursorPosition();
        if (!pos) return;

        const blocks = $state.get().blocks;
        const block = blocks.find((b) => b.id === pos.blockId);
        if (!block || block.type !== 'text') return;

        const textBeforeCursor = blockContentToText(block.content).slice(0, pos.offset);
        for (const shortcut of MARKDOWN_SHORTCUTS) {
          if (shortcut.pattern.test(textBeforeCursor)) {
            // Prevent the space from being inserted
            // Note: we return here, the beforeinput handler in input-events
            // will check the preventDefault array
            const next = convertBlockType(blocks, pos.blockId, shortcut.type, shortcut.meta);
            // Clear the prefix content
            const converted = next.map((b) => (b.id === pos.blockId ? { ...b, content: '' } : b));
            updateBlocks(converted);
            requestAnimationFrame(() => {
              setCursorAtBlockStart(container, pos.blockId);
            });
            return;
          }
        }
      }
    },
    preventDefault: ['insertParagraph'],
  });
  cleanups.push(inputHandler.cleanup);

  // -- Keyboard: Backspace at start, Delete at end --
  const backspaceCleanup = createKeyboardHandler(container, {
    key: 'Backspace',
    handler: () => {
      if (!isSelectionCollapsed()) return; // Let browser handle selection delete

      const pos = getCursorPosition();
      if (!pos) return;

      const blocks = $state.get().blocks;
      const index = blocks.findIndex((b) => b.id === pos.blockId);
      const block = blocks[index];
      if (!block) return;

      // Only intercept at position 0
      if (pos.offset !== 0) return;

      // Empty block: delete it
      if (pos.blockLength === 0 && index > 0) {
        const result = deleteBlock(blocks, pos.blockId);
        updateBlocks(result.blocks);
        if (result.focusBlockId) {
          requestAnimationFrame(() => {
            if (result.focusAtEnd) {
              setCursorAtBlockEnd(container, result.focusBlockId as string);
            } else {
              setCursorAtBlockStart(container, result.focusBlockId as string);
            }
          });
        }
        return;
      }

      // Heading/quote at start: convert to text
      if (block.type === 'heading' || block.type === 'quote') {
        const next = convertBlockType(blocks, pos.blockId, 'text');
        updateBlocks(next);
        requestAnimationFrame(() => {
          setCursorAtBlockStart(container, pos.blockId);
        });
        return;
      }

      // Merge with previous
      if (index > 0) {
        const result = mergeWithPrevious(blocks, pos.blockId);
        updateBlocks(result.blocks);
        requestAnimationFrame(() => {
          setCursorInBlock(container, result.survivorId, result.cursorOffset);
        });
      }
    },
    preventDefault: false, // We conditionally prevent in the handler
  });
  cleanups.push(backspaceCleanup);

  const deleteCleanup = createKeyboardHandler(container, {
    key: 'Delete',
    handler: () => {
      if (!isSelectionCollapsed()) return;
      if (!isCursorAtBlockEnd()) return;

      const pos = getCursorPosition();
      if (!pos) return;

      const blocks = $state.get().blocks;
      const result = mergeWithNext(blocks, pos.blockId);
      updateBlocks(result.blocks);
      requestAnimationFrame(() => {
        setCursorInBlock(container, result.survivorId, result.cursorOffset);
      });
    },
    preventDefault: false,
  });
  cleanups.push(deleteCleanup);

  // -- Keyboard: block type shortcuts (Cmd+Alt+0 through Cmd+Alt+4, etc.) --
  // These use the keyboard-handler primitive for clean binding
  // Cmd+Alt+N shortcuts for block type switching
  // Uses raw keydown because keyboard-handler only supports KeyboardKey types (not digits)
  function handleTypeShortcut(event: KeyboardEvent): void {
    if (!event.altKey || !(event.metaKey || event.ctrlKey)) return;

    const pos = getCursorPosition();
    if (!pos) return;

    const blocks = $state.get().blocks;
    let next: BaseBlock[] | null = null;

    switch (event.key) {
      case '0':
        next = convertBlockType(blocks, pos.blockId, 'text');
        break;
      case '1':
        next = convertBlockType(blocks, pos.blockId, 'heading', { level: 1 });
        break;
      case '2':
        next = convertBlockType(blocks, pos.blockId, 'heading', { level: 2 });
        break;
      case '3':
        next = convertBlockType(blocks, pos.blockId, 'heading', { level: 3 });
        break;
      case '4':
        next = convertBlockType(blocks, pos.blockId, 'heading', { level: 4 });
        break;
    }

    if (next) {
      event.preventDefault();
      updateBlocks(next);
    }
  }

  container.addEventListener('keydown', handleTypeShortcut);
  cleanups.push(() => container.removeEventListener('keydown', handleTypeShortcut));

  // -- Clipboard: paste with format detection, copy with serialization --
  const clipboard = createClipboard({
    container,
    customMimeType: 'application/x-rafters-blocks',
    onPaste: (data) => {
      const pos = getCursorPosition();
      if (!pos) return;

      const blocks = $state.get().blocks;
      const block = blocks.find((b) => b.id === pos.blockId);

      // In code blocks, paste as plain text (let browser handle it)
      if (block?.type === 'code') return;

      // Deserialize: try HTML first, fall back to plain text
      let pastedBlocks: BaseBlock[];
      if (data.html?.trim()) {
        pastedBlocks = htmlSerializer.deserialize(data.html).blocks;
      } else if (data.text) {
        pastedBlocks = textSerializer.deserialize(data.text).blocks;
      } else {
        return;
      }

      if (pastedBlocks.length === 0) return;

      // Single text block: insert text inline (don't create new block)
      if (pastedBlocks.length === 1) {
        const pasted = pastedBlocks[0];
        if (pasted && pasted.type === 'text') {
          const pastedText = blockContentToText(pasted.content);
          document.execCommand('insertText', false, pastedText);
          return;
        }
      }

      // Multiple blocks: insert at cursor position
      const result = insertBlocksAt(blocks, pastedBlocks, pos.blockId, pos.offset);
      updateBlocks(result.blocks);
      requestAnimationFrame(() => {
        setCursorAtBlockEnd(container, result.lastInsertedId);
      });
    },
    onCopy: () => {
      // Multi-block copy is handled by the copy event listener below
    },
  });
  cleanups.push(clipboard.cleanup);

  // -- Copy/Cut: serialize selected blocks --
  function handleCopy(event: ClipboardEvent): void {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed) return;

    const anchorBlock = findBlockElement(sel.anchorNode);
    const focusBlock = findBlockElement(sel.focusNode);
    if (!anchorBlock || !focusBlock) return;

    // Within a single block: let browser handle it
    if (anchorBlock === focusBlock) return;

    event.preventDefault();

    const blocks = $state.get().blocks;
    const anchorId = anchorBlock.getAttribute('data-block-id') ?? '';
    const focusId = focusBlock.getAttribute('data-block-id') ?? '';
    const anchorIdx = blocks.findIndex((b) => b.id === anchorId);
    const focusIdx = blocks.findIndex((b) => b.id === focusId);
    const startIdx = Math.min(anchorIdx, focusIdx);
    const endIdx = Math.max(anchorIdx, focusIdx);

    if (startIdx === -1 || endIdx === -1) return;

    const selected = blocks.slice(startIdx, endIdx + 1);
    event.clipboardData?.setData('text/html', htmlSerializer.serialize(selected));
    event.clipboardData?.setData('text/plain', textSerializer.serialize(selected));
  }

  container.addEventListener('copy', handleCopy);
  cleanups.push(() => container.removeEventListener('copy', handleCopy));

  container.addEventListener('cut', (event: ClipboardEvent) => {
    handleCopy(event);
    // Let browser delete the selected content, input handler will sync
  });

  // -- Public API --
  function setBlocks(blocks: BaseBlock[]): void {
    updateBlocks(blocks);
  }

  function addBlocks(newBlocks: BaseBlock[], index?: number): void {
    const current = $state.get().blocks;
    const next = [...current];
    if (index !== undefined && index >= 0 && index <= next.length) {
      next.splice(index, 0, ...newBlocks);
    } else {
      next.push(...newBlocks);
    }
    updateBlocks(next);
  }

  function undo(): void {
    const prev = history.undo();
    if (prev) {
      $state.set({
        blocks: prev,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
      onBlocksChange?.(prev);
    }
  }

  function redo(): void {
    const next = history.redo();
    if (next) {
      $state.set({
        blocks: next,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
      onBlocksChange?.(next);
    }
  }

  function focusBlock(blockId: string, offset?: number): void {
    if (offset !== undefined) {
      setCursorInBlock(container, blockId, offset);
    } else {
      setCursorAtBlockStart(container, blockId);
    }
  }

  return {
    $state,
    setBlocks,
    addBlocks,
    undo,
    redo,
    focusBlock,
    destroy() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
