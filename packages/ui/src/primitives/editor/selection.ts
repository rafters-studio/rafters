/**
 * Selection primitives for editors
 * Includes block selection for block-based editors and text selection for contenteditable
 * SSR-safe: checks for window existence
 */

import type { CleanupFunction, SelectionRange } from '../types';

/**
 * Options for block selection behavior
 */
export interface BlockSelectionOptions {
  /**
   * Container element holding the blocks
   */
  container: HTMLElement;

  /**
   * Function to get current block elements
   * Called dynamically to handle DOM changes
   */
  getBlocks: () => HTMLElement[];

  /**
   * Callback fired when selection changes
   */
  onSelectionChange?: (selected: Set<string>) => void;

  /**
   * Whether multiple blocks can be selected
   * @default true
   */
  multiSelect?: boolean;
}

/**
 * Current selection state
 */
export interface BlockSelectionState {
  /**
   * Set of selected block IDs
   */
  selected: Set<string>;

  /**
   * ID of the anchor block (start of range selection)
   */
  anchor: string | null;

  /**
   * ID of the focus block (end of range selection)
   */
  focus: string | null;
}

/**
 * Block selection controller interface
 */
export interface BlockSelectionController {
  /**
   * Get current selection state
   */
  getState: () => BlockSelectionState;

  /**
   * Select a single block
   * @param id Block ID to select
   * @param additive If true, add to selection instead of replacing
   */
  select: (id: string, additive?: boolean) => void;

  /**
   * Select a range of blocks between two IDs (inclusive)
   * @param fromId Start block ID
   * @param toId End block ID
   */
  selectRange: (fromId: string, toId: string) => void;

  /**
   * Select all blocks
   */
  selectAll: () => void;

  /**
   * Clear all selection
   */
  clear: () => void;

  /**
   * Cleanup function to remove event listeners
   */
  cleanup: CleanupFunction;
}

/**
 * Get block ID from element
 * Blocks are identified by data-block-id attribute
 */
function getBlockId(element: HTMLElement): string | null {
  return element.getAttribute('data-block-id');
}

/**
 * Get all block IDs from elements
 */
function getBlockIds(blocks: HTMLElement[]): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    const id = getBlockId(block);
    if (id !== null) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Create block selection behavior for a container
 * Returns controller object with selection methods
 *
 * @example
 * ```typescript
 * const selection = createBlockSelection({
 *   container: editorElement,
 *   getBlocks: () => Array.from(editorElement.querySelectorAll('[data-block-id]')),
 *   onSelectionChange: (selected) => {
 *     // Update UI based on selection
 *   },
 *   multiSelect: true,
 * });
 *
 * // Select a single block
 * selection.select('block-1');
 *
 * // Add to selection
 * selection.select('block-2', true);
 *
 * // Select range
 * selection.selectRange('block-1', 'block-5');
 *
 * // Clear selection
 * selection.clear();
 *
 * // Cleanup when done
 * selection.cleanup();
 * ```
 */
