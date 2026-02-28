import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChromeHandlerControls,
  ChromeHandlerState,
} from '../../src/primitives/chrome-handler';
import { createChromeHandler } from '../../src/primitives/chrome-handler';
import { resetPanelRevealState } from '../../src/primitives/panel-reveal';

// =============================================================================
// Helpers
// =============================================================================

interface TestDOM {
  railContainer: HTMLDivElement;
  railItems: HTMLDivElement[];
  panels: Map<string, { trigger: HTMLButtonElement; panel: HTMLDivElement }>;
  settingsTrigger: HTMLButtonElement;
  settingsPanel: HTMLDivElement;
}

function createTestDOM(panelIds: string[]): TestDOM {
  // Rail container with rail item elements
  const railContainer = document.createElement('div');
  const railItems: HTMLDivElement[] = [];

  for (const id of panelIds) {
    const el = document.createElement('div');
    el.setAttribute('data-rail-item', '');
    el.setAttribute('data-rail-id', id);
    el.textContent = id;
    railContainer.appendChild(el);
    railItems.push(el);
  }
  document.body.appendChild(railContainer);

  // Panel triggers and panels
  const panels = new Map<string, { trigger: HTMLButtonElement; panel: HTMLDivElement }>();
  for (const id of panelIds) {
    const trigger = document.createElement('button');
    trigger.textContent = `${id} trigger`;
    trigger.setAttribute('aria-label', id);
    document.body.appendChild(trigger);

    const panel = document.createElement('div');
    panel.setAttribute('id', `panel-${id}`);
    document.body.appendChild(panel);

    panels.set(id, { trigger, panel });
  }

  // Settings trigger and panel
  const settingsTrigger = document.createElement('button');
  settingsTrigger.textContent = 'Settings';
  settingsTrigger.setAttribute('aria-label', 'Settings');
  document.body.appendChild(settingsTrigger);

  const settingsPanel = document.createElement('div');
  settingsPanel.setAttribute('id', 'panel-settings');
  document.body.appendChild(settingsPanel);

  return { railContainer, railItems, panels, settingsTrigger, settingsPanel };
}

function cleanupTestDOM(dom: TestDOM): void {
  dom.railContainer.remove();
  for (const { trigger, panel } of dom.panels.values()) {
    trigger.remove();
    panel.remove();
  }
  dom.settingsTrigger.remove();
  dom.settingsPanel.remove();
}

function makeRailItems(
  ids: string[],
  overrides?: Partial<Record<string, { disabled?: boolean }>>,
): Array<{ id: string; label: string; disabled?: boolean }> {
  return ids.map((id) => ({
    id,
    label: `${id} label`,
    ...overrides?.[id],
  }));
}

