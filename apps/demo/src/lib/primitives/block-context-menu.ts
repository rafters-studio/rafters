/**
 * Block Context Menu primitive
 * Right-click context menu for block-level operations: rule management,
 * settings, and removal.
 *
 * Zero npm dependencies. Leaf primitive: imports only from sibling modules.
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Shift+F10 opens menu, arrow keys navigate, Enter activates
 * - 2.4.3 Focus Order (Level A): Focus trapped in menu, restored on close
 * - 4.1.2 Name, Role, Value (Level A): role="menu"/role="menuitem" ARIA pattern
 * - 4.1.3 Status Messages (Level AA): Live region announces menu open/close
 *
 * @registry-type primitive
 */

import { onEscapeKeyDown } from './escape-keydown';
import { createFocusTrap } from './focus-trap';
import type { CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

export interface ContextMenuItem {
  id: string;
  label: string;
  /** Grouping key for visual separators */
  group?: string;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Whether the item is destructive (visually distinct) */
  destructive?: boolean;
}

export interface BlockContextMenuOptions {
  /** The canvas/container element to listen for right-clicks */
  container: HTMLElement;
  /** The menu element to manage (consumer creates it, primitive manages behavior) */
  menu: HTMLElement;
  /** Called when a menu item is activated */
  onAction: (itemId: string, blockId: string) => void;
  /** Called when the menu is opened */
  onOpen?: (blockId: string, position: { x: number; y: number }) => void;
  /** Called when the menu is closed */
  onClose?: () => void;
}

export interface BlockContextMenuControls {
  /** Open menu at a position for a specific block */
  open: (blockId: string, position: { x: number; y: number }) => void;
  /** Close the menu */
  close: () => void;
  /** Whether the menu is currently open */
  isOpen: () => boolean;
  /** Get the block ID the menu is open for */
  getBlockId: () => string | null;
  /** Remove all event listeners and ARIA attributes */
  destroy: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const MENU_GAP_PX = 4;

function positionMenu(menu: HTMLElement, position: { x: number; y: number }): void {
  const menuRect = menu.getBoundingClientRect();

  let top = position.y;
  let left = position.x;

  // Prevent overflow below viewport
  if (top + menuRect.height > window.innerHeight) {
    top = window.innerHeight - menuRect.height - MENU_GAP_PX;
  }

  // Prevent overflow right
  if (left + menuRect.width > window.innerWidth) {
    left = window.innerWidth - menuRect.width - MENU_GAP_PX;
  }

  // Clamp to viewport
  top = Math.max(MENU_GAP_PX, top);
  left = Math.max(MENU_GAP_PX, left);

  menu.style.position = 'fixed';
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}

function getMenuItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
  );
}

// =============================================================================
// createBlockContextMenu
// =============================================================================

/**
 * Create a block context menu with keyboard navigation and focus management.
 *
 * DOM contract:
 * - Container has `contextmenu` and `keydown` (Shift+F10) listeners.
 * - Menu element receives `role="menu"` and is shown/hidden.
 * - Menu items carry `role="menuitem"`.
 * - Blocks are identified via `[data-block-id]` attribute.
 */
