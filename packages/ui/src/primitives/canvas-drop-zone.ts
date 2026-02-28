/**
 * Canvas drop zone primitive - position-aware drop targeting for block editors
 *
 * Turns an editor canvas into a drop target that calculates insertion indices
 * from cursor proximity to existing block boundaries. Unlike the generic
 * createDropZone (drag-drop.ts), this primitive answers "where exactly in
 * the block list should the dropped item land?"
 *
 * @registry-name canvas-drop-zone
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/canvas-drop-zone.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 4/10 - Simple Y-axis midpoint calculation, familiar drop zone pattern
 * @attention-economics Insertion indicator guides the eye to the exact landing position
 * @trust-building Visual indicator tracks cursor precisely; no guessing where content will land
 * @accessibility aria-dropeffect="copy" signals active drop target to assistive technology
 * @semantic-meaning Drop zone = positional insert target; index = gap between blocks
 *
 * @usage-patterns
 * DO: Pair with block-canvas for selection and canvas-drop-zone for external drops
 * DO: Call recalculate() after DOM mutations that change block positions
 * DO: Use onInsertIndicatorChange to render a visual line/gap at the insertion point
 * NEVER: Read block positions on every dragover frame -- positions are cached
 * NEVER: Forget to call destroy() on cleanup
 *
 * @example
 * ```ts
 * const dropZone = createCanvasDropZone({
 *   container: editorEl,
 *   accept: (data) => data?.type === 'block',
 *   onDrop: (data, index) => insertBlock(data, index),
 *   onInsertIndicatorChange: (index, rect) => {
 *     if (index === null) hideIndicator();
 *     else showIndicator(rect);
 *   },
 * });
 *
 * // After blocks change:
 * dropZone.recalculate();
 *
 * // Cleanup:
 * dropZone.destroy();
 * ```
 */

