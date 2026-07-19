/**
 * Dismissable Layer primitive
 * Unified primitive combining outside click, escape key, and focus outside detection
 *
 * WCAG Compliance:
 * - 2.1.2 No Keyboard Trap (Level A): Escape key dismisses layer
 * - 3.2.1 On Focus (Level A): Focus changes don't unexpectedly change context
 * - 3.2.2 On Input (Level A): Changing settings doesn't change context
 *
 * @example
 * ```typescript
 * const cleanup = createDismissableLayer(dropdownElement, {
 *   onDismiss: () => closeDropdown(),
 *   disableOutsidePointerEvents: true,
 * });
 * ```
 */

import type {
  CleanupFunction,
  EscapeKeyHandler,
  FocusOutsideHandler,
  PointerDownOutsideHandler,
} from './types';

export interface DismissableLayerOptions {
  /**
   * Whether the dismissable layer is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Disable pointer events outside the layer
   * Useful for modal dialogs
   * @default false
   */
  disableOutsidePointerEvents?: boolean;

  /**
   * Called when Escape key is pressed
   */
  onEscapeKeyDown?: EscapeKeyHandler;

  /**
   * Called when pointer down occurs outside the layer
   */
  onPointerDownOutside?: PointerDownOutsideHandler;

  /**
   * Called when focus moves outside the layer
   */
  onFocusOutside?: FocusOutsideHandler;

  /**
   * Called for any outside interaction (pointer, focus, or escape)
   */
  onInteractOutside?: (event: Event) => void;

  /**
   * Called when the layer should be dismissed
   * Convenience handler called for any dismissal trigger
   */
  onDismiss?: () => void;

  /**
   * Elements that should be considered "inside" the layer
   * Useful for portaled content
   */
  excludeElements?: HTMLElement[];
}

/**
 * Track pointer down timestamp to deduplicate touch/pointer events
 * Uses a WeakMap per layer to avoid cross-layer interference
 */
const layerPointerDownTime = new WeakMap<HTMLElement, number>();

/**
 * Check if an element is inside the layer or excluded elements
 */
function isInsideLayer(
  target: Node,
  layer: HTMLElement,
  excludeElements: HTMLElement[] = [],
): boolean {
  if (layer.contains(target)) return true;

  for (const excluded of excludeElements) {
    if (excluded.contains(target)) return true;
  }

  return false;
}

/**
 * Style element for disabling outside pointer events
 */
let pointerEventsStyleElement: HTMLStyleElement | null = null;
let pointerEventsLayerCount = 0;

/**
 * Add CSS to disable pointer events outside layers
 */