export function createBlockSelection(options: BlockSelectionOptions): BlockSelectionController {
  // SSR guard
  if (typeof window === 'undefined') {
    const emptyState: BlockSelectionState = {
      selected: new Set(),
      anchor: null,
      focus: null,
    };
    return {
      getState: () => emptyState,
      select: () => {},
      selectRange: () => {},
      selectAll: () => {},
      clear: () => {},
      cleanup: () => {},
    };
  }

  const { container, getBlocks, onSelectionChange, multiSelect = true } = options;

  // Internal state
  const state: BlockSelectionState = {
    selected: new Set(),
    anchor: null,
    focus: null,
  };

  /**
   * Notify listeners of selection change
   */
  function notifyChange(): void {
    onSelectionChange?.(new Set(state.selected));
  }

  /**
   * Select a single block, optionally adding to existing selection
   */
  function select(id: string, additive = false): void {
    if (!multiSelect) {
      // Single select mode: always replace
      state.selected.clear();
      state.selected.add(id);
      state.anchor = id;
      state.focus = id;
    } else if (additive) {
      // Additive: toggle the block in selection
      if (state.selected.has(id)) {
        state.selected.delete(id);
        // Update anchor/focus if we removed them
        if (state.anchor === id) {
          state.anchor = state.selected.size > 0 ? (Array.from(state.selected)[0] ?? null) : null;
        }
        if (state.focus === id) {
          state.focus = state.anchor;
        }
      } else {
        state.selected.add(id);
        state.focus = id;
        if (state.anchor === null) {
          state.anchor = id;
        }
      }
    } else {
      // Non-additive: replace selection
      state.selected.clear();
      state.selected.add(id);
      state.anchor = id;
      state.focus = id;
    }
    notifyChange();
  }

  /**
   * Select all blocks between fromId and toId (inclusive)
   */
  function selectRange(fromId: string, toId: string): void {
    const blocks = getBlocks();
    const blockIds = getBlockIds(blocks);

    const fromIndex = blockIds.indexOf(fromId);
    const toIndex = blockIds.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1) {
      // One or both IDs not found, do nothing
      return;
    }

    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    state.selected.clear();
    for (let i = startIndex; i <= endIndex; i++) {
      const id = blockIds[i];
      if (id !== undefined) {
        state.selected.add(id);
      }
    }

    state.anchor = fromId;
    state.focus = toId;
    notifyChange();
  }

  /**
   * Select all blocks
   */
  function selectAll(): void {
    const blocks = getBlocks();
    const blockIds = getBlockIds(blocks);

    state.selected.clear();
    for (const id of blockIds) {
      state.selected.add(id);
    }

    state.anchor = blockIds[0] ?? null;
    state.focus = blockIds[blockIds.length - 1] ?? null;
    notifyChange();
  }

  /**
   * Clear all selection
   */
  function clear(): void {
    if (state.selected.size === 0 && state.anchor === null && state.focus === null) {
      // No change needed
      return;
    }
    state.selected.clear();
    state.anchor = null;
    state.focus = null;
    notifyChange();
  }

  /**
   * Get current state (returns a copy to prevent external mutation)
   */
  function getState(): BlockSelectionState {
    return {
      selected: new Set(state.selected),
      anchor: state.anchor,
      focus: state.focus,
    };
  }

  // Event handlers for click-based selection
  function handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const blockElement = target.closest('[data-block-id]') as HTMLElement | null;

    if (!blockElement || !container.contains(blockElement)) {
      return;
    }

    const id = getBlockId(blockElement);
    if (id === null) {
      return;
    }

    const isAdditive = multiSelect && (event.ctrlKey || event.metaKey);
    const anchor = state.anchor;
    const isRange = multiSelect && event.shiftKey && anchor !== null;

    if (isRange) {
      selectRange(anchor, id);
    } else {
      select(id, isAdditive);
    }
  }

  // Add event listeners
  container.addEventListener('click', handleClick);

  // Cleanup function
  function cleanup(): void {
    container.removeEventListener('click', handleClick);
  }

  return {
    getState,
    select,
    selectRange,
    selectAll,
    clear,
    cleanup,
  };
}

// =============================================================================
// Text Selection Primitive
// =============================================================================

/**
 * Options for text selection behavior
 */
export interface TextSelectionOptions {
  /**
   * Container element (typically contenteditable) that bounds the selection
   */
  container: HTMLElement;

  /**
   * Callback fired when selection changes within the container
   */
  onSelectionChange?: (range: SelectionRange | null) => void;
}

/**
 * Text selection controller interface
 */
export interface TextSelectionController {
  /**
   * Get current selection range within container
   * Returns null if no selection or selection is outside container
   */
  getRange: () => SelectionRange | null;

  /**
   * Set selection range programmatically
   * @param range The range to set
   */
  setRange: (range: SelectionRange) => void;

  /**
   * Collapse selection to start or end
   * @param toStart If true, collapse to start; otherwise collapse to end
   */
  collapse: (toStart?: boolean) => void;

  /**
   * Expand selection to include complete words
   */
  expandByWord: () => void;

  /**
   * Expand selection to include complete lines
   */
  expandByLine: () => void;

  /**
   * Cleanup function to remove event listeners
   */
  cleanup: CleanupFunction;
}

/**
 * Check if a node is inside a container
 */
function isNodeInContainer(node: Node | null, container: HTMLElement): boolean {
  if (!node) return false;
  return container.contains(node);
}

/**
 * Convert browser Selection to SelectionRange
 * Returns null if selection is not within container
 */