import type { CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

export interface CanvasDropZoneOptions {
  /** Container element whose [data-block-id] children define drop positions */
  container: HTMLElement;
  /** Filter function: return true to accept the dragged data */
  accept?: (data: unknown) => boolean;
  /** Called on successful drop with parsed data and calculated insertion index */
  onDrop?: (data: unknown, insertIndex: number) => void;
  /** Called during dragover with the current insertion index and indicator rect, or (null, null) on leave */
  onInsertIndicatorChange?: (index: number | null, rect: DOMRect | null) => void;
  /** Called when drag enters/leaves the container */
  onDragActiveChange?: (active: boolean) => void;
}

export interface CanvasDropZoneControls {
  /** Recalculate cached block positions after DOM mutations */
  recalculate: () => void;
  /** Remove all event listeners and clean up ARIA attributes */
  destroy: CleanupFunction;
}

// =============================================================================
// Constants
// =============================================================================

/** Custom MIME type matching the drag-drop primitive */
const DRAG_DATA_TYPE = 'application/x-rafters-drag-data';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse drag data from a DataTransfer, trying the custom MIME first
 * then falling back to text/plain. Returns parsed JSON or raw string.
 */
function parseDragData(dataTransfer: DataTransfer | null): unknown {
  if (!dataTransfer) return null;

  const raw = dataTransfer.getData(DRAG_DATA_TYPE) || dataTransfer.getData('text/plain');

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Query all direct [data-block-id] children and cache their DOMRects.
 * Returns an array of { id, rect } sorted by vertical position.
 */
function readBlockPositions(container: HTMLElement): Array<{ id: string; rect: DOMRect }> {
  const blocks = container.querySelectorAll<HTMLElement>('[data-block-id]');
  const positions: Array<{ id: string; rect: DOMRect }> = [];

  for (const block of blocks) {
    const id = block.getAttribute('data-block-id');
    if (id) {
      positions.push({ id, rect: block.getBoundingClientRect() });
    }
  }

  // Sort by Y position (top-to-bottom)
  positions.sort((a, b) => a.rect.top - b.rect.top);

  return positions;
}

/**
 * Given a cursor Y coordinate and cached block positions, determine the
 * insertion index. Uses the midpoint of each block to decide before/after.
 *
 * - Above all blocks -> 0
 * - Below all blocks -> positions.length
 * - Between blocks -> whichever gap the cursor is closest to
 */
function calculateInsertIndex(
  clientY: number,
  positions: ReadonlyArray<{ id: string; rect: DOMRect }>,
): number {
  for (let i = 0; i < positions.length; i++) {
    const block = positions[i];
    if (!block) continue;
    const midpoint = block.rect.top + block.rect.height / 2;
    if (clientY < midpoint) {
      return i;
    }
  }

  // Below all blocks (or empty list)
  return positions.length;
}

/**
 * Build a DOMRect representing the insertion indicator position.
 * The rect spans the full container width at the gap between blocks.
 */
function buildIndicatorRect(
  insertIndex: number,
  positions: ReadonlyArray<{ id: string; rect: DOMRect }>,
  container: HTMLElement,
): DOMRect {
  const containerRect = container.getBoundingClientRect();

  if (positions.length === 0) {
    // Empty canvas: indicator at top of container
    return new DOMRect(containerRect.left, containerRect.top, containerRect.width, 0);
  }

  if (insertIndex === 0) {
    // Before first block
    const firstBlock = positions[0];
    const y = firstBlock ? firstBlock.rect.top : containerRect.top;
    return new DOMRect(containerRect.left, y, containerRect.width, 0);
  }

  if (insertIndex >= positions.length) {
    // After last block
    const lastBlock = positions[positions.length - 1];
    const y = lastBlock ? lastBlock.rect.bottom : containerRect.bottom;
    return new DOMRect(containerRect.left, y, containerRect.width, 0);
  }

  // Between two blocks: use the gap midpoint
  const blockAbove = positions[insertIndex - 1];
  const blockBelow = positions[insertIndex];

  if (blockAbove && blockBelow) {
    const y = (blockAbove.rect.bottom + blockBelow.rect.top) / 2;
    return new DOMRect(containerRect.left, y, containerRect.width, 0);
  }

  return new DOMRect(containerRect.left, containerRect.top, containerRect.width, 0);
}

// =============================================================================
// createCanvasDropZone
// =============================================================================

export function createCanvasDropZone(options: CanvasDropZoneOptions): CanvasDropZoneControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      recalculate: () => {},
      destroy: () => {},
    };
  }

  const {
    container,
    accept = () => true,
    onDrop,
    onInsertIndicatorChange,
    onDragActiveChange,
  } = options;

  // =========================================================================
  // State
  // =========================================================================

  /** Cached block positions, refreshed on dragenter and recalculate() */
  let cachedPositions: Array<{ id: string; rect: DOMRect }> = [];

  /** Enter/leave counter for nested element handling */
  let enterCount = 0;

  /** Whether a rAF callback is pending for dragover calculation */
  let rafPending = false;

  /** The most recent clientY from a dragover event, consumed by rAF */
  let pendingClientY = 0;

  /** Current insertion index (to avoid redundant callbacks) */
  let currentInsertIndex: number | null = null;

  // =========================================================================
  // Position Management
  // =========================================================================

  function recalculate(): void {
    cachedPositions = readBlockPositions(container);
  }

  // =========================================================================
  // Shared Helpers
  // =========================================================================

  /** Reset drag state and notify callbacks that drag is no longer active */
  function resetDragState(): void {
    container.setAttribute('aria-dropeffect', 'none');
    currentInsertIndex = null;
    onInsertIndicatorChange?.(null, null);
    onDragActiveChange?.(false);
  }

  // =========================================================================
  // Insertion Index Calculation (rAF-throttled)
  // =========================================================================

  function processInsertionIndex(): void {
    rafPending = false;

    const insertIndex = calculateInsertIndex(pendingClientY, cachedPositions);

    if (insertIndex !== currentInsertIndex) {
      currentInsertIndex = insertIndex;
      const indicatorRect = buildIndicatorRect(insertIndex, cachedPositions, container);
      onInsertIndicatorChange?.(insertIndex, indicatorRect);
    }
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  function handleDragEnter(event: DragEvent): void {
    enterCount++;

    if (enterCount === 1) {
      event.preventDefault();

      // Cache block positions on first enter
      recalculate();

      // Set ARIA
      container.setAttribute('aria-dropeffect', 'copy');

      onDragActiveChange?.(true);
    }
  }

  function handleDragOver(event: DragEvent): void {
    // Must preventDefault to allow drop
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    // Schedule rAF-throttled position calculation
    pendingClientY = event.clientY;

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(processInsertionIndex);
    }
  }

  function handleDragLeave(_event: DragEvent): void {
    enterCount--;

    if (enterCount <= 0) {
      enterCount = 0;
      resetDragState();
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    enterCount = 0;

    const data = parseDragData(event.dataTransfer);
    const accepted = accept(data);
    const insertIndex = accepted ? calculateInsertIndex(event.clientY, cachedPositions) : 0;

    resetDragState();

    if (accepted) {
      onDrop?.(data, insertIndex);
    }
  }

  // =========================================================================
  // Event Binding
  // =========================================================================

  container.setAttribute('aria-dropeffect', 'none');

  container.addEventListener('dragenter', handleDragEnter);
  container.addEventListener('dragover', handleDragOver);
  container.addEventListener('dragleave', handleDragLeave);
  container.addEventListener('drop', handleDrop);

  // =========================================================================
  // Controls
  // =========================================================================

  function destroy(): void {
    container.removeEventListener('dragenter', handleDragEnter);
    container.removeEventListener('dragover', handleDragOver);
    container.removeEventListener('dragleave', handleDragLeave);
    container.removeEventListener('drop', handleDrop);

    container.removeAttribute('aria-dropeffect');
  }

  return {
    recalculate,
    destroy,
  };
}
