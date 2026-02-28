/**
 * Panel Reveal primitive
 * Show/hide lifecycle for content panels triggered from an icon rail
 *
 * Key UX: panels live BELOW the canvas in z-depth, not above it.
 * The canvas always has maximum visual prominence.
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Escape key dismissal, focus return
 * - 4.1.2 Name, Role, Value (Level A): aria-expanded, aria-controls, role=region
 * - 4.1.3 Status Messages (Level AA): Live region announcements
 *
 * @example
 * ```typescript
 * const controls = createPanelReveal({
 *   trigger: railButton,
 *   panel: panelElement,
 *   onOpen: () => console.log('opened'),
 *   onClose: () => console.log('closed'),
 * });
 *
 * controls.toggle();
 * controls.isOpen(); // true
 * controls.destroy();
 * ```
 */

import type { CleanupFunction } from '@rafters/ui/primitives/types';

// =============================================================================
// Types
// =============================================================================

export interface PanelRevealOptions {
  /** Trigger element (icon rail button) */
  trigger: HTMLElement;
  /** Panel element to reveal */
  panel: HTMLElement;
  /** Called when panel opens */
  onOpen?: () => void;
  /** Called when panel closes */
  onClose?: () => void;
  /**
   * Delay in ms before closing after mouse leaves trigger/panel.
   * Re-entering either element cancels the timer.
   * @default 300
   */
  closeDelay?: number;
  /**
   * When true, Tab/Shift+Tab are constrained within the panel while open.
   * @default false
   */
  trapFocus?: boolean;
  /**
   * When true, open/close/toggle are no-ops.
   * @default false
   */
  disabled?: boolean;
}

export interface PanelRevealControls {
  /** Open the panel */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Toggle the panel */
  toggle: () => void;
  /** Whether the panel is currently open */
  isOpen: () => boolean;
  /** Update the disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Remove all listeners and ARIA attributes */
  destroy: CleanupFunction;
}

// =============================================================================
// Constants
// =============================================================================

/** Default close delay in ms */
const DEFAULT_CLOSE_DELAY = 300;

/** CSS custom property set on panel for depth management */
const PANEL_DEPTH_PROPERTY = '--panel-depth';

/** Panel depth value (below canvas, which sits at a higher z-index) */
const PANEL_DEPTH_VALUE = '1';

/** Focusable element selector */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// =============================================================================
// Announcer
// =============================================================================

/** Shared announcer element for panel reveal instances */
let sharedAnnouncer: HTMLElement | null = null;

/**
 * Get or create a visually hidden live region for screen reader announcements
 */
