/**
 * Block handler composition primitive - reactive block tree state for editors
 *
 * Owns the canonical block list, selection set, and focus cursor as nanostores
 * atoms. Exposes mutation helpers and a `getCanvasCallbacks()` bridge that
 * returns the exact shape `createBlockCanvas()` expects -- zero glue code.
 *
 * @registry-name block-handler
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/block-handler.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 5/10 - Familiar CRUD operations plus tree nesting; reactive via nanostores
 * @attention-economics State is the source of truth; UI reacts to atom changes
 * @trust-building Predictable error messages for duplicate IDs, missing IDs, circular nesting
 * @accessibility State-only primitive; accessibility is handled by the canvas and wrapper layers
 * @semantic-meaning Handler = data owner; canvas = interaction layer; wrapper = per-block chrome
 *
 * @usage-patterns
 * DO: Use `$blocks`, `$selectedIds`, `$focusedId` atoms for reactive subscriptions
 * DO: Call `getCanvasCallbacks()` and spread into `createBlockCanvas()`
 * DO: Call `destroy()` on cleanup to release all subscriptions
 * NEVER: Mutate the atoms directly -- use the provided mutation methods
 * NEVER: Import nanostores in leaf primitives -- only composition primitives may depend on it
 *
 * @dependencies nanostores
 *
 * @example
 * ```ts
 * import { createBlockHandler } from '@rafters/ui/primitives/block-handler';
 * import { createBlockCanvas } from '@rafters/ui/primitives/block-canvas';
 *
 * const handler = createBlockHandler({
 *   initialBlocks: [{ id: 'b1', type: 'paragraph', content: 'Hello' }],
 *   onChange: (blocks) => console.log('changed', blocks),
 * });
 *
 * const canvas = createBlockCanvas({
 *   container: el,
 *   ...handler.getCanvasCallbacks(),
 * });
 *
 * handler.addBlock({ id: 'b2', type: 'heading', content: 'Title' });
 * handler.destroy();
 * ```
 */
import { atom, computed } from 'nanostores';
import type { BlockCanvasOptions } from './block-canvas';

// ============================================================================
// Types
// ============================================================================

export interface Block {
  id: string;
  type: string;
  content: unknown;
  children?: string[];
  parentId?: string;
  meta?: Record<string, unknown>;
}

export interface BlockHandlerOptions {
  /** Initial blocks to populate the handler with */
  initialBlocks?: Block[];
  /** Called whenever blocks are mutated */
  onChange?: (blocks: Block[]) => void;
}

/**
 * Canvas callback shape -- the subset of BlockCanvasOptions that the handler provides.
 * Excludes `container` (caller provides) and `onSlashCommand` (canvas-level concern).
 */
export type CanvasCallbacks = Omit<BlockCanvasOptions, 'container' | 'onSlashCommand'>;

export interface BlockHandlerInstance {
  /** Reactive atom holding the ordered block list */
  $blocks: ReturnType<typeof atom<Block[]>>;
  /** Reactive atom holding the set of selected block IDs */
  $selectedIds: ReturnType<typeof atom<Set<string>>>;
  /** Reactive atom holding the currently focused block ID (or null) */
  $focusedId: ReturnType<typeof atom<string | null>>;
  /** Computed store: total number of blocks */
  $blockCount: ReturnType<typeof computed>;
  /** Computed store: Map of block ID to Block */
  $blockMap: ReturnType<typeof computed>;

  /** Insert a block at the given index, or append if omitted */
  addBlock: (block: Block, index?: number) => void;
  /** Remove blocks by ID, cascading to nested children */
  removeBlocks: (ids: Set<string>) => void;
  /** Move a block to a specific index */
  moveBlock: (id: string, toIndex: number) => void;
  /** Swap two blocks by their indices */
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  /** Partially update a block by ID */
  updateBlock: (id: string, updates: Partial<Block>) => void;
  /** Nest a child block under a parent */
  nestBlock: (childId: string, parentId: string) => void;
  /** Remove a child block from its parent */
  unnestBlock: (childId: string) => void;
  /** Replace the selection set */
  setSelection: (ids: Set<string>) => void;
  /** Set the focused block ID */
  setFocus: (id: string | null) => void;
  /** Returns callbacks matching the BlockCanvasOptions shape (minus container) */
  getCanvasCallbacks: () => CanvasCallbacks;
  /** Tear down all subscriptions */
  destroy: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Collect all descendant IDs reachable through `children` pointers.
 */
function collectDescendants(id: string, blockMap: Map<string, Block>): Set<string> {
  const result = new Set<string>();
  const stack = [id];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const block = blockMap.get(current);
    if (!block?.children) continue;
    for (const childId of block.children) {
      if (!result.has(childId)) {
        result.add(childId);
        stack.push(childId);
      }
    }
  }

