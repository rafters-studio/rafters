/**
 * Chrome Handler composition primitive
 * Orchestrates icon-rail and panel-reveal into a unified chrome state machine
 *
 * A composition primitive that uses nanostores atoms to share reactive state
 * between the icon rail (navigation strip) and panel reveal instances (content
 * panels). Manages single-active-panel semantics, hover-to-preview with
 * click-to-pin, settings panel independence, and collapse/expand.
 *
 * State machine:
 *   idle -> panel-open (hover preview or click)
 *   panel-open -> idle (hover leave, Escape)
 *   panel-open -> panel-open (switch panel)
 *   any -> settings-open (settings trigger)
 *   any -> collapsed (Cmd/Ctrl+\)
 *   collapsed -> idle (expand)
 *
 * WCAG Compliance:
 * - 2.1.1 Keyboard (Level A): Enter/Space pins, Escape dismisses, Cmd/Ctrl+\ toggles collapse
 * - Delegates to icon-rail and panel-reveal for ARIA semantics
 *
 * @registry-name chrome-handler
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/chrome-handler.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 8/10 - Orchestrates two leaf primitives with hover/pin/collapse state
 * @dependencies nanostores@^1.1.0
 * @internal-dependencies icon-rail, panel-reveal
 *
 * @usage-patterns
 * DO: Use createChromeHandler to get a single reactive store for chrome state
 * DO: Subscribe to $state for mode, active panel, and pinned state
 * DO: Call destroy() on cleanup to tear down all child primitives
 * NEVER: Import icon-rail or panel-reveal directly when chrome-handler is available
 * NEVER: Mutate the atom value directly -- use the provided action functions
 *
 * @example
 * ```ts
 * const handler = createChromeHandler({
 *   railContainer: document.getElementById('rail')!,
 *   panels: new Map([
 *     ['layers', { trigger: triggerEl, panel: panelEl }],
 *   ]),
 *   railItems: [{ id: 'layers', label: 'Layers' }],
 * });
 *
 * handler.$state.subscribe((s) => console.log(s.mode, s.activePanelId));
 * handler.openPanel('layers');
 * handler.destroy();
 * ```
 */

import { atom } from 'nanostores';
import type { IconRailItem } from './icon-rail.js';
import { createIconRail } from './icon-rail.js';
import type { PanelRevealControls } from './panel-reveal.js';
import { createPanelReveal } from './panel-reveal.js';

// =============================================================================
// Types
// =============================================================================

export interface ChromePanelConfig {
  id: string;
  label: string;
}

export type ChromeMode = 'idle' | 'panel-open' | 'settings-open' | 'collapsed';

export interface ChromeHandlerState {
  mode: ChromeMode;
  activePanelId: string | undefined;
  pinnedPanelId: string | undefined;
  settingsOpen: boolean;
  collapsed: boolean;
}

export interface ChromeHandlerOptions {
  railContainer: HTMLElement;
  panels: Map<string, { trigger: HTMLElement; panel: HTMLElement }>;
  settingsTrigger?: HTMLElement;
  settingsPanel?: HTMLElement;
  railItems: Array<{ id: string; label: string; disabled?: boolean }>;
  hoverDelay?: number;
  closeDelay?: number;
  disabled?: boolean;
}