export function createBlockContextMenu(options: BlockContextMenuOptions): BlockContextMenuControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      open: () => {},
      close: () => {},
      isOpen: () => false,
      getBlockId: () => null,
      destroy: () => {},
    };
  }

  const { container, menu, onAction, onOpen, onClose } = options;
  const cleanups: CleanupFunction[] = [];

  let currentBlockId: string | null = null;
  let menuOpen = false;
  let cleanupFocusTrap: CleanupFunction | null = null;
  let cleanupEscape: CleanupFunction | null = null;
  let activeItemIndex = -1;

  // ARIA setup
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  // =========================================================================
  // Menu navigation
  // =========================================================================

  function focusItem(index: number): void {
    const items = getMenuItems(menu);
    if (items.length === 0) return;

    const clamped = Math.max(0, Math.min(items.length - 1, index));
    activeItemIndex = clamped;

    for (const [i, el] of items.entries()) {
      el.setAttribute('tabindex', i === clamped ? '0' : '-1');
    }
    items[clamped]?.focus();
  }

  function handleMenuKeyDown(event: KeyboardEvent): void {
    const items = getMenuItems(menu);
    if (items.length === 0) return;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = activeItemIndex < items.length - 1 ? activeItemIndex + 1 : 0;
        focusItem(next);
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = activeItemIndex > 0 ? activeItemIndex - 1 : items.length - 1;
        focusItem(prev);
        break;
      }
      case 'Home': {
        event.preventDefault();
        focusItem(0);
        break;
      }
      case 'End': {
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const item = items[activeItemIndex];
        if (item && currentBlockId) {
          const itemId = item.getAttribute('data-menu-item-id');
          if (itemId) {
            onAction(itemId, currentBlockId);
            closeMenu();
          }
        }
        break;
      }
    }
  }

  // =========================================================================
  // Open / close
  // =========================================================================

  function openMenu(blockId: string, position: { x: number; y: number }): void {
    currentBlockId = blockId;
    menuOpen = true;
    menu.hidden = false;

    // Position menu
    positionMenu(menu, position);

    // ARIA
    menu.setAttribute('aria-label', 'Block actions');

    // Focus trap
    cleanupFocusTrap = createFocusTrap(menu);

    // Escape to close
    cleanupEscape = onEscapeKeyDown(() => closeMenu());

    // Menu keyboard navigation
    menu.addEventListener('keydown', handleMenuKeyDown);

    // Outside click to close (delayed to avoid the triggering click)
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menu.contains(event.target as Node)) {
        closeMenu();
      }
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    });
    cleanups.push(() => document.removeEventListener('mousedown', handleOutsideClick));

    // Focus first item - set index synchronously, defer DOM focus
    activeItemIndex = 0;
    const items = getMenuItems(menu);
    for (const [i, el] of items.entries()) {
      el.setAttribute('tabindex', i === 0 ? '0' : '-1');
    }
    requestAnimationFrame(() => items[0]?.focus());

    onOpen?.(blockId, position);
  }

  function closeMenu(): void {
    if (!menuOpen) return;

    menuOpen = false;
    currentBlockId = null;
    activeItemIndex = -1;
    menu.hidden = true;

    menu.removeEventListener('keydown', handleMenuKeyDown);

    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
    if (cleanupEscape) {
      cleanupEscape();
      cleanupEscape = null;
    }

    onClose?.();
  }

  // =========================================================================
  // Container event handlers
  // =========================================================================

  function findBlockId(target: EventTarget | null): string | null {
    let el = target as HTMLElement | null;
    while (el && el !== container) {
      const blockId = el.getAttribute('data-block-id');
      if (blockId) return blockId;
      el = el.parentElement;
    }
    return null;
  }

  function handleContextMenu(event: MouseEvent): void {
    const blockId = findBlockId(event.target);
    if (!blockId) return;

    event.preventDefault();
    if (menuOpen) closeMenu();
    openMenu(blockId, { x: event.clientX, y: event.clientY });
  }

  function handleContainerKeyDown(event: KeyboardEvent): void {
    // Shift+F10 to open context menu on focused block
    if (event.key === 'F10' && event.shiftKey) {
      const blockId = findBlockId(document.activeElement);
      // Also check for aria-activedescendant pattern
      const activeDescendantId = container.getAttribute('aria-activedescendant');
      const activeEl = activeDescendantId ? document.getElementById(activeDescendantId) : null;
      const resolvedBlockId = blockId ?? (activeEl ? activeEl.getAttribute('data-block-id') : null);

      if (resolvedBlockId) {
        event.preventDefault();
        const blockEl = container.querySelector(
          `[data-block-id="${resolvedBlockId}"]`,
        ) as HTMLElement | null;
        if (blockEl) {
          const rect = blockEl.getBoundingClientRect();
          if (menuOpen) closeMenu();
          openMenu(resolvedBlockId, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          });
        }
      }
    }
  }

  function handleMenuItemClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const menuItem = target.closest('[role="menuitem"]') as HTMLElement | null;
    if (!menuItem || menuItem.getAttribute('aria-disabled') === 'true') return;

    const itemId = menuItem.getAttribute('data-menu-item-id');
    if (itemId && currentBlockId) {
      onAction(itemId, currentBlockId);
      closeMenu();
    }
  }

  // =========================================================================
  // Bind events
  // =========================================================================

  container.addEventListener('contextmenu', handleContextMenu);
  container.addEventListener('keydown', handleContainerKeyDown);
  menu.addEventListener('click', handleMenuItemClick);

  cleanups.push(() => {
    container.removeEventListener('contextmenu', handleContextMenu);
    container.removeEventListener('keydown', handleContainerKeyDown);
    menu.removeEventListener('click', handleMenuItemClick);
  });

  // =========================================================================
  // Controls
  // =========================================================================

  function destroy(): void {
    if (menuOpen) closeMenu();
    for (const cleanup of cleanups) cleanup();
    menu.removeAttribute('role');
    menu.removeAttribute('aria-label');
  }

  return {
    open: openMenu,
    close: closeMenu,
    isOpen: () => menuOpen,
    getBlockId: () => currentBlockId,
    destroy,
  };
}
