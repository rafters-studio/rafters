/**
 * Rule Dialog primitive
 * Anchored popover for collecting rule configuration before applying to a block.
 * Composes focus-trap and escape-keydown primitives.
 *
 * Zero npm dependencies. Leaf primitive: imports only from sibling modules.
 *
 * WCAG Compliance:
 * - 1.3.1 Info and Relationships (Level A): role="dialog" with aria-modal
 * - 2.1.1 Keyboard (Level A): Focus trapped, Escape to dismiss
 * - 2.4.3 Focus Order (Level A): Focus moves to dialog on open, restores on close
 *
 * @registry-type primitive
 */

import { onEscapeKeyDown } from './escape-keydown';
import { createFocusTrap } from './focus-trap';
import type { CleanupFunction } from './types';

// =============================================================================
// Types
// =============================================================================

export interface RuleDialogOptions {
  /** Element to anchor the dialog near (typically a block element) */
  anchor: HTMLElement;
  /** The dialog container element to manage */
  dialog: HTMLElement;
  /** Called when dialog is dismissed (Escape or outside click) */
  onDismiss: () => void;
}

export interface RuleDialogControls {
  /** Recalculate position relative to anchor */
  reposition: () => void;
  /** Remove all listeners and ARIA attributes */
  destroy: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const DIALOG_GAP_PX = 8;

function positionDialog(anchor: HTMLElement, dialog: HTMLElement): void {
  const anchorRect = anchor.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();

  // Default: position below the anchor, aligned to the left edge
  let top = anchorRect.bottom + DIALOG_GAP_PX;
  let left = anchorRect.left;

  // If dialog would overflow below viewport, position above
  if (top + dialogRect.height > window.innerHeight) {
    top = anchorRect.top - dialogRect.height - DIALOG_GAP_PX;
  }

  // If dialog would overflow right, shift left
  if (left + dialogRect.width > window.innerWidth) {
    left = window.innerWidth - dialogRect.width - DIALOG_GAP_PX;
  }

  // Clamp to viewport
  top = Math.max(DIALOG_GAP_PX, top);
  left = Math.max(DIALOG_GAP_PX, left);

  dialog.style.position = 'fixed';
  dialog.style.top = `${top}px`;
  dialog.style.left = `${left}px`;
}

// =============================================================================
// createRuleDialog
// =============================================================================

/**
 * Create an anchored rule configuration dialog.
 *
 * Sets up positioning, focus trap, escape handling, and outside-click
 * dismissal. The consumer renders form content into the dialog element.
 *
 * DOM contract:
 * - Dialog element receives `role="dialog"` and `aria-modal="true"`.
 * - Focus is trapped inside the dialog.
 * - Escape key dismisses via onDismiss callback.
 * - Click outside the dialog dismisses via onDismiss callback.
 */
export function createRuleDialog(options: RuleDialogOptions): RuleDialogControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      reposition: () => {},
      destroy: () => {},
    };
  }

  const { anchor, dialog, onDismiss } = options;
  const cleanups: CleanupFunction[] = [];

  // ARIA setup
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  // Position dialog near anchor
  positionDialog(anchor, dialog);

  // Focus trap
  const cleanupFocusTrap = createFocusTrap(dialog);
  cleanups.push(cleanupFocusTrap);

  // Escape to dismiss
  const cleanupEscape = onEscapeKeyDown(() => onDismiss());
  cleanups.push(cleanupEscape);

  // Outside click to dismiss (delayed to avoid the triggering click)
  const handleOutsideClick = (event: MouseEvent) => {
    if (!dialog.contains(event.target as Node)) {
      onDismiss();
    }
  };
  // Use requestAnimationFrame to skip the current click event
  requestAnimationFrame(() => {
    document.addEventListener('mousedown', handleOutsideClick);
  });
  cleanups.push(() => document.removeEventListener('mousedown', handleOutsideClick));

  // Controls
  function reposition(): void {
    positionDialog(anchor, dialog);
  }

  function destroy(): void {
    for (const cleanup of cleanups) cleanup();
    dialog.removeAttribute('role');
    dialog.removeAttribute('aria-modal');
  }

  return { reposition, destroy };
}
