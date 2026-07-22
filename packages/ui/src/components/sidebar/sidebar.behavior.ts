import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';

/** The edge the rail is anchored to. Purely positional: it selects the view's
 *  side variant and the collapse/slide direction. It never enters a reducer and
 *  projects no ARIA. Default: left. */
export type SidebarSide = 'left' | 'right';

/** Surface treatment of the desktop rail. Positional decoration only. */
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';

/** How the desktop rail collapses. `offcanvas` slides fully off; `icon` shrinks
 *  to an icon strip; `none` never collapses. It is projected as a data hook the
 *  view keys its collapse rules off, never as ARIA. Default: offcanvas. */
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none';

export interface SidebarConfig {
  /** Controlled desktop expand: shadows the intrinsic `open` axis when present. */
  open?: boolean | undefined;
  /** Uncontrolled seed for the desktop expand axis. Default true -- the oracle's
   *  default (a fresh app opens expanded). */
  defaultOpen?: boolean | undefined;
  /** Positional decoration; never state. Default left. */
  side?: SidebarSide | undefined;
  /** Surface decoration; never state. Default sidebar. */
  variant?: SidebarVariant | undefined;
  /** Collapse mode; projected as `data-collapsible`. Default offcanvas. */
  collapsible?: SidebarCollapsible | undefined;
}

/**
 * Two independent axes in ONE memory cell (Spec 01: reducers are pure over the
 * single cell createBehavior owns). `open` is the persistent desktop
 * expand/collapse rail; `openMobile` is the transient mobile overlay. They never
 * couple in a reducer -- which axis a toggle gesture moves is decided by the
 * browser's viewport signal, resolved OUTSIDE the score by `toggleIntent`
 * (isMobile is a media-query signal, not application state).
 */
export interface SidebarState {
  /** Intrinsic desktop expand -- ignored while a controlled `open` is present. */
  open: boolean;
  /** Mobile overlay visibility. Always intrinsic; the oracle exposed no
   *  controlled mobile prop. */
  openMobile: boolean;
}

export type SidebarActions = {
  /** Expand the desktop rail. */
  open: undefined;
  /** Collapse the desktop rail. */
  close: undefined;
  /** Reveal the mobile overlay. */
  openMobile: undefined;
  /** Dismiss the mobile overlay. */
  closeMobile: undefined;
};

export type SidebarPart = 'root' | 'trigger' | 'rail' | 'panel' | 'overlay';

/** The effective desktop-expand value: a controlled `open` shadows intrinsic. */
export function isOpen(state: SidebarState, config: SidebarConfig): boolean {
  return config.open ?? state.open;
}

/** The effective mobile-overlay value. Always intrinsic (no controlled prop). */
export function isMobileOpen(state: SidebarState): boolean {
  return state.openMobile;
}

export function collapsibleOf(config: SidebarConfig): SidebarCollapsible {
  return config.collapsible ?? 'offcanvas';
}

/**
 * Which action a single toggle gesture (the Trigger, the Rail, or Cmd/Ctrl+B)
 * dispatches, given the viewport. The routing decision lives HERE -- a pure
 * function of the effective state and the browser's `isMobile` signal -- so no
 * decorator holds a branch: each performance only supplies the media-query
 * reading and calls this. On mobile the gesture opens/closes the overlay; on
 * desktop it expands/collapses the rail. Mirrors the oracle's `toggleSidebar`.
 */
export function toggleIntent(
  state: SidebarState,
  config: SidebarConfig,
  isMobile: boolean,
): keyof SidebarActions {
  if (isMobile) return isMobileOpen(state) ? 'closeMobile' : 'openMobile';
  return isOpen(state, config) ? 'close' : 'open';
}

const sidebarSlice: Slice<SidebarConfig, SidebarState, SidebarActions, SidebarPart> = {
  name: 'sidebar',
  parts: {
    root: {},
    trigger: { optional: true },
    rail: { optional: true },
    panel: {},
    overlay: { optional: true },
  },
  initialState: (config) => ({
    // A fresh app opens expanded (oracle default true); a controlled value seeds
    // the first paint without a flash.
    open: config.open ?? config.defaultOpen ?? true,
    openMobile: false,
  }),
  actions: {
    open: (state) => ({ ...state, open: true }),
    close: (state) => ({ ...state, open: false }),
    openMobile: (state) => ({ ...state, openMobile: true }),
    closeMobile: (state) => ({ ...state, openMobile: false }),
  },
  // Idempotence gate per axis: opening the open or closing the closed is
  // rejected, so a controlled consumer's onOpenChange fires once per real
  // desktop transition, and Escape on a desktop (mobile-closed) sidebar is a
  // no-op rather than a spurious closeMobile.
  canDispatch: (state, action, config) => {
    if (action === 'open') return !isOpen(state, config);
    if (action === 'close') return isOpen(state, config);
    if (action === 'openMobile') return !isMobileOpen(state);
    if (action === 'closeMobile') return isMobileOpen(state);
    return true;
  },
  aria: (state, config, ids) => {
    const open = isOpen(state, config);
    const mobileOpen = isMobileOpen(state);
    const mode = collapsibleOf(config);
    const desktopState = open ? 'expanded' : 'collapsed';
    return {
      trigger: {
        // The trigger controls the rail; it carries no aria-expanded because the
        // gesture moves whichever axis the viewport selects, so a single
        // expanded value would misreport on the other viewport (see doc).
        'aria-controls': ids.panel || undefined,
        'data-state': desktopState,
      },
      rail: {
        'aria-label': 'Toggle Sidebar',
        'data-state': desktopState,
      },
      panel: {
        // Desktop expand axis: the view keys width/offcanvas off data-state and
        // the collapse mode.
        'data-state': desktopState,
        // Collapse mode is a hook only while collapsed; `none` never collapses.
        'data-collapsible': open || mode === 'none' ? undefined : mode,
        // Mobile overlay axis, independent of the desktop state above.
        'data-mobile': mobileOpen ? 'open' : 'closed',
      },
      overlay: {
        // A real, labelled scrim button (the oracle's earned dismiss affordance),
        // not an aria-hidden presentation layer.
        'aria-label': 'Close sidebar',
        'data-state': mobileOpen ? 'open' : 'closed',
      },
    };
  },
  // Escape dismisses the MOBILE overlay only, scoped to the panel. On desktop
  // the idempotence gate turns closeMobile into a no-op, so the same key is
  // inert while the rail is merely collapsed -- no mode branch needed.
  keymap: (event, _state, part) =>
    part === 'panel' && event.key === 'Escape' ? 'closeMobile' : null,
};