function selectionToRange(selection: Selection, container: HTMLElement): SelectionRange | null {
  if (selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startNode = range.startContainer;
  const endNode = range.endContainer;

  // Check if selection is within container
  if (!isNodeInContainer(startNode, container) || !isNodeInContainer(endNode, container)) {
    return null;
  }

  return {
    startNode,
    startOffset: range.startOffset,
    endNode,
    endOffset: range.endOffset,
    collapsed: range.collapsed,
  };
}

/**
 * Create text selection behavior for a contenteditable container
 * Wraps browser Selection API with container-scoped operations
 *
 * @example
 * ```typescript
 * const textSelection = createTextSelection({
 *   container: contentEditableElement,
 *   onSelectionChange: (range) => {
 *     if (range) {
 *       console.log('Selection changed:', range.collapsed ? 'cursor' : 'range');
 *     }
 *   },
 * });
 *
 * // Get current selection
 * const range = textSelection.getRange();
 *
 * // Expand to word boundaries
 * textSelection.expandByWord();
 *
 * // Collapse to start
 * textSelection.collapse(true);
 *
 * // Cleanup when done
 * textSelection.cleanup();
 * ```
 */
export function createTextSelection(options: TextSelectionOptions): TextSelectionController {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      getRange: () => null,
      setRange: () => {},
      collapse: () => {},
      expandByWord: () => {},
      expandByLine: () => {},
      cleanup: () => {},
    };
  }

  const { container, onSelectionChange } = options;

  /**
   * Get current selection range within container
   */
  function getRange(): SelectionRange | null {
    const selection = window.getSelection();
    if (!selection) {
      return null;
    }
    return selectionToRange(selection, container);
  }

  /**
   * Set selection range programmatically
   */
  function setRange(selectionRange: SelectionRange): void {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    // Verify nodes are in container
    if (
      !isNodeInContainer(selectionRange.startNode, container) ||
      !isNodeInContainer(selectionRange.endNode, container)
    ) {
      return;
    }

    const range = document.createRange();
    range.setStart(selectionRange.startNode, selectionRange.startOffset);
    range.setEnd(selectionRange.endNode, selectionRange.endOffset);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Collapse selection to start or end
   */
  function collapse(toStart = true): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const currentRange = selectionToRange(selection, container);
    if (!currentRange) {
      return;
    }

    if (toStart) {
      selection.collapseToStart();
    } else {
      selection.collapseToEnd();
    }
  }

  /**
   * Expand selection to word boundaries
   */
  function expandByWord(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const currentRange = selectionToRange(selection, container);
    if (!currentRange) {
      return;
    }

    // Use modify to expand to word boundaries
    // Note: modify is not standard but widely supported
    if ('modify' in selection && typeof selection.modify === 'function') {
      // If collapsed, first expand in both directions
      if (currentRange.collapsed) {
        selection.modify('move', 'backward', 'word');
        selection.modify('extend', 'forward', 'word');
      } else {
        // For existing selection, expand both ends to word boundaries
        const anchorNode = selection.anchorNode;
        const anchorOffset = selection.anchorOffset;

        // Collapse to start and move backward to word start
        selection.collapseToStart();
        selection.modify('move', 'backward', 'word');
        const wordStart = {
          node: selection.anchorNode,
          offset: selection.anchorOffset,
        };

        // Go to end and move forward to word end
        selection.collapse(anchorNode, anchorOffset);
        selection.collapseToEnd();
        selection.modify('extend', 'forward', 'word');

        // Now set range from word start to current position
        if (wordStart.node && isNodeInContainer(wordStart.node, container)) {
          const range = document.createRange();
          range.setStart(wordStart.node, wordStart.offset);
          if (selection.focusNode && isNodeInContainer(selection.focusNode, container)) {
            range.setEnd(selection.focusNode, selection.focusOffset);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }
  }

  /**
   * Expand selection to line boundaries
   */
  function expandByLine(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const currentRange = selectionToRange(selection, container);
    if (!currentRange) {
      return;
    }

    // Use modify to expand to line boundaries
    if ('modify' in selection && typeof selection.modify === 'function') {
      if (currentRange.collapsed) {
        selection.modify('move', 'backward', 'lineboundary');
        selection.modify('extend', 'forward', 'lineboundary');
      } else {
        const anchorNode = selection.anchorNode;
        const anchorOffset = selection.anchorOffset;

        // Collapse to start and move to line start
        selection.collapseToStart();
        selection.modify('move', 'backward', 'lineboundary');
        const lineStart = {
          node: selection.anchorNode,
          offset: selection.anchorOffset,
        };

        // Go to end and move to line end
        selection.collapse(anchorNode, anchorOffset);
        selection.collapseToEnd();
        selection.modify('extend', 'forward', 'lineboundary');

        // Set range from line start to current position
        if (lineStart.node && isNodeInContainer(lineStart.node, container)) {
          const range = document.createRange();
          range.setStart(lineStart.node, lineStart.offset);
          if (selection.focusNode && isNodeInContainer(selection.focusNode, container)) {
            range.setEnd(selection.focusNode, selection.focusOffset);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }
    }
  }

  /**
   * Handle selectionchange events
   */
  function handleSelectionChange(): void {
    if (!onSelectionChange) {
      return;
    }
    const range = getRange();
    onSelectionChange(range);
  }

  // Add event listener for selection changes
  document.addEventListener('selectionchange', handleSelectionChange);

  /**
   * Cleanup function to remove event listeners
   */
  function cleanup(): void {
    document.removeEventListener('selectionchange', handleSelectionChange);
  }

  return {
    getRange,
    setRange,
    collapse,
    expandByWord,
    expandByLine,
    cleanup,
  };
}
