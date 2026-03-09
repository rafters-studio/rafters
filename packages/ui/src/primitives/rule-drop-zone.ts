/**
 * Rule drop zone primitive - block-targeting drop zone for rule application
 *
 * Detects drag events over blocks in an editor canvas and determines which
 * block the cursor is hovering over using bounding rect hit-testing. Unlike
 * canvas-drop-zone (which calculates insertion indices between blocks), this
 * primitive targets individual blocks for rule application.
 *
 * Reads rule ID from dataTransfer and checks block compatibility via a
 * caller-provided predicate. Compatible blocks receive a data attribute
 * for CSS-driven visual feedback. Incompatible blocks trigger a rejection
 * callback on drop.
 *
 * @registry-name rule-drop-zone
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/rule-drop-zone.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 3/10 - Hit-test blocks, check compatibility, fire callback
 * @attention-economics Data attribute highlight guides the eye to the target block
 * @trust-building Block highlights only appear on compatible targets, preventing user errors
 * @accessibility aria-dropeffect signals drop target to assistive technology
 * @semantic-meaning Drop zone = rule application target; block = receiver of rule
 *
 * @usage-patterns
 * DO: Pair with rule-palette for drag source and block-canvas for the editor
 * DO: Use data-rule-drop-target attribute in CSS to style the highlighted block
 * NEVER: Forget to call destroy() on cleanup
 * NEVER: Use this for positional inserts between blocks -- use canvas-drop-zone instead
 *
 * @example
 * ```ts
 * const dropZone = createRuleDropZone({
 *   canvasElement: editorEl,
 *   getBlockElements: () => blockMap,
 *   onRuleDrop: (blockId, ruleId) => applyRule(blockId, ruleId),
 *   onRuleReject: (ruleId) => showToast(`Rule ${ruleId} not compatible`),
 *   isCompatible: (blockType, ruleId) => {
 *     return compatibilityMap.get(ruleId)?.includes(blockType) ?? false;
 *   },
 * });
 *
 * // Cleanup:
 * dropZone.destroy();
 * ```
 */

import type { CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

export interface RuleDropZoneConfig {
  /** The canvas element to listen for drag events on */
  canvasElement: HTMLElement;
  /** Returns a Map of blockId -> HTMLElement for all current blocks */
  getBlockElements: () => Map<string, HTMLElement>;
  /** Called when a rule is dropped on a compatible block */
  onRuleDrop: (blockId: string, ruleId: string) => void;
  /** Called when a rule is dropped on an incompatible block */
  onRuleReject: (ruleId: string) => void;
  /** Determines if a block type is compatible with a rule */
  isCompatible: (blockType: string, ruleId: string) => boolean;
}

export interface RuleDropZoneControls {
  /** Remove all event listeners and clean up data attributes */
  destroy: CleanupFunction;
}

// =============================================================================
// Constants
// =============================================================================

/** MIME type used by the rule-palette primitive for rule drag data */
const RULE_MIME_TYPE = 'application/x-rafters-rule';

/** Fallback MIME type for generic rafters drag data */
const GENERIC_MIME_TYPE = 'application/x-rafters-drag-data';

/** Data attribute set on the highlighted block during dragover */
const DROP_TARGET_ATTR = 'data-rule-drop-target';

/** Data attribute on block elements that identifies the block type */
const BLOCK_TYPE_ATTR = 'data-block-type';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the rule ID from drag data. Reads from the rule-specific MIME type
 * first, then falls back to the generic rafters MIME type.
 *
 * During dragover, dataTransfer.getData() returns empty strings in most
 * browsers (security restriction). We can only read data on drop events.
 * During dragover, we check types to confirm a rule is being dragged.
 */
function extractRuleId(dataTransfer: DataTransfer): string | null {
  const raw = dataTransfer.getData(RULE_MIME_TYPE) || dataTransfer.getData(GENERIC_MIME_TYPE);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'id' in parsed) {
      const id = (parsed as Record<string, unknown>).id;
      return typeof id === 'string' ? id : null;
    }
  } catch {
    // Not JSON, ignore
  }
  return null;
}

/**
 * Check if a drag event carries rule data by inspecting dataTransfer.types.
 * This works during dragover (unlike getData which is restricted).
 */
