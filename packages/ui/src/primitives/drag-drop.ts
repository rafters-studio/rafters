/**
 * Drag and Drop primitive
 * Accessible drag-and-drop with mouse, keyboard, and touch support
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full keyboard support for drag operations
 * - 2.1.3 Keyboard (Level AAA): No keyboard traps during drag
 * - 4.1.2 Name, Role, Value (Level A): ARIA attributes for drag state
 * - 4.1.3 Status Messages (Level AA): Live region announcements for keyboard drag
 *
 * @example
 * ```typescript
 * const draggable = createDraggable({
 *   element: item,
 *   data: { id: 'item-1', type: 'task' },
 *   onDragStart: (data) => console.log('Started dragging:', data),
 *   onDragEnd: (data, dropEffect) => console.log('Dropped:', dropEffect),
 * });
 *
 * const dropZone = createDropZone({
 *   element: container,
 *   accept: (data) => data.type === 'task',
 *   onDrop: (data) => console.log('Received:', data),
 * });
 *
 * // Cleanup
 * draggable.cleanup();
 * dropZone.cleanup();
 * ```
 */

import type { CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Axis constraint for dragging
 */
export type DragAxis = 'x' | 'y' | 'both';

/**
 * Drop effect for drop operations
 */
export type DropEffect = 'none' | 'copy' | 'move' | 'link';

/**
 * Drag event data passed to callbacks
 */
export interface DragEventData {
  /** The original data attached to the draggable */
  data: unknown;
  /** Current X position (relative to viewport) */
  clientX: number;
  /** Current Y position (relative to viewport) */
  clientY: number;
  /** Accumulated horizontal movement */
  deltaX: number;
  /** Accumulated vertical movement */
  deltaY: number;
}

/**
 * Options for createDraggable
 */
export interface DraggableOptions {
  /** Element to make draggable */
  element: HTMLElement;
  /** Optional handle element (if provided, only this element initiates drag) */
  handle?: HTMLElement;
  /** Data associated with this draggable (passed to callbacks and drop zones) */
  data: unknown;
  /** Axis constraint for movement */
  axis?: DragAxis;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Called when drag starts */
  onDragStart?: (data: DragEventData) => void;
  /** Called during drag (on mouse/touch move) */
  onDrag?: (data: DragEventData) => void;
  /** Called when drag ends */
  onDragEnd?: (data: DragEventData, dropEffect: DropEffect) => void;
}

/**
 * Return value from createDraggable
 */
export interface DraggableControls {
  /** Update disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Start keyboard drag mode */
  startKeyboardDrag: () => void;
  /** Move up in keyboard drag mode */
  moveUp: () => void;
  /** Move down in keyboard drag mode */
  moveDown: () => void;
  /** Commit keyboard drag (drop) */
  commitKeyboardDrag: () => void;
  /** Cancel keyboard drag */
  cancelKeyboardDrag: () => void;
  /** Remove all event listeners */
  cleanup: CleanupFunction;
}

/**
 * Options for createDropZone
 */
export interface DropZoneOptions {
  /** Element to use as drop zone */
  element: HTMLElement;
  /** Function to filter acceptable drags (return true to accept) */
  accept?: (data: unknown) => boolean;
  /** Called when drag enters the drop zone */
  onDragEnter?: (data: unknown) => void;
  /** Called when drag moves over the drop zone */
  onDragOver?: (data: unknown) => void;
  /** Called when drag leaves the drop zone */
  onDragLeave?: (data: unknown) => void;
  /** Called when item is dropped */
  onDrop?: (data: unknown, dropEffect: DropEffect) => void;
}

/**
 * Return value from createDropZone
 */
export interface DropZoneControls {
  /** Remove all event listeners */
  cleanup: CleanupFunction;
}

// =============================================================================
// Constants
// =============================================================================

/** Long press duration for touch drag initiation (ms) */
const TOUCH_LONG_PRESS_DURATION = 300;

/** Custom MIME type for drag data transfer */
const DRAG_DATA_TYPE = 'application/x-rafters-drag-data';

// =============================================================================
// Shared State
// =============================================================================

/** Shared state for keyboard drag mode across draggables and drop zones */
let keyboardDragState: {
  active: boolean;
  data: unknown;
  element: HTMLElement | null;
  announcer: HTMLElement | null;
  dropZones: Map<HTMLElement, DropZoneOptions>;
  currentDropZone: HTMLElement | null;
  currentDropZoneIndex: number;
} = {
  active: false,
  data: null,
  element: null,
  announcer: null,
  dropZones: new Map(),
  currentDropZone: null,
  currentDropZoneIndex: -1,
};

/** Registry for drop zones to allow keyboard navigation between them */
const dropZoneRegistry: Set<HTMLElement> = new Set();

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a visually hidden live region for screen reader announcements
 */
function getOrCreateAnnouncer(): HTMLElement {
  if (typeof window === 'undefined') {
    return null as unknown as HTMLElement;
  }

  if (keyboardDragState.announcer) {
    return keyboardDragState.announcer;
  }

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'assertive');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('data-drag-drop-announcer', 'true');

  // Visually hidden but accessible
  Object.assign(announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(announcer);
  keyboardDragState.announcer = announcer;

  return announcer;
}

/**
 * Announce a message to screen readers
 */
function announce(message: string): void {
  if (typeof window === 'undefined') return;

  const announcer = getOrCreateAnnouncer();
  if (!announcer) return;

  // Clear and set to trigger announcement
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/**
 * Get sorted array of drop zone elements
 */
function getDropZonesArray(): HTMLElement[] {
  return Array.from(dropZoneRegistry).sort((a, b) => {
    const rectA = a.getBoundingClientRect();
    const rectB = b.getBoundingClientRect();
    // Sort by vertical position first, then horizontal
    if (rectA.top !== rectB.top) return rectA.top - rectB.top;
    return rectA.left - rectB.left;
  });
}

/**
 * Serialize data for DataTransfer
 */
function serializeData(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

/**
 * Deserialize data from DataTransfer
 */
function deserializeData(serialized: string): unknown {
  try {
    return JSON.parse(serialized);
  } catch {
    return serialized;
  }
}

// =============================================================================
// createDraggable
// =============================================================================

/**
 * Create a draggable element with mouse, keyboard, and touch support
 *
 * @example
 * ```typescript
 * const controls = createDraggable({
 *   element: cardElement,
 *   data: { id: 'card-1' },
 *   onDragStart: () => console.log('Started'),
 *   onDragEnd: (data, effect) => console.log('Ended:', effect),
 * });
 *
 * // Programmatic keyboard drag
 * controls.startKeyboardDrag();
 * controls.moveDown();
 * controls.commitKeyboardDrag();
 *
 * // Cleanup
 * controls.cleanup();
 * ```
 */
export function createDraggable(options: DraggableOptions): DraggableControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      setDisabled: () => {},
      startKeyboardDrag: () => {},
      moveUp: () => {},
      moveDown: () => {},
      commitKeyboardDrag: () => {},
      cancelKeyboardDrag: () => {},
      cleanup: () => {},
    };
  }

  const { element, handle, data, axis = 'both', onDragStart, onDrag, onDragEnd } = options;

  let disabled = options.disabled ?? false;

  let touchLongPressTimer: ReturnType<typeof setTimeout> | null = null;
  let touchStartPosition = { x: 0, y: 0 };
  let startPosition = { x: 0, y: 0 };

  // ==========================================================================
  // ARIA Setup
  // ==========================================================================

  // Set initial ARIA attributes
  element.setAttribute('draggable', 'true');
  element.setAttribute('aria-grabbed', 'false');
  element.setAttribute('tabindex', element.getAttribute('tabindex') ?? '0');
  element.setAttribute('role', element.getAttribute('role') ?? 'button');

  function updateAriaGrabbed(grabbed: boolean): void {
    element.setAttribute('aria-grabbed', grabbed ? 'true' : 'false');
  }

  // ==========================================================================
  // Event Data Builder
  // ==========================================================================

  function createEventData(clientX: number, clientY: number): DragEventData {
    let deltaX = clientX - startPosition.x;
    let deltaY = clientY - startPosition.y;

    // Apply axis constraints
    if (axis === 'x') deltaY = 0;
    if (axis === 'y') deltaX = 0;

    return {
      data,
      clientX,
      clientY,
      deltaX,
      deltaY,
    };
  }

  // ==========================================================================
  // HTML5 Drag and Drop (Mouse)
  // ==========================================================================

  function handleDragStart(event: DragEvent): void {
    if (disabled) {
      event.preventDefault();
      return;
    }

    // Only proceed if drag started from handle
    if (handle && !handle.contains(event.target as Node)) {
      event.preventDefault();
      return;
    }

    startPosition = { x: event.clientX, y: event.clientY };
    updateAriaGrabbed(true);

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'all';
      event.dataTransfer.setData(DRAG_DATA_TYPE, serializeData(data));
      event.dataTransfer.setData('text/plain', serializeData(data));
    }

    const eventData = createEventData(event.clientX, event.clientY);
    onDragStart?.(eventData);
  }

  function handleDrag(event: DragEvent): void {
    if (disabled) return;

    // During drag, clientX/Y may be 0 at the end
    if (event.clientX === 0 && event.clientY === 0) return;

    const eventData = createEventData(event.clientX, event.clientY);
    onDrag?.(eventData);
  }

  function handleDragEnd(event: DragEvent): void {
    if (disabled) return;

    updateAriaGrabbed(false);

    const dropEffect = (event.dataTransfer?.dropEffect ?? 'none') as DropEffect;
    const eventData = createEventData(event.clientX, event.clientY);
    onDragEnd?.(eventData, dropEffect);
  }

  // ==========================================================================
  // Touch Support (Long Press)
  // ==========================================================================

  function handleTouchStart(event: TouchEvent): void {
    if (disabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    // Only proceed if touch started from handle
    if (handle && !handle.contains(event.target as Node)) {
      return;
    }

    touchStartPosition = { x: touch.clientX, y: touch.clientY };

    // Start long press timer
    touchLongPressTimer = setTimeout(() => {
      // Initiate drag after long press
      startPosition = { ...touchStartPosition };
      updateAriaGrabbed(true);

      const eventData = createEventData(touchStartPosition.x, touchStartPosition.y);
      onDragStart?.(eventData);

      // Prevent scrolling during drag
      event.preventDefault();
    }, TOUCH_LONG_PRESS_DURATION);
  }

  function handleTouchMove(event: TouchEvent): void {
    if (disabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    // Cancel long press if moved too much before timer fires
    if (touchLongPressTimer) {
      const dx = Math.abs(touch.clientX - touchStartPosition.x);
      const dy = Math.abs(touch.clientY - touchStartPosition.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(touchLongPressTimer);
        touchLongPressTimer = null;
        return;
      }
    }

    // If drag is active (aria-grabbed is true), call onDrag
    if (element.getAttribute('aria-grabbed') === 'true') {
      event.preventDefault();
      const eventData = createEventData(touch.clientX, touch.clientY);
      onDrag?.(eventData);
    }
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (disabled) return;

    // Clear long press timer if still pending
    if (touchLongPressTimer) {
      clearTimeout(touchLongPressTimer);
      touchLongPressTimer = null;
    }

    // If drag was active, end it
    if (element.getAttribute('aria-grabbed') === 'true') {
      updateAriaGrabbed(false);

      const touch = event.changedTouches[0];
      const clientX = touch?.clientX ?? 0;
      const clientY = touch?.clientY ?? 0;

      // Determine drop effect by checking if over a drop zone
      let dropEffect: DropEffect = 'none';
      const elementAtPoint = document.elementFromPoint(clientX, clientY);
      if (elementAtPoint) {
        for (const dropZone of dropZoneRegistry) {
          if (dropZone.contains(elementAtPoint)) {
            dropEffect = 'move';
            break;
          }
        }
      }

      const eventData = createEventData(clientX, clientY);
      onDragEnd?.(eventData, dropEffect);
    }
  }

  // ==========================================================================
  // Keyboard Support
  // ==========================================================================

  function handleKeyDown(event: KeyboardEvent): void {
    if (disabled) return;

    // Space to pick up or drop
    if (event.key === ' ') {
      event.preventDefault();

      if (keyboardDragState.active && keyboardDragState.element === element) {
        // Drop at current location
        commitKeyboardDrag();
      } else if (!keyboardDragState.active) {
        // Pick up
        startKeyboardDrag();
      }
      return;
    }

    // Arrow keys to move during keyboard drag
    if (keyboardDragState.active && keyboardDragState.element === element) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveUp();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveDown();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelKeyboardDrag();
      }
    }
  }

  function startKeyboardDrag(): void {
    if (disabled) return;
    if (keyboardDragState.active) return;

    const rect = element.getBoundingClientRect();
    startPosition = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    keyboardDragState.active = true;
    keyboardDragState.data = data;
    keyboardDragState.element = element;
    keyboardDragState.currentDropZoneIndex = -1;
    keyboardDragState.currentDropZone = null;

    updateAriaGrabbed(true);

    const eventData = createEventData(startPosition.x, startPosition.y);
    onDragStart?.(eventData);

    announce(
      'Grabbed. Use arrow keys to navigate to a drop zone. Space to drop. Escape to cancel.',
    );
  }

  function moveUp(): void {
    if (!keyboardDragState.active || keyboardDragState.element !== element) return;

    const dropZones = getDropZonesArray();
    if (dropZones.length === 0) return;

    // Leave current drop zone
    if (keyboardDragState.currentDropZone) {
      const currentOptions = keyboardDragState.dropZones.get(keyboardDragState.currentDropZone);
      currentOptions?.onDragLeave?.(data);
      keyboardDragState.currentDropZone.setAttribute('aria-dropeffect', 'none');
    }

    // Move to previous drop zone
    keyboardDragState.currentDropZoneIndex--;
    if (keyboardDragState.currentDropZoneIndex < 0) {
      keyboardDragState.currentDropZoneIndex = dropZones.length - 1;
    }

    const newDropZone = dropZones[keyboardDragState.currentDropZoneIndex];
    if (newDropZone) {
      keyboardDragState.currentDropZone = newDropZone;
      const newOptions = keyboardDragState.dropZones.get(newDropZone);
      newDropZone.setAttribute('aria-dropeffect', 'move');
      newOptions?.onDragEnter?.(data);

      const label =
        newDropZone.getAttribute('aria-label') ??
        `Drop zone ${keyboardDragState.currentDropZoneIndex + 1}`;
      announce(`Over ${label}`);
    }
  }

  function moveDown(): void {
    if (!keyboardDragState.active || keyboardDragState.element !== element) return;

    const dropZones = getDropZonesArray();
    if (dropZones.length === 0) return;

    // Leave current drop zone
    if (keyboardDragState.currentDropZone) {
      const currentOptions = keyboardDragState.dropZones.get(keyboardDragState.currentDropZone);
      currentOptions?.onDragLeave?.(data);
      keyboardDragState.currentDropZone.setAttribute('aria-dropeffect', 'none');
    }

    // Move to next drop zone
    keyboardDragState.currentDropZoneIndex++;
    if (keyboardDragState.currentDropZoneIndex >= dropZones.length) {
      keyboardDragState.currentDropZoneIndex = 0;
    }

    const newDropZone = dropZones[keyboardDragState.currentDropZoneIndex];
    if (newDropZone) {
      keyboardDragState.currentDropZone = newDropZone;
      const newOptions = keyboardDragState.dropZones.get(newDropZone);
      newDropZone.setAttribute('aria-dropeffect', 'move');
      newOptions?.onDragEnter?.(data);

      const label =
        newDropZone.getAttribute('aria-label') ??
        `Drop zone ${keyboardDragState.currentDropZoneIndex + 1}`;
      announce(`Over ${label}`);
    }
  }

  function commitKeyboardDrag(): void {
    if (!keyboardDragState.active || keyboardDragState.element !== element) return;

    let dropEffect: DropEffect = 'none';

    if (keyboardDragState.currentDropZone) {
      const dropZoneOptions = keyboardDragState.dropZones.get(keyboardDragState.currentDropZone);
      const acceptsFn = dropZoneOptions?.accept ?? (() => true);

      if (acceptsFn(data)) {
        dropEffect = 'move';
        dropZoneOptions?.onDrop?.(data, dropEffect);

        const label = keyboardDragState.currentDropZone.getAttribute('aria-label') ?? 'drop zone';
        announce(`Dropped on ${label}`);
      } else {
        announce('Drop cancelled. Target does not accept this item.');
      }

      keyboardDragState.currentDropZone.setAttribute('aria-dropeffect', 'none');
    } else {
      announce('Dropped');
    }

    updateAriaGrabbed(false);

    const rect = element.getBoundingClientRect();
    const eventData = createEventData(rect.left + rect.width / 2, rect.top + rect.height / 2);
    onDragEnd?.(eventData, dropEffect);

    // Reset state
    keyboardDragState.active = false;
    keyboardDragState.data = null;
    keyboardDragState.element = null;
    keyboardDragState.currentDropZone = null;
    keyboardDragState.currentDropZoneIndex = -1;
  }

  function cancelKeyboardDrag(): void {
    if (!keyboardDragState.active || keyboardDragState.element !== element) return;

    // Leave current drop zone
    if (keyboardDragState.currentDropZone) {
      const currentOptions = keyboardDragState.dropZones.get(keyboardDragState.currentDropZone);
      currentOptions?.onDragLeave?.(data);
      keyboardDragState.currentDropZone.setAttribute('aria-dropeffect', 'none');
    }

    updateAriaGrabbed(false);
    announce('Drag cancelled');

    const rect = element.getBoundingClientRect();
    const eventData = createEventData(rect.left + rect.width / 2, rect.top + rect.height / 2);
    onDragEnd?.(eventData, 'none');

    // Reset state
    keyboardDragState.active = false;
    keyboardDragState.data = null;
    keyboardDragState.element = null;
    keyboardDragState.currentDropZone = null;
    keyboardDragState.currentDropZoneIndex = -1;
  }

  // ==========================================================================
  // Event Binding
  // ==========================================================================

  element.addEventListener('dragstart', handleDragStart);
  element.addEventListener('drag', handleDrag);
  element.addEventListener('dragend', handleDragEnd);
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('keydown', handleKeyDown);

  // ==========================================================================
  // Controls
  // ==========================================================================

  function setDisabled(newDisabled: boolean): void {
    disabled = newDisabled;
    element.setAttribute('draggable', disabled ? 'false' : 'true');
    if (disabled) {
      element.removeAttribute('aria-grabbed');
    } else {
      element.setAttribute('aria-grabbed', 'false');
    }
  }

  function cleanup(): void {
    // Cancel any active keyboard drag
    if (keyboardDragState.active && keyboardDragState.element === element) {
      cancelKeyboardDrag();
    }

    // Clear touch timer
    if (touchLongPressTimer) {
      clearTimeout(touchLongPressTimer);
      touchLongPressTimer = null;
    }

    // Remove event listeners
    element.removeEventListener('dragstart', handleDragStart);
    element.removeEventListener('drag', handleDrag);
    element.removeEventListener('dragend', handleDragEnd);
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('keydown', handleKeyDown);

    // Clean up ARIA attributes
    element.removeAttribute('aria-grabbed');
    element.removeAttribute('draggable');
  }

  return {
    setDisabled,
    startKeyboardDrag,
    moveUp,
    moveDown,
    commitKeyboardDrag,
    cancelKeyboardDrag,
    cleanup,
  };
}