function addPointerEventsBlocker(): void {
  pointerEventsLayerCount++;

  if (pointerEventsLayerCount === 1) {
    pointerEventsStyleElement = document.createElement('style');
    pointerEventsStyleElement.textContent = `
      body > *:not([data-dismissable-layer]) {
        pointer-events: none !important;
      }
      [data-dismissable-layer] {
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(pointerEventsStyleElement);
  }
}

/**
 * Remove CSS for disabling pointer events
 */
function removePointerEventsBlocker(): void {
  pointerEventsLayerCount--;

  if (pointerEventsLayerCount === 0 && pointerEventsStyleElement) {
    pointerEventsStyleElement.remove();
    pointerEventsStyleElement = null;
  }
}

/**
 * Create a dismissable layer with combined dismissal detection
 * Returns cleanup function to remove all listeners
 *
 * @example
 * ```typescript
 * // Basic dropdown
 * const cleanup = createDismissableLayer(dropdown, {
 *   onDismiss: () => setOpen(false),
 * });
 *
 * // Modal dialog
 * const cleanup = createDismissableLayer(dialog, {
 *   disableOutsidePointerEvents: true,
 *   onEscapeKeyDown: (e) => {
 *     e.preventDefault();
 *     closeDialog();
 *   },
 *   onPointerDownOutside: (e) => {
 *     e.preventDefault(); // Prevent focus shift
 *     closeDialog();
 *   },
 * });
 *
 * // With portaled content
 * const cleanup = createDismissableLayer(trigger, {
 *   excludeElements: [portaledContent],
 *   onDismiss: () => closePopover(),
 * });
 * ```
 */
export function createDismissableLayer(
  layer: HTMLElement,
  options: DismissableLayerOptions = {},
): CleanupFunction {
  // SSR guard
  if (typeof window === 'undefined') {
    return () => {};
  }

  const {
    enabled = true,
    disableOutsidePointerEvents = false,
    onEscapeKeyDown,
    onPointerDownOutside,
    onFocusOutside,
    onInteractOutside,
    onDismiss,
    excludeElements = [],
  } = options;

  if (!enabled) {
    return () => {};
  }

  const cleanupFunctions: CleanupFunction[] = [];

  // Mark layer for pointer events blocking
  layer.setAttribute('data-dismissable-layer', '');

  // Handle Escape key
  const handleEscapeKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;

    onEscapeKeyDown?.(event);
    onInteractOutside?.(event);
    onDismiss?.();
  };

  document.addEventListener('keydown', handleEscapeKeyDown);
  cleanupFunctions.push(() => {
    document.removeEventListener('keydown', handleEscapeKeyDown);
  });

  // Handle pointer down outside
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target as Node;

    // Deduplicate with recent touch events (only within same layer)
    const lastTime = layerPointerDownTime.get(layer) ?? 0;
    const timeSinceLastPointer = Date.now() - lastTime;
    if (timeSinceLastPointer < 50) return;
    layerPointerDownTime.set(layer, Date.now());

    if (!isInsideLayer(target, layer, excludeElements)) {
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      onDismiss?.();
    }
  };

  // Handle touch start (fallback for test environments)
  const handleTouchStart = (event: TouchEvent) => {
    const target = event.target as Node;

    layerPointerDownTime.set(layer, Date.now());

    if (!isInsideLayer(target, layer, excludeElements)) {
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      onDismiss?.();
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('touchstart', handleTouchStart, true);
  cleanupFunctions.push(() => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('touchstart', handleTouchStart, true);
  });

  // Handle focus outside
  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as Node;

    if (!isInsideLayer(target, layer, excludeElements)) {
      onFocusOutside?.(event);
      onInteractOutside?.(event);
      // Note: We don't call onDismiss for focus outside by default
      // This is intentional to match Radix behavior
    }
  };

  document.addEventListener('focusin', handleFocusIn);
  cleanupFunctions.push(() => {
    document.removeEventListener('focusin', handleFocusIn);
  });

  // Handle pointer events blocking
  if (disableOutsidePointerEvents) {
    addPointerEventsBlocker();
    cleanupFunctions.push(removePointerEventsBlocker);
  }

  // Cleanup function
  return () => {
    layer.removeAttribute('data-dismissable-layer');

    for (const cleanup of cleanupFunctions) {
      cleanup();
    }
  };
}

/**
 * Create a nested dismissable layer
 * Handles stacking of multiple layers (e.g., dialog with dropdown)
 *
 * @example
 * ```typescript
 * // First layer (dialog)
 * const dialogCleanup = createDismissableLayerStack(dialog, {
 *   onDismiss: closeDialog,
 * });
 *
 * // Second layer (dropdown inside dialog)
 * const dropdownCleanup = createDismissableLayerStack(dropdown, {
 *   onDismiss: closeDropdown,
 * });
 *
 * // Escape closes dropdown first, then dialog
 * ```
 */
const layerStack: HTMLElement[] = [];

export function createDismissableLayerStack(
  layer: HTMLElement,
  options: DismissableLayerOptions = {},
): CleanupFunction {
  // SSR guard
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Add to stack
  layerStack.push(layer);

  const isTopmost = () => layerStack[layerStack.length - 1] === layer;

  // The base createDismissableLayer fires onInteractOutside and onDismiss
  // unconditionally after the trigger-specific handler. Passing the raw
  // options.onDismiss straight through would dismiss EVERY stacked layer on a
  // single Escape (or a single outside click). Gate all consumer callbacks --
  // including onInteractOutside and onDismiss -- on this layer being topmost,
  // so one Escape pops exactly one layer, top-down.
  const baseCleanup = createDismissableLayer(layer, {
    ...options,
    onEscapeKeyDown: (event) => {
      if (!isTopmost()) return;
      options.onEscapeKeyDown?.(event);
    },
    onPointerDownOutside: (event) => {
      if (!isTopmost()) return;
      options.onPointerDownOutside?.(event);
    },
    onFocusOutside: (event) => {
      if (!isTopmost()) return;
      options.onFocusOutside?.(event);
    },
    onInteractOutside: (event) => {
      if (!isTopmost()) return;
      options.onInteractOutside?.(event);
    },
    onDismiss: () => {
      if (!isTopmost()) return;
      options.onDismiss?.();
    },
  });

  return () => {
    // Remove from stack
    const index = layerStack.indexOf(layer);
    if (index !== -1) {
      layerStack.splice(index, 1);
    }

    baseCleanup();
  };
}

/**
 * Get current layer stack (for debugging/testing)
 */
export function getDismissableLayerStack(): readonly HTMLElement[] {
  return [...layerStack];
}

/**
 * Clear the layer stack (for testing)
 */
export function clearDismissableLayerStack(): void {
  layerStack.length = 0;
}