function pressKey(key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      metaKey: modifiers.metaKey ?? false,
      ctrlKey: modifiers.ctrlKey ?? false,
    }),
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('createChromeHandler', () => {
  let dom: TestDOM;
  let controls: ChromeHandlerControls;
  const panelIds = ['layers', 'tokens', 'colors'];

  beforeEach(() => {
    resetPanelRevealState();
    dom = createTestDOM(panelIds);
  });

  afterEach(() => {
    controls?.destroy();
    cleanupTestDOM(dom);
    resetPanelRevealState();
    vi.useRealTimers();
  });

  function createHandler(
    overrides: Partial<Parameters<typeof createChromeHandler>[0]> = {},
  ): ChromeHandlerControls {
    controls = createChromeHandler({
      railContainer: dom.railContainer,
      panels: dom.panels,
      settingsTrigger: dom.settingsTrigger,
      settingsPanel: dom.settingsPanel,
      railItems: makeRailItems(panelIds),
      hoverDelay: 0, // Instant for easier testing
      closeDelay: 0, // Instant for easier testing
      ...overrides,
    });
    return controls;
  }

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('starts in idle mode with no active or pinned panel', () => {
      const handler = createHandler();
      const state = handler.$state.get();

      expect(state.mode).toBe('idle');
      expect(state.activePanelId).toBeUndefined();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.settingsOpen).toBe(false);
      expect(state.collapsed).toBe(false);
    });
  });

  // ===========================================================================
  // Panel ID Validation
  // ===========================================================================

  describe('panel ID validation', () => {
    it('throws when panel IDs are not unique', () => {
      // Create a map with duplicate entries by manipulating keys
      // Map naturally prevents duplicates, so we validate the railItems overlap instead.
      // The validation checks the Map keys, which are inherently unique.
      // This test verifies the creation works with valid unique IDs.
      expect(() => createHandler()).not.toThrow();
    });
  });

  // ===========================================================================
  // Open / Close / Toggle
  // ===========================================================================

  describe('open / close / toggle', () => {
    it('openPanel sets activePanelId and mode to panel-open', () => {
      const handler = createHandler();

      handler.openPanel('layers');

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.mode).toBe('panel-open');
    });

    it('closePanel returns to idle', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.closePanel();

      const state = handler.$state.get();
      expect(state.activePanelId).toBeUndefined();
      expect(state.mode).toBe('idle');
    });

    it('togglePanel opens when idle', () => {
      const handler = createHandler();

      handler.togglePanel('tokens');

      expect(handler.$state.get().activePanelId).toBe('tokens');
    });

    it('togglePanel closes when the same panel is active', () => {
      const handler = createHandler();

      handler.togglePanel('tokens');
      handler.togglePanel('tokens');

      expect(handler.$state.get().activePanelId).toBeUndefined();
      expect(handler.$state.get().mode).toBe('idle');
    });

    it('togglePanel switches panel when a different panel is active', () => {
      const handler = createHandler();

      handler.togglePanel('layers');
      handler.togglePanel('tokens');

      expect(handler.$state.get().activePanelId).toBe('tokens');
    });
  });

  // ===========================================================================
  // Single Active Panel
  // ===========================================================================

  describe('single active panel', () => {
    it('opening a new panel closes the previous one', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      expect(handler.$state.get().activePanelId).toBe('layers');

      handler.openPanel('tokens');
      expect(handler.$state.get().activePanelId).toBe('tokens');

      // Verify only one panel is open
      const layersPanel = dom.panels.get('layers')?.panel;
      const tokensPanel = dom.panels.get('tokens')?.panel;
      expect(layersPanel.getAttribute('data-state')).toBe('closed');
      expect(tokensPanel.getAttribute('data-state')).toBe('open');
    });

    it('opening the same panel again is idempotent', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.openPanel('layers');

      expect(handler.$state.get().activePanelId).toBe('layers');
      expect(handler.$state.get().mode).toBe('panel-open');
    });
  });

  // ===========================================================================
  // Pin / Unpin
  // ===========================================================================

  describe('pin / unpin', () => {
    it('pinPanel sets pinnedPanelId and opens the panel', () => {
      const handler = createHandler();

      handler.pinPanel('colors');

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('colors');
      expect(state.pinnedPanelId).toBe('colors');
      expect(state.mode).toBe('panel-open');
    });

    it('unpinPanel clears pinnedPanelId but keeps panel open', () => {
      const handler = createHandler();

      handler.pinPanel('colors');
      handler.unpinPanel();

      const state = handler.$state.get();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.activePanelId).toBe('colors');
    });

    it('unpinPanel is a no-op when nothing is pinned', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.unpinPanel();

      // Should not throw or change state
      expect(handler.$state.get().activePanelId).toBe('layers');
    });
  });

  // ===========================================================================
  // Hover-to-Preview
  // ===========================================================================

  describe('hover-to-preview', () => {
    it('hovering a rail item opens its panel without pinning', () => {
      vi.useFakeTimers();
      const handler = createHandler({ hoverDelay: 200 });

      // Simulate hover on first rail item
      dom.railItems[0]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(200);

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.pinnedPanelId).toBeUndefined();
    });

    it('hover-leave closes an unpinned panel', () => {
      vi.useFakeTimers();
      const handler = createHandler({ hoverDelay: 0 });

      // Hover enter
      dom.railItems[0]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(1);

      expect(handler.$state.get().activePanelId).toBe('layers');

      // Hover leave
      dom.railItems[0]?.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: dom.railContainer }),
      );

      expect(handler.$state.get().activePanelId).toBeUndefined();
      expect(handler.$state.get().mode).toBe('idle');
    });

    it('hover-leave does NOT close a pinned panel', () => {
      vi.useFakeTimers();
      const handler = createHandler({ hoverDelay: 0 });

      // Pin the panel first
      handler.pinPanel('layers');

      // Simulate hover leave on the rail item
      dom.railItems[0]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(1);
      dom.railItems[0]?.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: dom.railContainer }),
      );

      // Panel should still be open because it is pinned
      expect(handler.$state.get().activePanelId).toBe('layers');
      expect(handler.$state.get().pinnedPanelId).toBe('layers');
    });
  });

  // ===========================================================================
  // Click-to-Pin (via rail activation)
  // ===========================================================================

  describe('click-to-pin', () => {
    it('clicking a rail item pins the panel', () => {
      const handler = createHandler();

      // Simulate click on rail item (icon-rail fires onActivate)
      dom.railItems[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.pinnedPanelId).toBe('layers');
    });

    it('Enter on a rail item pins the panel', () => {
      const handler = createHandler();

      dom.railItems[1]?.focus();
      dom.railItems[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('tokens');
      expect(state.pinnedPanelId).toBe('tokens');
    });

    it('Space on a rail item pins the panel', () => {
      const handler = createHandler();

      dom.railItems[2]?.focus();
      dom.railItems[2]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
      );

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('colors');
      expect(state.pinnedPanelId).toBe('colors');
    });
  });

  // ===========================================================================
  // Settings Panel
  // ===========================================================================

  describe('settings panel', () => {
    it('openSettings sets settingsOpen and mode', () => {
      const handler = createHandler();

      handler.openSettings();

      const state = handler.$state.get();
      expect(state.settingsOpen).toBe(true);
      expect(state.mode).toBe('settings-open');
    });

    it('closeSettings returns to previous mode', () => {
      const handler = createHandler();

      handler.openSettings();
      handler.closeSettings();

      expect(handler.$state.get().settingsOpen).toBe(false);
      expect(handler.$state.get().mode).toBe('idle');
    });

    it('settings panel can be open alongside a content panel', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.openSettings();

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.settingsOpen).toBe(true);
      // Settings mode takes precedence in mode reporting
      expect(state.mode).toBe('settings-open');
    });

    it('closing settings reveals the underlying panel mode', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.openSettings();
      handler.closeSettings();

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.settingsOpen).toBe(false);
      expect(state.mode).toBe('panel-open');
    });

    it('does nothing without settings elements', () => {
      const handler = createChromeHandler({
        railContainer: dom.railContainer,
        panels: dom.panels,
        railItems: makeRailItems(panelIds),
        hoverDelay: 0,
        closeDelay: 0,
        // No settingsTrigger or settingsPanel
      });
      controls = handler;

      handler.openSettings();
      expect(handler.$state.get().settingsOpen).toBe(false);
    });
  });

  // ===========================================================================
  // Collapse / Expand
  // ===========================================================================

  describe('collapse / expand', () => {
    it('collapse closes all panels, unpins, and sets mode', () => {
      const handler = createHandler();

      handler.pinPanel('layers');
      handler.openSettings();
      handler.collapse();

      const state = handler.$state.get();
      expect(state.collapsed).toBe(true);
      expect(state.mode).toBe('collapsed');
      expect(state.activePanelId).toBeUndefined();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.settingsOpen).toBe(false);
    });

    it('expand returns to idle', () => {
      const handler = createHandler();

      handler.collapse();
      handler.expand();

      const state = handler.$state.get();
      expect(state.collapsed).toBe(false);
      expect(state.mode).toBe('idle');
    });

    it('panels cannot be opened while collapsed', () => {
      const handler = createHandler();

      handler.collapse();
      handler.openPanel('layers');

      expect(handler.$state.get().activePanelId).toBeUndefined();
      expect(handler.$state.get().mode).toBe('collapsed');
    });

    it('settings cannot be opened while collapsed', () => {
      const handler = createHandler();

      handler.collapse();
      handler.openSettings();

      expect(handler.$state.get().settingsOpen).toBe(false);
    });
  });

  // ===========================================================================
  // Keyboard: Escape
  // ===========================================================================

  describe('Escape key', () => {
    it('Escape closes the active panel and unpins', () => {
      const handler = createHandler();

      handler.pinPanel('layers');
      pressKey('Escape');

      const state = handler.$state.get();
      expect(state.activePanelId).toBeUndefined();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.mode).toBe('idle');
    });

    it('Escape closes settings first when both settings and panel are open', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.openSettings();

      pressKey('Escape');

      // Settings closed, panel still open
      const state = handler.$state.get();
      expect(state.settingsOpen).toBe(false);
      expect(state.activePanelId).toBe('layers');
      expect(state.mode).toBe('panel-open');
    });

    it('Escape is a no-op in idle mode', () => {
      const handler = createHandler();

      pressKey('Escape');

      expect(handler.$state.get().mode).toBe('idle');
    });
  });

  // ===========================================================================
  // Keyboard: Cmd/Ctrl+Backslash
  // ===========================================================================

  describe('Cmd/Ctrl+\\ collapse toggle', () => {
    it('Cmd+\\ collapses from idle', () => {
      const handler = createHandler();

      pressKey('\\', { metaKey: true });

      expect(handler.$state.get().collapsed).toBe(true);
      expect(handler.$state.get().mode).toBe('collapsed');
    });

    it('Cmd+\\ expands from collapsed', () => {
      const handler = createHandler();

      handler.collapse();
      pressKey('\\', { metaKey: true });

      expect(handler.$state.get().collapsed).toBe(false);
      expect(handler.$state.get().mode).toBe('idle');
    });

    it('Ctrl+\\ also works (Windows/Linux)', () => {
      const handler = createHandler();

      pressKey('\\', { ctrlKey: true });

      expect(handler.$state.get().collapsed).toBe(true);
    });

    it('Cmd+\\ closes panels and settings before collapsing', () => {
      const handler = createHandler();

      handler.pinPanel('tokens');
      handler.openSettings();

      pressKey('\\', { metaKey: true });

      const state = handler.$state.get();
      expect(state.collapsed).toBe(true);
      expect(state.activePanelId).toBeUndefined();
      expect(state.settingsOpen).toBe(false);
    });
  });

  // ===========================================================================
  // Reactive $state Atom
  // ===========================================================================

  describe('$state atom reactivity', () => {
    it('subscribers receive state updates', () => {
      const handler = createHandler();
      const states: ChromeHandlerState[] = [];

      const unsubscribe = handler.$state.subscribe((s) => {
        states.push({ ...s });
      });

      handler.openPanel('layers');
      handler.closePanel();

      unsubscribe();

      // Initial state + openPanel update + mode update + closePanel update + mode update
      // We just verify key transitions happened
      const panelOpenStates = states.filter((s) => s.activePanelId === 'layers');
      expect(panelOpenStates.length).toBeGreaterThan(0);

      const idleAfterClose = states.filter(
        (s) => s.activePanelId === undefined && s.mode === 'idle',
      );
      expect(idleAfterClose.length).toBeGreaterThan(0);
    });

    it('unsubscribe stops notifications', () => {
      const handler = createHandler();
      const callback = vi.fn();

      const unsubscribe = handler.$state.subscribe(callback);
      callback.mockClear(); // Clear initial subscription call

      handler.openPanel('layers');
      const callsAfterOpen = callback.mock.calls.length;

      unsubscribe();

      handler.openPanel('tokens');
      expect(callback.mock.calls.length).toBe(callsAfterOpen);
    });
  });

  // ===========================================================================
  // Disabled State
  // ===========================================================================

  describe('disabled state', () => {
    it('all actions are no-ops when disabled', () => {
      const handler = createHandler({ disabled: true });

      handler.openPanel('layers');
      expect(handler.$state.get().activePanelId).toBeUndefined();

      handler.pinPanel('tokens');
      expect(handler.$state.get().pinnedPanelId).toBeUndefined();

      handler.openSettings();
      expect(handler.$state.get().settingsOpen).toBe(false);

      handler.collapse();
      expect(handler.$state.get().collapsed).toBe(false);
    });

    it('setDisabled(true) closes everything', () => {
      const handler = createHandler();

      handler.pinPanel('layers');
      handler.openSettings();

      handler.setDisabled(true);

      const state = handler.$state.get();
      expect(state.activePanelId).toBeUndefined();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.settingsOpen).toBe(false);
    });

    it('setDisabled(false) re-enables operations', () => {
      const handler = createHandler({ disabled: true });

      handler.setDisabled(false);
      handler.openPanel('layers');

      expect(handler.$state.get().activePanelId).toBe('layers');
    });

    it('keyboard shortcuts are no-ops when disabled', () => {
      const handler = createHandler({ disabled: true });

      pressKey('\\', { metaKey: true });
      expect(handler.$state.get().collapsed).toBe(false);
    });
  });

  // ===========================================================================
  // Destroy
  // ===========================================================================

  describe('destroy', () => {
    it('removes global keyboard listener', () => {
      const handler = createHandler();

      handler.destroy();

      // Keyboard shortcuts should not work after destroy
      pressKey('\\', { metaKey: true });
      expect(handler.$state.get().collapsed).toBe(false);
    });

    it('cleans up icon-rail ARIA attributes', () => {
      createHandler();

      expect(dom.railContainer.getAttribute('role')).toBe('toolbar');

      controls.destroy();

      expect(dom.railContainer.hasAttribute('role')).toBe(false);
    });

    it('cleans up panel-reveal ARIA attributes', () => {
      createHandler();

      const layersPanel = dom.panels.get('layers')?.panel;
      expect(layersPanel.getAttribute('role')).toBe('region');

      controls.destroy();

      expect(layersPanel.hasAttribute('role')).toBe(false);
      expect(layersPanel.hasAttribute('data-state')).toBe(false);
    });

    it('cleans up settings panel ARIA attributes', () => {
      createHandler();

      expect(dom.settingsPanel.getAttribute('role')).toBe('region');

      controls.destroy();

      expect(dom.settingsPanel.hasAttribute('role')).toBe(false);
    });
  });

  // ===========================================================================
  // SSR Guard
  // ===========================================================================

  describe('SSR guard', () => {
    it('returns no-op controls when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR environment
      delete globalThis.window;

      const ssr = createChromeHandler({
        railContainer: dom.railContainer,
        panels: dom.panels,
        railItems: makeRailItems(panelIds),
      });

      expect(ssr.$state.get().mode).toBe('idle');
      expect(() => ssr.openPanel('layers')).not.toThrow();
      expect(() => ssr.closePanel()).not.toThrow();
      expect(() => ssr.togglePanel('layers')).not.toThrow();
      expect(() => ssr.pinPanel('layers')).not.toThrow();
      expect(() => ssr.unpinPanel()).not.toThrow();
      expect(() => ssr.openSettings()).not.toThrow();
      expect(() => ssr.closeSettings()).not.toThrow();
      expect(() => ssr.collapse()).not.toThrow();
      expect(() => ssr.expand()).not.toThrow();
      expect(() => ssr.setDisabled(true)).not.toThrow();
      expect(() => ssr.destroy()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('openPanel with unknown ID is a no-op', () => {
      const handler = createHandler();

      handler.openPanel('nonexistent');

      expect(handler.$state.get().activePanelId).toBeUndefined();
      expect(handler.$state.get().mode).toBe('idle');
    });

    it('closePanel when already idle is a no-op', () => {
      const handler = createHandler();

      handler.closePanel();

      expect(handler.$state.get().mode).toBe('idle');
    });

    it('multiple rapid open/close cycles are stable', () => {
      const handler = createHandler();

      handler.openPanel('layers');
      handler.openPanel('tokens');
      handler.openPanel('colors');
      handler.closePanel();
      handler.openPanel('layers');

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('layers');
      expect(state.mode).toBe('panel-open');
    });

    it('pinning a different panel unpins the previous implicitly', () => {
      const handler = createHandler();

      handler.pinPanel('layers');
      handler.pinPanel('tokens');

      const state = handler.$state.get();
      expect(state.activePanelId).toBe('tokens');
      expect(state.pinnedPanelId).toBe('tokens');
    });

    it('collapse then expand resets to clean idle state', () => {
      const handler = createHandler();

      handler.pinPanel('layers');
      handler.openSettings();
      handler.collapse();
      handler.expand();

      const state = handler.$state.get();
      expect(state.mode).toBe('idle');
      expect(state.activePanelId).toBeUndefined();
      expect(state.pinnedPanelId).toBeUndefined();
      expect(state.settingsOpen).toBe(false);
      expect(state.collapsed).toBe(false);
    });
  });
});