// =============================================================================
// createDropZone
// =============================================================================

/**
 * Create a drop zone that accepts draggable items.
 *
 * NOTE: The `onDrop` callback receives the dragged data and drop effect but
 * does NOT provide position coordinates (clientX/clientY). This is by design:
 * createDropZone answers "was something dropped here?" but not "where exactly
 * within the zone?" For position-aware drop handling (e.g., inserting a block
 * between existing blocks based on cursor position), use the canvas-drop-zone
 * primitive (`primitives/canvas-drop-zone.ts`) which calculates insertion
 * indices from cursor proximity to existing block boundaries.
 *
 * @see canvas-drop-zone (`primitives/canvas-drop-zone.ts`) for position-aware drop targeting
 *
 * @example
 * ```typescript
 * const controls = createDropZone({
 *   element: containerElement,
 *   accept: (data) => typeof data === 'object' && data !== null,
 *   onDragEnter: () => container.classList.add('drag-over'),
 *   onDragLeave: () => container.classList.remove('drag-over'),
 *   onDrop: (data) => addItem(data),
 * });
 *
 * // Cleanup
 * controls.cleanup();
 * ```
 */
export function createDropZone(options: DropZoneOptions): DropZoneControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      cleanup: () => {},
    };
  }

  const { element, accept = () => true, onDragEnter, onDragOver, onDragLeave, onDrop } = options;

  // Track enter/leave for nested elements
  let dragEnterCount = 0;

  // ==========================================================================
  // ARIA Setup
  // ==========================================================================

  element.setAttribute('aria-dropeffect', 'none');

  // ==========================================================================
  // Register for keyboard navigation
  // ==========================================================================

  dropZoneRegistry.add(element);
  keyboardDragState.dropZones.set(element, options);

  // ==========================================================================
  // HTML5 Drag and Drop Events
  // ==========================================================================

  function handleDragEnter(event: DragEvent): void {
    dragEnterCount++;

    // Only process on first enter
    if (dragEnterCount !== 1) return;

    event.preventDefault();

    // Get drag data
    const serialized =
      event.dataTransfer?.getData(DRAG_DATA_TYPE) || event.dataTransfer?.getData('text/plain');
    const data = serialized ? deserializeData(serialized) : null;

    if (accept(data)) {
      element.setAttribute('aria-dropeffect', 'move');
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      onDragEnter?.(data);
    }
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();

    const serialized =
      event.dataTransfer?.getData(DRAG_DATA_TYPE) || event.dataTransfer?.getData('text/plain');
    const data = serialized ? deserializeData(serialized) : null;

    if (accept(data)) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      onDragOver?.(data);
    } else {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'none';
      }
    }
  }

  function handleDragLeave(event: DragEvent): void {
    dragEnterCount--;

    // Only process on final leave
    if (dragEnterCount !== 0) return;

    const serialized =
      event.dataTransfer?.getData(DRAG_DATA_TYPE) || event.dataTransfer?.getData('text/plain');
    const data = serialized ? deserializeData(serialized) : null;

    element.setAttribute('aria-dropeffect', 'none');
    onDragLeave?.(data);
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragEnterCount = 0;

    const serialized =
      event.dataTransfer?.getData(DRAG_DATA_TYPE) || event.dataTransfer?.getData('text/plain');
    const data = serialized ? deserializeData(serialized) : null;

    element.setAttribute('aria-dropeffect', 'none');

    if (accept(data)) {
      const dropEffect = (event.dataTransfer?.dropEffect ?? 'move') as DropEffect;
      onDrop?.(data, dropEffect);
    }
  }

  // ==========================================================================
  // Event Binding
  // ==========================================================================

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  // ==========================================================================
  // Controls
  // ==========================================================================

  function cleanup(): void {
    // Unregister from keyboard navigation
    dropZoneRegistry.delete(element);
    keyboardDragState.dropZones.delete(element);

    // Remove event listeners
    element.removeEventListener('dragenter', handleDragEnter);
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('dragleave', handleDragLeave);
    element.removeEventListener('drop', handleDrop);

    // Clean up ARIA attributes
    element.removeAttribute('aria-dropeffect');
  }

  return {
    cleanup,
  };
}

// =============================================================================
// Testing Utilities
// =============================================================================

/**
 * Reset keyboard drag state (for testing)
 */
export function resetDragDropState(): void {
  if (keyboardDragState.announcer) {
    keyboardDragState.announcer.remove();
  }

  keyboardDragState = {
    active: false,
    data: null,
    element: null,
    announcer: null,
    dropZones: new Map(),
    currentDropZone: null,
    currentDropZoneIndex: -1,
  };

  dropZoneRegistry.clear();
}
