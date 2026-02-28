/**
 * Icon Rail primitive
 * Vertical strip of icon buttons for chrome navigation
 *
 * A zero-dependency leaf primitive that manages keyboard navigation,
 * hover events, and ARIA attributes for a vertical icon toolbar.
 * Uses event delegation on the container rather than per-item listeners.
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Full arrow-key navigation with wrap
 * - 2.4.3 Focus Order (Level A): Roving tabindex on items
 * - 4.1.2 Name, Role, Value (Level A): role="toolbar", role="button", aria-pressed
 *
 * Items are identified by `[data-rail-item]` with `data-rail-id` values.
 *
 * @example
 * ```typescript
 * const controls = createIconRail({
 *   container: railEl,
 *   items: [
 *     { id: 'layers', label: 'Layers' },
 *     { id: 'tokens', label: 'Tokens' },
 *   ],
 *   onActivate: (id) => openPanel(id),
 *   onHoverEnter: (id) => previewPanel(id),
 *   onHoverLeave: (id) => hidePreview(id),
 * });
 *
 * // Later...
 * controls.destroy();
 * ```
 */

import type { CleanupFunction } from '@rafters/ui/primitives/types';

// =============================================================================
// Types
// =============================================================================

export interface IconRailItem {
  /** Unique identifier for this rail item */
  id: string;
  /** Accessible label for the button */
  label: string;
  /** Whether this individual item is disabled */
  disabled?: boolean;
}

export interface IconRailOptions {
  /** Container element holding the rail items */
  container: HTMLElement;
  /** Array of rail item descriptors */
  items: IconRailItem[];
  /** ID of the currently active item */
  activeId?: string;
  /** Called when an item is activated via Enter/Space/click */
  onActivate?: (id: string) => void;
  /** Called when hover enters an item (after delay) */
  onHoverEnter?: (id: string) => void;
  /** Called when hover leaves an item */
  onHoverLeave?: (id: string) => void;
  /** Hover delay in milliseconds before onHoverEnter fires */
  hoverDelay?: number;
  /** Whether the entire rail is disabled */
  disabled?: boolean;
}

export interface IconRailControls {
  /** Update the active item */
  setActiveId: (id: string | undefined) => void;
  /** Replace the items array (re-applies ARIA) */
  setItems: (items: IconRailItem[]) => void;
  /** Enable or disable the entire rail */
  setDisabled: (disabled: boolean) => void;
  /** Remove all event listeners and clean up */
  destroy: CleanupFunction;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HOVER_DELAY = 200;
const ITEM_SELECTOR = '[data-rail-item]';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get all item elements in the container
 */
function getItemElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

/**
 * Find the closest rail item element from an event target
 */
function findItemFromTarget(
  container: HTMLElement,
  target: EventTarget | null,
): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const item = target.closest<HTMLElement>(ITEM_SELECTOR);
  if (!item || !container.contains(item)) return null;
  return item;
}

/**
 * Get the rail ID from an item element
 */
function getItemId(element: HTMLElement): string | null {
  return element.getAttribute('data-rail-id');
}

/**
 * Check if an item is disabled (per-item or via aria-disabled)
 */
function isItemDisabled(element: HTMLElement): boolean {
  return element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled');
}

/**
 * Get enabled item elements only
 */
function getEnabledItems(container: HTMLElement): HTMLElement[] {
  return getItemElements(container).filter((el) => !isItemDisabled(el));
}

// =============================================================================
// createIconRail
// =============================================================================

/**
 * Create an icon rail with keyboard navigation, hover, and activation.
 *
 * Expects the container to hold child elements with `data-rail-item`
 * and `data-rail-id` attributes. This primitive manages ARIA attributes
 * and tabindex on those elements.
 */