function getOrCreateAnnouncer(): HTMLElement {
  if (sharedAnnouncer?.isConnected) {
    return sharedAnnouncer;
  }

  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', 'status');
  el.setAttribute('data-panel-reveal-announcer', 'true');

  Object.assign(el.style, {
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

  document.body.appendChild(el);
  sharedAnnouncer = el;

  return el;
}

/**
 * Announce a message to screen readers via the shared live region
 */
function announce(message: string): void {
  const announcer = getOrCreateAnnouncer();
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

// =============================================================================
// createPanelReveal
// =============================================================================

/**
 * Create a panel reveal controller.
 *
 * Manages show/hide lifecycle of a content panel triggered from an icon rail.
 * Supports hover continuation, outside click/Escape dismissal, optional focus
 * trap, and screen reader announcements.
 */
export function createPanelReveal(options: PanelRevealOptions): PanelRevealControls {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      open: () => {},
      close: () => {},
      toggle: () => {},
      isOpen: () => false,
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  const {
    trigger,
    panel,
    onOpen,
    onClose,
    closeDelay = DEFAULT_CLOSE_DELAY,
    trapFocus = false,
  } = options;

  let disabled = options.disabled ?? false;
  let open = false;
  let closeTimerId: ReturnType<typeof setTimeout> | null = null;
  let focusTrapCleanup: CleanupFunction | null = null;

  // =========================================================================
  // Helpers
  // =========================================================================

  /** Generate or retrieve a unique ID for the panel */
  function ensurePanelId(): string {
    let id = panel.getAttribute('id');
    if (!id) {
      // Ephemeral DOM ID -- UUIDv7 not used to preserve zero-dep leaf primitive constraint
      id = `panel-reveal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      panel.setAttribute('id', id);
    }
    return id;
  }

  /** Derive an accessible label from the trigger */
  function getTriggerLabel(): string {
    return trigger.getAttribute('aria-label') ?? trigger.textContent?.trim() ?? 'Panel';
  }

  /** Clear any pending close timer */
  function clearCloseTimer(): void {
    if (closeTimerId !== null) {
      clearTimeout(closeTimerId);
      closeTimerId = null;
    }
  }

  /** Get all focusable elements within the panel */
  function getFocusableElements(): HTMLElement[] {
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  // =========================================================================
  // Focus Trap (inline, zero-dep)
  // =========================================================================

  function enableFocusTrap(): void {
    if (!trapFocus) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? focusable.indexOf(active) : -1;
      const direction = event.shiftKey ? -1 : 1;
      const nextIndex = (currentIndex + direction + focusable.length) % focusable.length;
      const target = focusable[nextIndex];

      if (target) {
        event.preventDefault();
        target.focus();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);

    focusTrapCleanup = () => {
      panel.removeEventListener('keydown', handleKeyDown);
    };
  }

  function disableFocusTrap(): void {
    if (focusTrapCleanup) {
      focusTrapCleanup();
      focusTrapCleanup = null;
    }
  }

  // =========================================================================
  // ARIA Setup
  // =========================================================================

  const panelId = ensurePanelId();
  const label = getTriggerLabel();

  // Trigger attributes
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', panelId);

  // Panel attributes
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', label);
  panel.setAttribute('data-state', 'closed');
  panel.style.setProperty(PANEL_DEPTH_PROPERTY, PANEL_DEPTH_VALUE);

  // =========================================================================
  // State Transitions
  // =========================================================================

  function doOpen(): void {
    if (open || disabled) return;

    clearCloseTimer();
    open = true;

    panel.setAttribute('data-state', 'open');
    trigger.setAttribute('aria-expanded', 'true');

    enableFocusTrap();
    announce('Panel opened');

    onOpen?.();
  }

  function doClose(): void {
    if (!open || disabled) return;

    clearCloseTimer();
    open = false;

    panel.setAttribute('data-state', 'closed');
    trigger.setAttribute('aria-expanded', 'false');

    disableFocusTrap();

    // Return focus to trigger
    trigger.focus();

    announce('Panel closed');

    onClose?.();
  }

  function doToggle(): void {
    if (disabled) return;
    if (open) {
      doClose();
    } else {
      doOpen();
    }
  }

  /** Schedule close after delay. Re-entering trigger/panel cancels the timer. */
  function scheduleClose(): void {
    if (!open) return;

    clearCloseTimer();

    if (closeDelay === 0) {
      doClose();
    } else {
      closeTimerId = setTimeout(doClose, closeDelay);
    }
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  // -- Hover continuation --
  // Moving from trigger to panel (and vice versa) should keep it open.
  // Leaving both starts the close delay. Re-entering cancels it.

  let hoveringTrigger = false;
  let hoveringPanel = false;

  function handleMouseEnter(source: 'trigger' | 'panel'): void {
    if (source === 'trigger') hoveringTrigger = true;
    else hoveringPanel = true;
    clearCloseTimer();
  }

  function handleMouseLeave(source: 'trigger' | 'panel'): void {
    if (source === 'trigger') hoveringTrigger = false;
    else hoveringPanel = false;
    if (!hoveringTrigger && !hoveringPanel && open) {
      scheduleClose();
    }
  }

  // -- Escape key --

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      doClose();
    }
  }

  // -- Outside click --
  // Close when clicking outside both trigger and panel.

  function handleOutsideClick(event: MouseEvent): void {
    if (!open) return;

    const target = event.target as Node;
    if (trigger.contains(target) || panel.contains(target)) return;

    doClose();
  }

  // =========================================================================
  // Event Binding
  // =========================================================================

  const handleTriggerMouseEnter = () => handleMouseEnter('trigger');
  const handleTriggerMouseLeave = () => handleMouseLeave('trigger');
  const handlePanelMouseEnter = () => handleMouseEnter('panel');
  const handlePanelMouseLeave = () => handleMouseLeave('panel');

  trigger.addEventListener('click', doToggle);
  trigger.addEventListener('mouseenter', handleTriggerMouseEnter);
  trigger.addEventListener('mouseleave', handleTriggerMouseLeave);

  panel.addEventListener('mouseenter', handlePanelMouseEnter);
  panel.addEventListener('mouseleave', handlePanelMouseLeave);

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleOutsideClick, true);

  // =========================================================================
  // Controls
  // =========================================================================

  function setDisabled(newDisabled: boolean): void {
    // Close the panel before disabling, so the disabled guard in doClose
    // does not prevent the state transition.
    if (newDisabled && open) {
      doClose();
    }
    disabled = newDisabled;
  }

  function destroy(): void {
    clearCloseTimer();
    disableFocusTrap();

    // Remove event listeners
    trigger.removeEventListener('click', doToggle);
    trigger.removeEventListener('mouseenter', handleTriggerMouseEnter);
    trigger.removeEventListener('mouseleave', handleTriggerMouseLeave);

    panel.removeEventListener('mouseenter', handlePanelMouseEnter);
    panel.removeEventListener('mouseleave', handlePanelMouseLeave);

    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('mousedown', handleOutsideClick, true);

    // Clean up ARIA attributes
    trigger.removeAttribute('aria-expanded');
    trigger.removeAttribute('aria-controls');

    panel.removeAttribute('role');
    panel.removeAttribute('aria-label');
    panel.removeAttribute('data-state');
    panel.style.removeProperty(PANEL_DEPTH_PROPERTY);
  }

  return {
    open: doOpen,
    close: doClose,
    toggle: doToggle,
    isOpen: () => open,
    setDisabled,
    destroy,
  };
}

// =============================================================================
// Testing Utilities
// =============================================================================

/**
 * Reset shared announcer state (for testing)
 */
export function resetPanelRevealState(): void {
  if (sharedAnnouncer) {
    sharedAnnouncer.remove();
    sharedAnnouncer = null;
  }
}