export const sidebar: BehaviorSpec<SidebarConfig, SidebarState, SidebarActions, SidebarPart> =
  compose('sidebar', sidebarSlice);

/** The keyboard shortcut that toggles the sidebar, matching the oracle. */
const TOGGLE_KEY = 'b';

/**
 * The DOM-native binding of the sidebar score -- the client the Web Component
 * and the Astro <script> both import; only React reads the projections
 * declaratively. Composes the same substrate a decorator would:
 *
 * - `createBehavior` is the model (the one memory cell, the two axes).
 * - `aria-manager` applies the resolved projection.
 * - Presence: the mobile scrim is present-but-hidden, toggled on the openMobile
 *   axis (the panel itself is never hidden -- a collapsed desktop rail stays
 *   visible and navigable; CSS translates the mobile-closed panel off-canvas).
 *
 * Dismissal is DELIBERATELY light (the oracle added no focus-trap, scroll-lock,
 * or outside-click primitive to its mobile panel, and the port issue said add
 * none): a click on the scrim closes, and Escape closes via the score keymap.
 * The Escape part is resolved by CONTAINMENT (`panel.contains(target)`), not
 * `target.closest('[data-part]')` -- the latter misroutes when focus rests on a
 * focusable descendant that carries its own data-part (a menu button), the
 * systemic dialog-family defect tracked in #1921.
 *
 * Cmd/Ctrl+B is an imperative window listener (the shortcut is global, not
 * part-scoped) routed through `toggleIntent`; the desktop `open` axis is
 * persisted write-only to a cookie via `memory.select`, seeded from
 * `defaultOpen` -- the oracle wrote the cookie but never read it back.
 */
export function bindSidebar(root: HTMLElement): () => void {
  const config: SidebarConfig = {
    defaultOpen: root.getAttribute('data-default-open') !== 'false',
    side: (root.getAttribute('data-side') as SidebarSide | null) ?? undefined,
    variant: (root.getAttribute('data-variant') as SidebarVariant | null) ?? undefined,
    collapsible: (root.getAttribute('data-collapsible') as SidebarCollapsible | null) ?? undefined,
  };

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory, dispatch } = createBehavior(sidebar, config);
  const request = (action: keyof SidebarActions): boolean => dispatch(action, config);

  const mql =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 768px)')
      : null;
  const isMobile = (): boolean => mql?.matches ?? false;

  // ids READ from the author/server markup, never generated.
  const ids = {} as PartIds<SidebarPart>;
  for (const part of Object.keys(sidebar.parts) as SidebarPart[])
    ids[part] = getPart(part)?.id ?? '';

  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = sidebar.aria(state, config, ids);
    for (const part of Object.keys(projection) as SidebarPart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
    // Presence: only the scrim hides off the mobile axis; the panel stays put.
    const overlay = getPart('overlay');
    if (overlay) overlay.hidden = !isMobileOpen(state);
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  // Persistence is a reaction to the desktop axis, equality-gated so it writes
  // only on a real change -- never on an unrelated re-render. Write-only: init
  // seeds from defaultOpen, matching the oracle.
  const stopPersist = memory.select(
    (state) => state.open,
    (open) => {
      if (typeof document === 'undefined') return;
      // biome-ignore lint/suspicious/noDocumentCookie: sidebar state persistence across page loads
      document.cookie = `sidebar:state=${open}; path=/; max-age=${60 * 60 * 24 * 7}`;
    },
  );

  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-part="overlay"]')) {
      request('closeMobile');
      return;
    }
    if (target.closest('[data-part="trigger"]') || target.closest('[data-part="rail"]')) {
      request(toggleIntent(memory.get(), config, isMobile()));
    }
  };
  root.addEventListener('click', onClick);

  const onKeydown = (event: KeyboardEvent) => {
    // Containment resolution: the panel is the Escape scope. A focusable
    // descendant with its own data-part must NOT shadow it (the closest()
    // defect), so test containment against the panel directly.
    const panel = getPart('panel');
    if (!panel || !panel.contains(event.target as Node)) return;
    const action = sidebar.keymap(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      },
      memory.get(),
      'panel',
      config,
    );
    if (!action) return;
    if (!request(action)) return;
    event.preventDefault();
    // Escape returns focus to the trigger, mirroring a dismissable layer.
    if (action === 'closeMobile') getPart('trigger')?.focus();
  };
  root.addEventListener('keydown', onKeydown);

  const onShortcut = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === TOGGLE_KEY && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      request(toggleIntent(memory.get(), config, isMobile()));
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('keydown', onShortcut);

  return () => {
    unsubscribe();
    stopPersist();
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onShortcut);
  };
}
