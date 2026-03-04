/**
 * Block wrapper primitive - hover chrome, drag handle, and action menu state for individual blocks
 *
 * Manages per-block UI state: hover detection, drag initiation via the drag-drop primitive,
 * and action menu visibility. Does NOT manage the DOM -- callers render based on the
 * returned state and attach the provided event handlers.
 *
 * @registry-name block-wrapper
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/block-wrapper.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 4/10 - Clear visual states, familiar hover-reveal chrome pattern
 * @attention-economics Block chrome (drag handle, menu) appears on hover/focus; content is primary
 * @trust-building Clear selection indicators, accessible action menu, predictable drag behavior
 * @accessibility Drag handle is aria-hidden (screen readers use actions menu), keyboard navigation at canvas level
 * @semantic-meaning Wrapper provides selection, drag, and actions; content is children
 *
 * @usage-patterns
 * DO: Attach handleMouseEnter/handleMouseLeave to the wrapper element
 * DO: Call setMenuOpen(true/false) when the dropdown opens/closes
 * DO: Use shouldShowChrome() to conditionally render drag handle and menu button
 * NEVER: Nest block wrappers
 * NEVER: Add wrapper-level keyboard handlers that conflict with canvas-level navigation
 *
 * @internal-dependencies primitives/drag-drop
 *
 * @example
 * ```ts
 * const wrapper = createBlockWrapper({
 *   id: 'block-1',
 *   dragHandleElement: handleEl,
 *   getIsSelected: () => selectedIds.has('block-1'),
 *   getIsFocused: () => focusedId === 'block-1',
 *   onSelect: (additive) => { ... },
 *   onFocus: () => { ... },
 *   onDelete: () => { ... },
 *   onDuplicate: () => { ... },
 *   onMoveUp: () => { ... },
 *   onMoveDown: () => { ... },
 * });
 *
 * wrapper.shouldShowChrome(); // true when hovered, focused, or menu open
 * wrapper.destroy();
 * ```
 */
import { createDraggable } from './drag-drop';
import type { CleanupFunction } from './types';

// ============================================================================
// Types
// ============================================================================

export interface BlockWrapperOptions {
  /** Unique block identifier */
  id: string;
  /** Container element for the block (drag handle will be attached here if provided) */
  dragHandleElement?: HTMLElement;
  /** Get whether this block is currently selected */
  getIsSelected: () => boolean;
  /** Get whether this block is currently focused */
  getIsFocused: () => boolean;
  /** Called when block should be selected */
  onSelect: (additive?: boolean) => void;
  /** Called when block should receive focus */
  onFocus: () => void;
  /** Called when block should be deleted */
  onDelete: () => void;
  /** Called when block should be duplicated */
  onDuplicate: () => void;
  /** Called when block should move up */
  onMoveUp: () => void;
  /** Called when block should move down */
  onMoveDown: () => void;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
  /** Called when hover/chrome visibility changes */
  onChromeChange?: (showChrome: boolean) => void;
}

export interface BlockWrapperControls {
  /** Whether block chrome (drag handle, menu) should be visible */
  shouldShowChrome: () => boolean;
  /** Handle mouse entering the block wrapper */
  handleMouseEnter: () => void;
  /** Handle mouse leaving the block wrapper */
  handleMouseLeave: () => void;
  /** Handle click on the block content area */
  handleClick: (meta: boolean) => void;
  /** Set whether the actions menu is open (affects chrome visibility) */
  setMenuOpen: (open: boolean) => void;
  /** Clean up event listeners */
  destroy: CleanupFunction;
}

// ============================================================================
// Implementation
// ============================================================================

export function createBlockWrapper(options: BlockWrapperOptions): BlockWrapperControls {
  const {
    id,
    dragHandleElement,
    getIsSelected,
    getIsFocused,
    onSelect,
    onFocus,
    onDelete: _onDelete,
    onDuplicate: _onDuplicate,
    onMoveUp: _onMoveUp,
    onMoveDown: _onMoveDown,
    onDragStart,
    onDragEnd,
    onChromeChange,
  } = options;

  // Suppress unused warnings -- these are available to the consumer via options
  void _onDelete;
  void _onDuplicate;
  void _onMoveUp;
  void _onMoveDown;

  let isHovered = false;
  let isMenuOpen = false;
  const cleanups: CleanupFunction[] = [];

  function computeShowChrome(): boolean {
    return isHovered || getIsFocused() || isMenuOpen;
  }

  function notifyChromeChange(): void {
    onChromeChange?.(computeShowChrome());
  }

  // Set up drag handle if element provided
  if (dragHandleElement) {
    const draggable = createDraggable({
      element: dragHandleElement,
      data: id,
      onDragStart: () => {
        if (!getIsSelected()) onSelect();
        onDragStart?.();
      },
      onDragEnd: () => {
        onDragEnd?.();
      },
    });
    cleanups.push(draggable.cleanup);
  }

  function handleMouseEnter(): void {
    isHovered = true;
    notifyChromeChange();
  }

  function handleMouseLeave(): void {
    isHovered = false;
    notifyChromeChange();
  }

  function handleClick(meta: boolean): void {
    onSelect(meta);
    onFocus();
  }

  function setMenuOpen(open: boolean): void {
    isMenuOpen = open;
    notifyChromeChange();
  }

  return {
    shouldShowChrome: computeShowChrome,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    setMenuOpen,
    destroy() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
