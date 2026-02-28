/**
 * Chrome React component - universal Rafters shell
 *
 * Renders canvas-first chrome with icon rail, hover-reveal panels,
 * settings cog, and full-bleed canvas area.
 *
 * Uses useSyncExternalStore to bridge the chrome-handler's nanostores
 * atom to React. The handler is created in a useEffect (after mount)
 * and state is bridged through a stable atom -- same pattern as Editor.
 *
 * @cognitive-load 5/10 - Single component wraps entire app shell
 * @accessibility ARIA landmarks: toolbar (rail), region (panels), main (canvas)
 *
 * @usage-patterns
 * DO: Use Chrome as the outermost layout shell
 * DO: Provide rail items with unique IDs
 * DO: Pass children as the canvas content
 * NEVER: Nest Chrome inside another Chrome
 * NEVER: Use raw z-index values -- depth tokens handle stacking
 */

import classy from '@rafters/ui/primitives/classy';
import { atom } from 'nanostores';
import * as React from 'react';
import type { ChromeHandlerControls, ChromeHandlerState } from '../primitives/chrome-handler.js';
import { createChromeHandler } from '../primitives/chrome-handler.js';

// =============================================================================
// Types
// =============================================================================

/** A single item in the icon rail */
export interface ChromeRailItem {
  /** Unique identifier */
  id: string;
  /** Icon element to render in the rail */
  icon: React.ReactNode;
  /** Accessible label for the rail button */
  label: string;
  /** Panel content revealed when this item is active */
  panel: React.ReactNode;
  /** Whether this rail item is disabled */
  disabled?: boolean;
}

/** Panel configuration (derived from rail items) */
export interface ChromePanel {
  /** Panel ID (matches rail item ID) */
  id: string;
  /** Panel content */
  content: React.ReactNode;
  /** Accessible label */
  label: string;
}

export interface ChromeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Rail items defining navigation and their associated panels */
  rail: ChromeRailItem[];
  /** Optional settings panel content (renders at bottom of rail) */
  settings?: React.ReactNode;
  /** Start with chrome collapsed */
  defaultCollapsed?: boolean;
  /** Canvas content */
  children: React.ReactNode;
  /** Disable all interactions */
  disabled?: boolean;
  /** Text direction for RTL support */
  dir?: 'ltr' | 'rtl';
}

/** Imperative handle for controlling Chrome from outside */
export interface ChromeControls {
  openPanel: (id: string) => void;
  closePanel: () => void;
  togglePanel: (id: string) => void;
  openSettings: () => void;
  closeSettings: () => void;
  collapse: () => void;
  expand: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const INITIAL_STATE: ChromeHandlerState = {
  mode: 'idle',
  activePanelId: undefined,
  pinnedPanelId: undefined,
  settingsOpen: false,
  collapsed: false,
};

/**
 * Viewport width below which the chrome auto-collapses.
 * Matches the Tailwind md breakpoint (768px) and the design-tokens
 * breakpoint-md token (DEFAULT_BREAKPOINTS.md.minWidth).
 * Panels auto-collapse below this width to preserve canvas space.
 */
const AUTO_COLLAPSE_WIDTH = 768;

// =============================================================================
// Landmark navigation
// =============================================================================

/**
 * Landmark IDs for F6 navigation cycling: rail -> panel -> canvas
 * Only includes landmarks that are currently visible.
 */
<<<<<<< HEAD
export const Chrome = React.forwardRef<ChromeControls, ChromeProps>(function Chrome(
  { children, ...props },
  _ref,
) {
  return <div {...props}>{children}</div>;
});
=======
function getLandmarkElements(root: HTMLElement): HTMLElement[] {
  const landmarks: HTMLElement[] = [];
  const rail = root.querySelector<HTMLElement>('[data-chrome-rail]');
  if (rail) landmarks.push(rail);
  const panel = root.querySelector<HTMLElement>('[data-chrome-panel][data-state="open"]');
  if (panel) landmarks.push(panel);
  const canvas = root.querySelector<HTMLElement>('[data-chrome-canvas]');
  if (canvas) landmarks.push(canvas);
  return landmarks;
}

// =============================================================================
// Settings gear SVG icon (inline, zero-dep)
// =============================================================================

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
      <path d="M13.3 10a1.1 1.1 0 00.2 1.2l.04.04a1.33 1.33 0 11-1.89 1.89l-.04-.04a1.1 1.1 0 00-1.2-.2 1.1 1.1 0 00-.67 1.01v.11a1.33 1.33 0 01-2.67 0v-.06A1.1 1.1 0 006 12.87a1.1 1.1 0 00-1.2.2l-.04.04a1.33 1.33 0 11-1.89-1.89l.04-.04a1.1 1.1 0 00.2-1.2 1.1 1.1 0 00-1.01-.67h-.11a1.33 1.33 0 010-2.67H2.06A1.1 1.1 0 003.13 6a1.1 1.1 0 00-.2-1.2l-.04-.04a1.33 1.33 0 111.89-1.89l.04.04a1.1 1.1 0 001.2.2h.05a1.1 1.1 0 00.67-1.01v-.11a1.33 1.33 0 012.67 0v.06a1.1 1.1 0 00.67 1.01 1.1 1.1 0 001.2-.2l.04-.04a1.33 1.33 0 111.89 1.89l-.04.04a1.1 1.1 0 00-.2 1.2v.05a1.1 1.1 0 001.01.67h.11a1.33 1.33 0 010 2.67h-.06a1.1 1.1 0 00-1.01.67z" />
    </svg>
  );
}