export function createIconRail(options: IconRailOptions): IconRailControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      setActiveId: () => {},
      setItems: () => {},
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  const { container, onActivate, onHoverEnter, onHoverLeave } = options;

  let items = options.items;
  let activeId = options.activeId;
  let disabled = options.disabled ?? false;
  const hoverDelay = options.hoverDelay ?? DEFAULT_HOVER_DELAY;
  let hoverTimerId: ReturnType<typeof setTimeout> | null = null;
  let hoveredId: string | null = null;

  // =========================================================================
  // ARIA Setup
  // =========================================================================

  /**
   * Build a lookup map from item ID to item definition.
   */
  function buildItemMap(): Map<string, IconRailItem> {
    const map = new Map<string, IconRailItem>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }

  /**
   * Apply ARIA attributes to the container and all item elements.
   * Called on init and when items/activeId/disabled change.
   */
  function applyAria(): void {
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-orientation', 'vertical');

    const itemMap = buildItemMap();
    const allElements = getItemElements(container);

    // Determine which element gets tabindex 0:
    // Prefer the active item if enabled; fall back to first enabled item
    let focusableElement: HTMLElement | null = null;

    for (const el of allElements) {
      const id = getItemId(el);
      if (!id) continue;

      const itemDef = itemMap.get(id);
      const itemDisabled = disabled || (itemDef?.disabled ?? false);

      el.setAttribute('role', 'button');

      if (itemDef?.label) {
        el.setAttribute('aria-label', itemDef.label);
      }

      if (itemDisabled) {
        el.setAttribute('aria-disabled', 'true');
      } else {
        el.removeAttribute('aria-disabled');

        // Track focusable element: prefer active, else first enabled
        if (!focusableElement || id === activeId) {
          focusableElement = el;
        }
      }

      const isActive = id === activeId;
      el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      if (isActive) {
        el.setAttribute('data-active', 'true');
      } else {
        el.removeAttribute('data-active');
      }
    }

    // Second pass: set roving tabindex
    for (const el of allElements) {
      el.setAttribute('tabindex', el === focusableElement ? '0' : '-1');
    }
  }

  applyAria();

  // =========================================================================
  // Focus Management
  // =========================================================================

  /**
   * Move focus to the given item element and update tabindex
   */
  function focusItem(element: HTMLElement): void {
    const allElements = getItemElements(container);
    for (const el of allElements) {
      el.setAttribute('tabindex', el === element ? '0' : '-1');
    }
    element.focus();
  }

  /**
   * Navigate to the next or previous enabled item with wrap
   */
  function navigateByDirection(direction: 1 | -1): void {
    const enabledElements = getEnabledItems(container);
    if (enabledElements.length === 0) return;

    const activeElement = document.activeElement as HTMLElement;
    const currentIndex = enabledElements.indexOf(activeElement);

    let nextIndex: number;
    if (currentIndex === -1) {
      // No current focus in enabled items -- go to first or last
      nextIndex = direction === 1 ? 0 : enabledElements.length - 1;
    } else {
      nextIndex = currentIndex + direction;
      // Wrap
      if (nextIndex < 0) nextIndex = enabledElements.length - 1;
      if (nextIndex >= enabledElements.length) nextIndex = 0;
    }

    const target = enabledElements[nextIndex];
    if (target) focusItem(target);
  }

  /**
   * Jump focus to the first enabled item
   */
  function navigateToFirst(): void {
    const enabledElements = getEnabledItems(container);
    const first = enabledElements[0];
    if (first) focusItem(first);
  }

  /**
   * Jump focus to the last enabled item
   */
  function navigateToLast(): void {
    const enabledElements = getEnabledItems(container);
    const last = enabledElements[enabledElements.length - 1];
    if (last) focusItem(last);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  function isDisabledItem(id: string): boolean {
    if (disabled) return true;
    return items.find((item) => item.id === id)?.disabled ?? false;
  }

  // =========================================================================
  // Activation
  // =========================================================================

  function activateItem(id: string): void {
    if (isDisabledItem(id)) return;
    onActivate?.(id);
  }

  // =========================================================================
  // Hover
  // =========================================================================

  function clearHoverTimer(): void {
    if (hoverTimerId !== null) {
      clearTimeout(hoverTimerId);
      hoverTimerId = null;
    }
  }

  function startHover(id: string): void {
    if (isDisabledItem(id)) return;
    clearHoverTimer();

    if (hoverDelay <= 0) {
      hoveredId = id;
      onHoverEnter?.(id);
    } else {
      hoverTimerId = setTimeout(() => {
        hoverTimerId = null;
        hoveredId = id;
        onHoverEnter?.(id);
      }, hoverDelay);
    }
  }

  function endHover(id: string): void {
    clearHoverTimer();
    if (hoveredId === id) {
      hoveredId = null;
      onHoverLeave?.(id);
    }
  }

  // =========================================================================
  // Event Handlers (delegated on container)
  // =========================================================================

  function handleKeyDown(event: KeyboardEvent): void {
    if (disabled) return;

    const { key } = event;

    switch (key) {
      case 'ArrowDown': {
        event.preventDefault();
        navigateByDirection(1);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        navigateByDirection(-1);
        break;
      }
      case 'Home': {
        event.preventDefault();
        navigateToFirst();
        break;
      }
      case 'End': {
        event.preventDefault();
        navigateToLast();
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const item = findItemFromTarget(container, event.target);
        if (!item) return;
        const id = getItemId(item);
        if (id) activateItem(id);
        break;
      }
    }
  }

  function handleClick(event: MouseEvent): void {
    if (disabled) return;

    const item = findItemFromTarget(container, event.target);
    if (!item) return;

    const id = getItemId(item);
    if (id) activateItem(id);
  }

  function handleMouseOver(event: MouseEvent): void {
    if (disabled) return;

    const item = findItemFromTarget(container, event.target);
    if (!item) return;

    const id = getItemId(item);
    if (id) startHover(id);
  }

  function handleMouseOut(event: MouseEvent): void {
    const item = findItemFromTarget(container, event.target);
    if (!item) return;

    // Only fire leave if the mouse actually left the item
    const related = event.relatedTarget as HTMLElement | null;
    if (related && item.contains(related)) return;

    const id = getItemId(item);
    if (id) endHover(id);
  }

  function handleFocusIn(event: FocusEvent): void {
    // When tabbing into the container, ensure the right item is focused.
    // If active item exists and is enabled, focus it.
    // Otherwise the roving tabindex already handles this via the 0/-1 pattern.
    const target = event.target as HTMLElement;
    const allItems = getItemElements(container);
    if (!allItems.includes(target)) return;

    // Update tabindex to track focus
    for (const el of allItems) {
      el.setAttribute('tabindex', el === target ? '0' : '-1');
    }
  }

  // =========================================================================
  // Bind Events (delegation)
  // =========================================================================

  container.addEventListener('keydown', handleKeyDown);
  container.addEventListener('click', handleClick);
  container.addEventListener('mouseover', handleMouseOver);
  container.addEventListener('mouseout', handleMouseOut);
  container.addEventListener('focusin', handleFocusIn);

  // =========================================================================
  // Controls
  // =========================================================================

  function setActiveId(id: string | undefined): void {
    activeId = id;
    applyAria();
  }

  function setItems(newItems: IconRailItem[]): void {
    items = newItems;
    applyAria();
  }

  function setDisabled(newDisabled: boolean): void {
    disabled = newDisabled;
    applyAria();
  }

  function destroy(): void {
    clearHoverTimer();

    container.removeEventListener('keydown', handleKeyDown);
    container.removeEventListener('click', handleClick);
    container.removeEventListener('mouseover', handleMouseOver);
    container.removeEventListener('mouseout', handleMouseOut);
    container.removeEventListener('focusin', handleFocusIn);

    // Clean up ARIA from container
    container.removeAttribute('role');
    container.removeAttribute('aria-orientation');

    // Clean up item ARIA
    const allElements = getItemElements(container);
    for (const el of allElements) {
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
      el.removeAttribute('aria-disabled');
      el.removeAttribute('aria-pressed');
      el.removeAttribute('data-active');
      el.removeAttribute('tabindex');
    }
  }

  return {
    setActiveId,
    setItems,
    setDisabled,
    destroy,
  };
}