  return result;
}

/**
 * Walk the parent chain to detect circular references.
 * Returns true if `targetId` is an ancestor of `startId`.
 */
function isAncestor(startId: string, targetId: string, blockMap: Map<string, Block>): boolean {
  let current = startId;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(current)) return false;
    visited.add(current);

    const block = blockMap.get(current);
    if (!block?.parentId) return false;
    if (block.parentId === targetId) return true;
    current = block.parentId;
  }
}

/**
 * Build a Map<string, Block> from an array.
 */
function buildBlockMap(blocks: Block[]): Map<string, Block> {
  return new Map(blocks.map((block) => [block.id, block]));
}

/**
 * Clamp an index into [0, max].
 */
function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(index, max));
}

// ============================================================================
// Implementation
// ============================================================================

export function createBlockHandler(options?: BlockHandlerOptions): BlockHandlerInstance {
  const initialBlocks = options?.initialBlocks ?? [];
  const onChange = options?.onChange;

  // -- Atoms -----------------------------------------------------------------
  const $blocks = atom<Block[]>([...initialBlocks]);
  const $selectedIds = atom<Set<string>>(new Set());
  const $focusedId = atom<string | null>(null);

  // -- Computed stores -------------------------------------------------------
  const $blockCount = computed($blocks, (blocks) => blocks.length);
  const $blockMap = computed($blocks, (blocks) => buildBlockMap(blocks));

  // -- Subscription tracking -------------------------------------------------
  const unsubscribes: Array<() => void> = [];

  // -- onChange wiring -------------------------------------------------------
  if (onChange) {
    const unsub = $blocks.listen((blocks) => {
      try {
        onChange([...blocks]);
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
    });
    unsubscribes.push(unsub);
  }

  // -- Mutations -------------------------------------------------------------

  function addBlock(block: Block, index?: number): void {
    const current = $blocks.get();

    if (current.some((b) => b.id === block.id)) {
      throw new Error(`Block with id '${block.id}' already exists`);
    }

    const next = [...current];
    if (index === undefined) {
      next.push(block);
    } else {
      const clamped = clampIndex(index, next.length);
      next.splice(clamped, 0, block);
    }

    $blocks.set(next);
  }

  function removeBlocks(ids: Set<string>): void {
    const current = $blocks.get();
    const map = buildBlockMap(current);

    // Collect all IDs to remove (requested + descendants)
    const toRemove = new Set<string>(ids);
    for (const id of ids) {
      for (const descendantId of collectDescendants(id, map)) {
        toRemove.add(descendantId);
      }
    }

    // Short-circuit when none of the IDs exist in the current blocks
    let hasRemovals = false;
    for (const id of toRemove) {
      if (map.has(id)) {
        hasRemovals = true;
        break;
      }
    }
    if (!hasRemovals) return;

    // Remove children references from surviving parents and clean orphaned parentIds
    const next: Block[] = [];
    for (const block of current) {
      if (toRemove.has(block.id)) continue;

      const cleaned = { ...block };

      // Clean orphaned parentId -- parent was removed but child survives
      if (cleaned.parentId && toRemove.has(cleaned.parentId)) {
        delete cleaned.parentId;
      }

      // Clean removed children from the children array
      if (cleaned.children?.some((childId) => toRemove.has(childId))) {
        cleaned.children = cleaned.children.filter((childId) => !toRemove.has(childId));
      }

      next.push(cleaned);
    }

    // Clean up removed IDs from selection
    const selectedIds = $selectedIds.get();
    const newSelection = new Set([...selectedIds].filter((id) => !toRemove.has(id)));
    if (newSelection.size !== selectedIds.size) {
      $selectedIds.set(newSelection);
    }

    // Clean up focus if the focused block was removed
    const focusedId = $focusedId.get();
    if (focusedId && toRemove.has(focusedId)) {
      $focusedId.set(null);
    }

    $blocks.set(next);
  }

  function moveBlock(id: string, toIndex: number): void {
    const current = $blocks.get();
    const fromIndex = current.findIndex((b) => b.id === id);

    if (fromIndex === -1) {
      throw new Error(`Block with id '${id}' not found`);
    }

    const next = [...current];
    const block = next.splice(fromIndex, 1)[0];
    if (block) next.splice(clampIndex(toIndex, next.length), 0, block);

    $blocks.set(next);
  }

  function reorderBlocks(fromIndex: number, toIndex: number): void {
    const current = $blocks.get();
    if (current.length === 0) return;

    const clampedFrom = clampIndex(fromIndex, current.length - 1);
    const clampedTo = clampIndex(toIndex, current.length - 1);

    if (clampedFrom === clampedTo) return;

    const next = [...current];
    const block = next.splice(clampedFrom, 1)[0];
    if (block) next.splice(clampedTo, 0, block);

    $blocks.set(next);
  }

  function updateBlock(id: string, updates: Partial<Block>): void {
    if ('parentId' in updates || 'children' in updates) {
      throw new Error(
        'Cannot update parentId or children via updateBlock. Use nestBlock() and unnestBlock() to modify block tree structure.',
      );
    }

    const current = $blocks.get();
    const index = current.findIndex((b) => b.id === id);

    if (index === -1) {
      throw new Error(`Block with id '${id}' not found`);
    }

    const existing = current[index];
    if (!existing) return;

    const next = [...current];
    next[index] = { ...existing, ...updates, id };

    $blocks.set(next);
  }

  function nestBlock(childId: string, parentId: string): void {
    const current = $blocks.get();
    const map = buildBlockMap(current);

    const child = map.get(childId);
    if (!child) {
      throw new Error(`Block with id '${childId}' not found`);
    }

    const parent = map.get(parentId);
    if (!parent) {
      throw new Error(`Block with id '${parentId}' not found`);
    }

    // Circular reference detection: self-nesting, descendant check (children pointers),
    // and ancestor check (parentId pointers) for robustness with inconsistent trees
    if (
      childId === parentId ||
      collectDescendants(childId, map).has(parentId) ||
      isAncestor(parentId, childId, map)
    ) {
      throw new Error(`Cannot nest block '${childId}' under '${parentId}': circular reference`);
    }

    // Already nested under the same parent -- nothing to do
    if (child.parentId === parentId) {
      return;
    }

    const oldParentId = child.parentId;

    const next = current.map((block) => {
      // Remove child from its old parent's children array
      if (oldParentId && block.id === oldParentId && block.children) {
        return {
          ...block,
          children: block.children.filter((id) => id !== childId),
        };
      }

      // Add child to new parent's children array
      if (block.id === parentId) {
        const existingChildren = block.children ?? [];
        return {
          ...block,
          children: [...existingChildren, childId],
        };
      }

      // Update child's parentId
      if (block.id === childId) {
        return { ...block, parentId };
      }

      return block;
    });

    $blocks.set(next);
  }

  function unnestBlock(childId: string): void {
    const current = $blocks.get();
    const map = buildBlockMap(current);

    const child = map.get(childId);
    if (!child) {
      throw new Error(`Block with id '${childId}' not found`);
    }

    if (!child.parentId) {
      // Already top-level, nothing to do
      return;
    }

    const parentId = child.parentId;

    const next = current.map((block) => {
      // Remove child from parent's children array
      if (block.id === parentId && block.children) {
        return {
          ...block,
          children: block.children.filter((id) => id !== childId),
        };
      }

      // Clear child's parentId
      if (block.id === childId) {
        const { parentId: _removed, ...rest } = block;
        return rest;
      }

      return block;
    });

    $blocks.set(next);
  }

  function setSelection(ids: Set<string>): void {
    $selectedIds.set(ids);
  }

  function setFocus(id: string | null): void {
    $focusedId.set(id);
  }

  // -- Canvas bridge ---------------------------------------------------------

  function getCanvasCallbacks(): CanvasCallbacks {
    return {
      getBlocks: () => $blocks.get().map((b) => ({ id: b.id, type: b.type })),
      getSelectedIds: () => $selectedIds.get(),
      getFocusedId: () => $focusedId.get() ?? undefined,
      onSelectionChange: (ids) => $selectedIds.set(ids),
      onFocusChange: (id) => $focusedId.set(id),
    };
  }

  // -- Cleanup ---------------------------------------------------------------

  function destroy(): void {
    for (const unsub of unsubscribes) {
      unsub();
    }
    unsubscribes.length = 0;
  }

  // -- Public API ------------------------------------------------------------

  return {
    $blocks,
    $selectedIds,
    $focusedId,
    $blockCount,
    $blockMap,

    addBlock,
    removeBlocks,
    moveBlock,
    reorderBlocks,
    updateBlock,
    nestBlock,
    unnestBlock,
    setSelection,
    setFocus,
    getCanvasCallbacks,
    destroy,
  };
}