// =============================================================================
// Chrome component
// =============================================================================

export const Chrome = React.forwardRef<ChromeControls, ChromeProps>(
  (
    {
      children,
      rail,
      settings,
      defaultCollapsed = false,
      disabled = false,
      dir,
      className,
      ...props
    },
    ref,
  ) => {
    // -----------------------------------------------------------------------
    // Refs for DOM elements needed by the chrome-handler primitive
    // -----------------------------------------------------------------------
    const rootRef = React.useRef<HTMLDivElement>(null);
    const railRef = React.useRef<HTMLDivElement>(null);
    const settingsTriggerRef = React.useRef<HTMLButtonElement>(null);
    const settingsPanelRef = React.useRef<HTMLElement>(null);
    const handlerRef = React.useRef<ChromeHandlerControls | null>(null);

    // Refs for trigger/panel element pairs -- keyed by rail item ID.
    // We store these in a ref-stable Map and populate them via callback refs.
    const triggerRefsMap = React.useRef(new Map<string, HTMLButtonElement>());
    const panelRefsMap = React.useRef(new Map<string, HTMLElement>());

    // -----------------------------------------------------------------------
    // Bridge handler state to React via useSyncExternalStore
    // -----------------------------------------------------------------------
    const $stateRef = React.useRef(
      atom<ChromeHandlerState>({
        ...INITIAL_STATE,
        collapsed: defaultCollapsed,
      }),
    );

    const chromeState = React.useSyncExternalStore(
      (cb) => $stateRef.current.subscribe(cb),
      () => $stateRef.current.get(),
      () => ({ ...INITIAL_STATE, collapsed: defaultCollapsed }),
    );

    // -----------------------------------------------------------------------
    // Stable ref for rail items to avoid stale closures in effect
    // -----------------------------------------------------------------------
    const railRef_ = React.useRef(rail);
    railRef_.current = rail;

    // Stable boolean for settings presence -- avoids ReactNode reference
    // identity in the useEffect dependency array (inline JSX creates a new
    // reference every render, causing full handler teardown/recreation).
    const hasSettings = settings != null;
    const settingsRef = React.useRef(settings);
    settingsRef.current = settings;

    // -----------------------------------------------------------------------
    // Handler lifecycle (DOM side effects)
    // -----------------------------------------------------------------------
    const railItemIds = rail.map((item) => item.id).join(',');
    const railDisabledStates = rail.map((item) => item.disabled ?? false).join(',');

    // biome-ignore lint/correctness/useExhaustiveDependencies: railItemIds and railDisabledStates encode all rail changes; disabled triggers re-creation
    React.useEffect(() => {
      const railEl = railRef.current;
      if (!railEl) return;

      // Build panels map from collected refs
      const panels = new Map<string, { trigger: HTMLElement; panel: HTMLElement }>();
      for (const item of railRef_.current) {
        const trigger = triggerRefsMap.current.get(item.id);
        const panel = panelRefsMap.current.get(item.id);
        if (trigger && panel) {
          panels.set(item.id, { trigger, panel });
        }
      }

      const railItems = railRef_.current.map(({ id, label, disabled: d }) =>
        d !== undefined ? { id, label, disabled: d } : { id, label },
      );

      // Build handler options, only adding optional settings refs when present
      const handlerOptions: Parameters<typeof createChromeHandler>[0] = {
        railContainer: railEl,
        panels,
        railItems,
        disabled,
      };
      if (settingsTriggerRef.current) {
        handlerOptions.settingsTrigger = settingsTriggerRef.current;
      }
      if (settingsPanelRef.current) {
        handlerOptions.settingsPanel = settingsPanelRef.current;
      }

      const handler = createChromeHandler(handlerOptions);

      handlerRef.current = handler;

      // Apply defaultCollapsed
      if (defaultCollapsed) {
        handler.collapse();
      }

      // Bridge state from handler atom into our stable atom
      const unsubscribe = handler.$state.subscribe((s) => {
        $stateRef.current.set(s);
      });

      return () => {
        unsubscribe();
        handler.destroy();
        handlerRef.current = null;
        $stateRef.current.set({ ...INITIAL_STATE });
      };
    }, [railItemIds, railDisabledStates, disabled, defaultCollapsed, hasSettings]);

    // -----------------------------------------------------------------------
    // F6 landmark navigation
    // -----------------------------------------------------------------------
    React.useEffect(() => {
      const rootEl = rootRef.current;
      if (!rootEl) return;

      function handleF6(event: KeyboardEvent) {
        if (event.key !== 'F6') return;
        const root = rootRef.current;
        if (!root) return;

        event.preventDefault();
        const landmarks = getLandmarkElements(root);
        if (landmarks.length === 0) return;

        const active = document.activeElement as HTMLElement | null;
        const currentIdx = active
          ? landmarks.findIndex((lm) => lm.contains(active))
          : -1;

        const direction = event.shiftKey ? -1 : 1;
        const nextIdx = (currentIdx + direction + landmarks.length) % landmarks.length;

        const target = landmarks[nextIdx];
        if (target) {
          const focusable = target.querySelector<HTMLElement>(
            'button:not([disabled]), [tabindex="0"], a[href], input:not([disabled])',
          );
          (focusable ?? target).focus();
        }
      }

      document.addEventListener('keydown', handleF6);
      return () => document.removeEventListener('keydown', handleF6);
    }, []);

    // -----------------------------------------------------------------------
    // Auto-collapse on narrow viewport via ResizeObserver
    // -----------------------------------------------------------------------
    React.useEffect(() => {
      const rootEl = rootRef.current;
      if (!rootEl || typeof ResizeObserver === 'undefined') return;

      let wasAutoCollapsed = false;

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const width = entry.contentRect.width;
        const handler = handlerRef.current;
        if (!handler) return;

        if (width < AUTO_COLLAPSE_WIDTH && !handler.$state.get().collapsed) {
          handler.collapse();
          wasAutoCollapsed = true;
        } else if (
          width >= AUTO_COLLAPSE_WIDTH &&
          wasAutoCollapsed &&
          handler.$state.get().collapsed
        ) {
          handler.expand();
          wasAutoCollapsed = false;
        }
      });

      observer.observe(rootEl);
      return () => observer.disconnect();
    }, []);

    // -----------------------------------------------------------------------
    // Imperative handle
    // -----------------------------------------------------------------------
    React.useImperativeHandle(
      ref,
      () => ({
        openPanel: (id: string) => handlerRef.current?.openPanel(id),
        closePanel: () => handlerRef.current?.closePanel(),
        togglePanel: (id: string) => handlerRef.current?.togglePanel(id),
        openSettings: () => handlerRef.current?.openSettings(),
        closeSettings: () => handlerRef.current?.closeSettings(),
        collapse: () => handlerRef.current?.collapse(),
        expand: () => handlerRef.current?.expand(),
      }),
      [],
    );

    const isRtl = dir === 'rtl';

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div
        ref={rootRef}
        {...props}
        data-chrome=""
        data-collapsed={chromeState.collapsed || undefined}
        dir={dir}
        className={classy('flex h-full w-full', { 'flex-row-reverse': isRtl }, className)}
      >
        {/* Rail */}
        <div
          ref={railRef}
          data-chrome-rail=""
          className={classy(
            'z-depth-base flex shrink-0 flex-col items-center gap-1 border-border bg-muted p-1',
            {
              'border-r': !isRtl,
              'border-l': isRtl,
              'w-0 overflow-hidden p-0 border-0': chromeState.collapsed,
            },
          )}
        >
          {/* Rail items */}
          <div className={classy('flex flex-1 flex-col items-center gap-1')}>
            {rail.map((item) => (
              <button
                key={item.id}
                ref={(el) => {
                  if (el) {
                    triggerRefsMap.current.set(item.id, el);
                  } else {
                    triggerRefsMap.current.delete(item.id);
                  }
                }}
                type="button"
                data-rail-item=""
                data-rail-id={item.id}
                disabled={disabled || item.disabled}
                aria-label={item.label}
                className={classy(
                  'flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                  {
                    'bg-accent text-accent-foreground': chromeState.activePanelId === item.id,
                    'opacity-50 cursor-not-allowed': disabled || item.disabled,
                  },
                )}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Settings cog at bottom */}
          {settings && (
            <button
              ref={settingsTriggerRef}
              type="button"
              data-chrome-settings-trigger=""
              disabled={disabled}
              aria-label="Settings"
              className={classy(
                'mt-auto flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                {
                  'bg-accent text-accent-foreground': chromeState.settingsOpen,
                  'opacity-50 cursor-not-allowed': disabled,
                },
              )}
            >
              <SettingsIcon />
            </button>
          )}
        </div>

        {/* Panel area */}
        {rail.map((item) => {
          const isActive = chromeState.activePanelId === item.id;
          return (
            <section
              key={item.id}
              ref={(el) => {
                if (el) {
                  panelRefsMap.current.set(item.id, el);
                } else {
                  panelRefsMap.current.delete(item.id);
                }
              }}
              data-chrome-panel=""
              data-panel-id={item.id}
              data-state={isActive ? 'open' : 'closed'}
              aria-label={`${item.label} panel`}
              className={classy('z-depth-base shrink-0 overflow-y-auto border-border bg-background', {
                'w-64': isActive,
                hidden: !isActive,
                'border-r': isActive && !isRtl,
                'border-l': isActive && isRtl,
              })}
            >
              {item.panel}
            </section>
          );
        })}

        {/* Settings panel */}
        {settings && (
          <section
            ref={settingsPanelRef}
            data-chrome-panel=""
            data-panel-id="settings"
            data-state={chromeState.settingsOpen ? 'open' : 'closed'}
            aria-label="Settings panel"
            className={classy('z-depth-base shrink-0 overflow-y-auto border-border bg-background', {
              'w-64': chromeState.settingsOpen,
              hidden: !chromeState.settingsOpen,
              'border-r': chromeState.settingsOpen && !isRtl,
              'border-l': chromeState.settingsOpen && isRtl,
            })}
          >
            {settings}
          </section>
        )}

        {/* Canvas (main content) */}
        <main
          data-chrome-canvas=""
          tabIndex={-1}
          className={classy('z-depth-dropdown flex-1 overflow-auto outline-none')}
        >
          {children}
        </main>
      </div>
    );
  },
);

Chrome.displayName = 'Chrome';
>>>>>>> b69e2d1 (feat(chrome): implement Chrome component with full test suite)
