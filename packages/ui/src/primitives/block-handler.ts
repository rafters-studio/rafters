/**
 * Block handler composition primitive - orchestrates block-canvas, block-wrapper,
 * history, and clipboard into a unified block editing state machine
 *
 * Composition primitives use nanostores atoms to share reactive state between
 * multiple leaf primitives. The block handler wires selection, focus, history,
 * and clipboard into a single coherent API for block-based editors.
 *
 * @registry-name block-handler
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/block-handler.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 7/10 - Orchestrates multiple primitives but exposes a unified API
 * @attention-economics Centralizes block editing state; consumers observe a single store instead of coordinating many primitives
 * @trust-building Consistent undo/redo, clipboard feedback, and selection state across all blocks
 * @accessibility Delegates to block-canvas for ARIA listbox semantics, focus management, and keyboard navigation
 * @semantic-meaning Composition = unified block editing; leaf primitives handle individual concerns
 *
 * @dependencies nanostores@^0.11.0
 * @devDependencies
 * @internal-dependencies
 *
 * @usage-patterns
 * DO: Use createBlockHandler to get a single reactive store for block editing state
 * DO: Subscribe to the returned atom for selection, focus, and history changes
 * DO: Call destroy() on cleanup to tear down all child primitives
 * NEVER: Import block-canvas or block-wrapper directly when block-handler is available
 * NEVER: Mutate the atom value directly -- use the provided action functions
 *
 * @example
 * ```ts
 * import { atom } from 'nanostores';
 *
 * const $blocks = atom([{ id: '1', type: 'text' }]);
 * const handler = createBlockHandler({
 *   container: document.getElementById('editor')!,
 *   $blocks,
 *   onBlocksChange: (blocks) => $blocks.set(blocks),
 * });
 *
 * handler.selectAll();
 * handler.undo();
 * handler.destroy();
 * ```
 */
import { atom } from 'nanostores';
import type { BlockCanvasBlock } from './block-canvas';
import { createBlockCanvas } from './block-canvas';
import { createClipboard } from './clipboard';
import { createHistory } from './history';
import type { CleanupFunction } from './types';

// ============================================================================
// Types
// ============================================================================

export interface BlockHandlerState {
  /** Currently selected block IDs */
  selectedIds: Set<string>;
  /** Currently focused block ID */
  focusedId: string | undefined;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

export interface BlockHandlerOptions {
  /** Container element for the block editor */
  container: HTMLElement;
  /** Reactive atom containing the current blocks array */
  $blocks: {
    get(): BlockCanvasBlock[];
    subscribe(cb: (value: BlockCanvasBlock[]) => void): () => void;
  };
  /** Called when the blocks array changes (reorder, delete, etc.) */
  onBlocksChange?: (blocks: BlockCanvasBlock[]) => void;
  /** Called when slash command is triggered */
  onSlashCommand?: (position: { x: number; y: number }) => void;
}

export interface BlockHandlerControls {
  /** Reactive atom with current handler state */
  $state: {
    get(): BlockHandlerState;
    subscribe(cb: (value: BlockHandlerState) => void): () => void;
  };
  /** Select all blocks */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Clean up all child primitives and subscriptions */
  destroy: CleanupFunction;
}

// ============================================================================
// Implementation
// ============================================================================

const INITIAL_STATE: BlockHandlerState = {
  selectedIds: new Set(),
  focusedId: undefined,
  canUndo: false,
  canRedo: false,
};

export function createBlockHandler(options: BlockHandlerOptions): BlockHandlerControls {
  const { container, $blocks, onBlocksChange, onSlashCommand } = options;
  const cleanups: CleanupFunction[] = [];

  // Shared reactive state
  const $state = atom<BlockHandlerState>({ ...INITIAL_STATE });

  // History for undo/redo
  const history = createHistory<BlockCanvasBlock[]>({
    initialState: $blocks.get(),
    limit: 50,
  });

  // Wire block canvas
  const canvasOptions: Parameters<typeof createBlockCanvas>[0] = {
    container,
    getBlocks: () => $blocks.get(),
    getSelectedIds: () => $state.get().selectedIds,
    getFocusedId: () => $state.get().focusedId,
    onSelectionChange: (ids) => {
      $state.set({ ...$state.get(), selectedIds: ids });
    },
    onFocusChange: (id) => {
      $state.set({ ...$state.get(), focusedId: id ?? undefined });
    },
  };
  if (onSlashCommand) {
    canvasOptions.onSlashCommand = onSlashCommand;
  }
  const canvas = createBlockCanvas(canvasOptions);

  // Wire clipboard
  const clipboard = createClipboard({ container });
  cleanups.push(clipboard.cleanup);

  // Track blocks changes for history
  const unsubBlocks = $blocks.subscribe((blocks) => {
    history.push(blocks);
    $state.set({
      ...$state.get(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
    });
  });
  cleanups.push(unsubBlocks);

  function undo(): void {
    const prev = history.undo();
    if (prev) {
      onBlocksChange?.(prev);
      $state.set({
        ...$state.get(),
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    }
  }

  function redo(): void {
    const next = history.redo();
    if (next) {
      onBlocksChange?.(next);
      $state.set({
        ...$state.get(),
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      });
    }
  }

  return {
    $state,
    selectAll: canvas.selectAll,
    clearSelection: canvas.clearSelection,
    undo,
    redo,
    destroy() {
      canvas.destroy();
      for (const cleanup of cleanups) cleanup();
    },
  };
}