function hasRuleData(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return (
    dataTransfer.types.includes(RULE_MIME_TYPE) || dataTransfer.types.includes(GENERIC_MIME_TYPE)
  );
}

/**
 * Hit-test a point against all block bounding rects.
 * Returns the blockId and element of the block under the cursor, or null.
 */
function hitTestBlocks(
  clientX: number,
  clientY: number,
  blocks: Map<string, HTMLElement>,
): { blockId: string; element: HTMLElement } | null {
  for (const [blockId, element] of blocks) {
    const rect = element.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return { blockId, element };
    }
  }
  return null;
}

// =============================================================================
// createRuleDropZone
// =============================================================================

export function createRuleDropZone(config: RuleDropZoneConfig): RuleDropZoneControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return { destroy: () => {} };
  }

  const { canvasElement, getBlockElements, onRuleDrop, onRuleReject, isCompatible } = config;

  // =========================================================================
  // State
  // =========================================================================

  /** The block element currently highlighted as a drop target */
  let highlightedElement: HTMLElement | null = null;

  /** Enter/leave counter for nested element handling */
  let enterCount = 0;

  // =========================================================================
  // Highlight Management
  // =========================================================================

  function setHighlight(element: HTMLElement): void {
    if (highlightedElement === element) return;
    clearHighlight();
    element.setAttribute(DROP_TARGET_ATTR, '');
    highlightedElement = element;
  }

  function clearHighlight(): void {
    if (highlightedElement) {
      highlightedElement.removeAttribute(DROP_TARGET_ATTR);
      highlightedElement = null;
    }
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  function handleDragEnter(event: DragEvent): void {
    enterCount++;

    if (!hasRuleData(event.dataTransfer)) return;

    if (enterCount === 1) {
      event.preventDefault();
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (!hasRuleData(event.dataTransfer)) return;

    // Must preventDefault to allow drop
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    // Hit-test blocks to find target
    const blocks = getBlockElements();
    const hit = hitTestBlocks(event.clientX, event.clientY, blocks);

    if (hit) {
      const blockType = hit.element.getAttribute(BLOCK_TYPE_ATTR) ?? '';
      // We cannot read rule ID during dragover due to browser security,
      // so we show highlight optimistically. The compatibility check
      // happens on drop.
      // However, if the consumer has the block type, we can at least
      // show the highlight to indicate a valid drop target.
      if (blockType) {
        setHighlight(hit.element);
      } else {
        setHighlight(hit.element);
      }
    } else {
      clearHighlight();
    }
  }

  function handleDragLeave(_event: DragEvent): void {
    enterCount--;

    if (enterCount <= 0) {
      enterCount = 0;
      clearHighlight();
    }
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    enterCount = 0;

    // Clear highlight first
    clearHighlight();

    if (!event.dataTransfer) return;

    const ruleId = extractRuleId(event.dataTransfer);
    if (!ruleId) return;

    // Hit-test to find which block was dropped on
    const blocks = getBlockElements();
    const hit = hitTestBlocks(event.clientX, event.clientY, blocks);

    if (!hit) {
      // Dropped on empty canvas area -- no-op
      return;
    }

    const blockType = hit.element.getAttribute(BLOCK_TYPE_ATTR) ?? '';

    if (isCompatible(blockType, ruleId)) {
      onRuleDrop(hit.blockId, ruleId);
    } else {
      onRuleReject(ruleId);
    }
  }

  // =========================================================================
  // Event Binding
  // =========================================================================

  canvasElement.addEventListener('dragenter', handleDragEnter);
  canvasElement.addEventListener('dragover', handleDragOver);
  canvasElement.addEventListener('dragleave', handleDragLeave);
  canvasElement.addEventListener('drop', handleDrop);

  // =========================================================================
  // Controls
  // =========================================================================

  function destroy(): void {
    clearHighlight();
    canvasElement.removeEventListener('dragenter', handleDragEnter);
    canvasElement.removeEventListener('dragover', handleDragOver);
    canvasElement.removeEventListener('dragleave', handleDragLeave);
    canvasElement.removeEventListener('drop', handleDrop);
  }

  return { destroy };
}