export interface ChromeHandlerControls {
  $state: {
    get(): ChromeHandlerState;
    subscribe(cb: (v: ChromeHandlerState) => void): () => void;
  };
  openPanel: (id: string) => void;
  closePanel: () => void;
  togglePanel: (id: string) => void;
  pinPanel: (id: string) => void;
  unpinPanel: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  collapse: () => void;
  expand: () => void;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HOVER_DELAY = 200;
const DEFAULT_CLOSE_DELAY = 300;

// =============================================================================
// Initial State
// =============================================================================

const INITIAL_STATE: ChromeHandlerState = {
  mode: 'idle',
  activePanelId: undefined,
  pinnedPanelId: undefined,
  settingsOpen: false,
  collapsed: false,
};

// =============================================================================
// createChromeHandler
// =============================================================================

export function createChromeHandler(options: ChromeHandlerOptions): ChromeHandlerControls {
  // SSR guard
  if (typeof window === 'undefined') {
    const noopState = {
      get: () => ({ ...INITIAL_STATE }),
      subscribe: () => () => {},
    };
    return {
      $state: noopState,
      openPanel: () => {},
      closePanel: () => {},
      togglePanel: () => {},
      pinPanel: () => {},
      unpinPanel: () => {},
      openSettings: () => {},
      closeSettings: () => {},
      collapse: () => {},
      expand: () => {},
      setDisabled: () => {},
      destroy: () => {},
    };
  }

  const {
    railContainer,
    panels,
    settingsTrigger,
    settingsPanel,
    railItems,
    hoverDelay = DEFAULT_HOVER_DELAY,
    closeDelay = DEFAULT_CLOSE_DELAY,
  } = options;

  let disabled = options.disabled ?? false;

  // ---------------------------------------------------------------------------
  // Reactive state atom
  // ---------------------------------------------------------------------------

  const $state = atom<ChromeHandlerState>({ ...INITIAL_STATE });

  function setState(patch: Partial<ChromeHandlerState>): void {
    const next = { ...$state.get(), ...patch };
    // Derive mode from state
    if (next.collapsed) next.mode = 'collapsed';
    else if (next.settingsOpen) next.mode = 'settings-open';
    else if (next.activePanelId !== undefined) next.mode = 'panel-open';
    else next.mode = 'idle';
    $state.set(next);
  }

  // ---------------------------------------------------------------------------
  // Panel reveal instances
  // ---------------------------------------------------------------------------

  const panelReveals = new Map<string, PanelRevealControls>();

  for (const [id, { trigger, panel }] of panels) {
    const reveal = createPanelReveal({
      trigger,
      panel,
      closeDelay,
      disabled,
      // We manage open/close ourselves, so we suppress the panel-reveal's
      // own trigger click handler by not providing onOpen/onClose here.
      // Instead we call reveal.open()/reveal.close() imperatively.
    });
    panelReveals.set(id, reveal);
  }

  // Settings panel reveal (independent)
  let settingsReveal: PanelRevealControls | undefined;
  if (settingsTrigger && settingsPanel) {
    settingsReveal = createPanelReveal({
      trigger: settingsTrigger,
      panel: settingsPanel,
      closeDelay,
      disabled,
    });
  }

  // ---------------------------------------------------------------------------
  // Icon rail instance
  // ---------------------------------------------------------------------------

  const iconRail = createIconRail({
    container: railContainer,
    items: railItems as IconRailItem[],
    hoverDelay,
    disabled,
    onActivate: (id: string) => {
      if (disabled) return;
      // Click/Enter/Space on rail item -> pin the panel
      pinPanel(id);
    },
    onHoverEnter: (id: string) => {
      if (disabled) return;
      // Hover preview -- open panel without pinning
      openPanelInternal(id, false);
    },
    onHoverLeave: (_id: string) => {
      if (disabled) return;
      // Only close if the panel is not pinned
      const state = $state.get();
      if (state.pinnedPanelId !== undefined) return;
      closePanelInternal();
    },
  });

  // ---------------------------------------------------------------------------
  // Panel management
  // ---------------------------------------------------------------------------

  /**
   * Open a panel. If `pin` is true, the panel becomes pinned.
   * Closes any previously open panel first (single-active-panel).
   */
  function openPanelInternal(id: string, pin: boolean): void {
    if (disabled) return;
    if ($state.get().collapsed) return;

    const reveal = panelReveals.get(id);
    if (!reveal) return;

    const state = $state.get();

    // Close the previously active panel if switching
    if (state.activePanelId !== undefined && state.activePanelId !== id) {
      const prevReveal = panelReveals.get(state.activePanelId);
      if (prevReveal?.isOpen()) {
        prevReveal.close();
      }
    }

    // Open the new panel
    if (!reveal.isOpen()) {
      reveal.open();
    }

    // Update rail active indicator
    iconRail.setActiveId(id);

    setState({
      activePanelId: id,
      pinnedPanelId: pin ? id : state.pinnedPanelId,
    });
  }

  /**
   * Close the currently active panel.
   */
  function closePanelInternal(): void {
    const state = $state.get();
    if (state.activePanelId === undefined) return;

    const reveal = panelReveals.get(state.activePanelId);
    if (reveal?.isOpen()) {
      reveal.close();
    }

    iconRail.setActiveId(undefined);

    setState({
      activePanelId: undefined,
      pinnedPanelId: undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Public panel actions
  // ---------------------------------------------------------------------------

  function openPanel(id: string): void {
    openPanelInternal(id, false);
  }

  function closePanel(): void {
    closePanelInternal();
  }

  function togglePanel(id: string): void {
    if ($state.get().activePanelId === id) {
      closePanelInternal();
    } else {
      openPanelInternal(id, false);
    }
  }

  function pinPanel(id: string): void {
    openPanelInternal(id, true);
  }

  function unpinPanel(): void {
    if (disabled || $state.get().pinnedPanelId === undefined) return;
    setState({ pinnedPanelId: undefined });
  }

  // ---------------------------------------------------------------------------
  // Settings panel actions
  // ---------------------------------------------------------------------------

  function openSettings(): void {
    if (disabled || $state.get().collapsed || !settingsReveal) return;
    settingsReveal.open();
    setState({ settingsOpen: true });
  }

  function closeSettings(): void {
    if (disabled || !settingsReveal) return;
    settingsReveal.close();
    setState({ settingsOpen: false });
  }

  // ---------------------------------------------------------------------------
  // Collapse / Expand
  // ---------------------------------------------------------------------------

  function doCollapse(): void {
    if (disabled) return;

    closePanelInternal();
    settingsReveal?.close();

    iconRail.setDisabled(true);

    setState({
      collapsed: true,
      settingsOpen: false,
    });
  }

  function doExpand(): void {
    if (disabled) return;

    iconRail.setDisabled(false);

    setState({ collapsed: false });
  }

  // ---------------------------------------------------------------------------
  // Keyboard: Cmd/Ctrl+\ for collapse toggle, Escape for close/unpin
  // ---------------------------------------------------------------------------

  function handleGlobalKeyDown(event: KeyboardEvent): void {
    if (disabled) return;

    // Cmd/Ctrl + Backslash -> toggle collapse
    if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      $state.get().collapsed ? doExpand() : doCollapse();
      return;
    }

    // Escape -> close current panel and unpin
    if (event.key === 'Escape') {
      const state = $state.get();
      // Close settings first if open
      if (state.settingsOpen) {
        closeSettings();
        return;
      }
      if (state.activePanelId !== undefined) {
        closePanelInternal();
        return;
      }
    }
  }

  document.addEventListener('keydown', handleGlobalKeyDown);

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  function setDisabled(newDisabled: boolean): void {
    if (newDisabled && !disabled) {
      // Close everything before disabling
      closePanelInternal();
      if (settingsReveal?.isOpen()) {
        settingsReveal.close();
        setState({ settingsOpen: false });
      }
    }

    disabled = newDisabled;
    iconRail.setDisabled(newDisabled);

    for (const reveal of panelReveals.values()) {
      reveal.setDisabled(newDisabled);
    }
    settingsReveal?.setDisabled(newDisabled);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  function destroy(): void {
    document.removeEventListener('keydown', handleGlobalKeyDown);

    iconRail.destroy();

    for (const reveal of panelReveals.values()) {
      reveal.destroy();
    }
    panelReveals.clear();

    settingsReveal?.destroy();
  }

  // ---------------------------------------------------------------------------
  // Return controls
  // ---------------------------------------------------------------------------

  return {
    $state,
    openPanel,
    closePanel,
    togglePanel,
    pinPanel,
    unpinPanel,
    openSettings,
    closeSettings,
    collapse: doCollapse,
    expand: doExpand,
    setDisabled,
    destroy,
  };
}
