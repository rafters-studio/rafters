import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  collapsibleOf,
  isMobileOpen,
  isOpen,
  sidebar,
  toggleIntent,
  type SidebarConfig,
  type SidebarPart,
  type SidebarState,
} from '../../../src/components/sidebar/sidebar.behavior';

const ids: PartIds<SidebarPart> = {
  root: 'r',
  trigger: 't',
  rail: 'rl',
  panel: 'p',
};

function ariaAt(config: SidebarConfig, state: SidebarState = sidebar.initialState(config)) {
  return sidebar.aria(state, config, ids);
}

describe('sidebar parts', () => {
  it('declares the full behavior surface', () => {
    expect(Object.keys(sidebar.parts).sort()).toEqual(['panel', 'rail', 'root', 'trigger']);
    // The panel is the only always-present interactive part besides root; the
    // rest are optional. There is no scrim part: the mobile overlay is the merged
    // Sheet (React) or the bind-enhanced modal panel (WC/Astro).
    expect(sidebar.parts.panel.optional).toBeUndefined();
    expect(sidebar.parts.trigger.optional).toBe(true);
    expect(sidebar.parts.rail.optional).toBe(true);
  });
});

describe('sidebar state: two independent axes', () => {
  it('seeds desktop open from defaultOpen, defaulting to expanded', () => {
    expect(sidebar.initialState({}).open).toBe(true);
    expect(sidebar.initialState({ defaultOpen: false }).open).toBe(false);
    expect(sidebar.initialState({}).openMobile).toBe(false);
  });

  it('a controlled open shadows the intrinsic desktop axis; mobile is always intrinsic', () => {
    expect(isOpen({ open: false, openMobile: false }, { open: true })).toBe(true);
    expect(isOpen({ open: true, openMobile: false }, { open: false })).toBe(false);
    expect(isOpen({ open: true, openMobile: false }, {})).toBe(true);
    expect(isMobileOpen({ open: true, openMobile: true })).toBe(true);
    expect(isMobileOpen({ open: true, openMobile: false })).toBe(false);
  });

  it('collapsibleOf defaults to offcanvas', () => {
    expect(collapsibleOf({})).toBe('offcanvas');
    expect(collapsibleOf({ collapsible: 'icon' })).toBe('icon');
  });
});

describe('sidebar toggleIntent (viewport routing lives in the score)', () => {
  const expanded: SidebarState = { open: true, openMobile: false };
  const collapsed: SidebarState = { open: false, openMobile: false };
  const mobileShown: SidebarState = { open: true, openMobile: true };

  it('desktop: toggles the expand axis on the effective value', () => {
    expect(toggleIntent(expanded, {}, false)).toBe('close');
    expect(toggleIntent(collapsed, {}, false)).toBe('open');
    // Controlled value drives the intent, not intrinsic state.
    expect(toggleIntent(collapsed, { open: true }, false)).toBe('close');
  });

  it('mobile: toggles the overlay axis, never the desktop one', () => {
    expect(toggleIntent(expanded, {}, true)).toBe('openMobile');
    expect(toggleIntent(mobileShown, {}, true)).toBe('closeMobile');
  });
});

describe('sidebar canDispatch (per-axis idempotence gate)', () => {
  const expanded: SidebarState = { open: true, openMobile: false };
  const collapsed: SidebarState = { open: false, openMobile: false };
  const mobileShown: SidebarState = { open: true, openMobile: true };

  it('desktop open only when collapsed, close only when expanded', () => {
    expect(sidebar.canDispatch(collapsed, 'open', {})).toBe(true);
    expect(sidebar.canDispatch(collapsed, 'close', {})).toBe(false);
    expect(sidebar.canDispatch(expanded, 'open', {})).toBe(false);
    expect(sidebar.canDispatch(expanded, 'close', {})).toBe(true);
  });

  it('mobile openMobile only when hidden, closeMobile only when shown', () => {
    expect(sidebar.canDispatch(collapsed, 'openMobile', {})).toBe(true);
    expect(sidebar.canDispatch(collapsed, 'closeMobile', {})).toBe(false);
    expect(sidebar.canDispatch(mobileShown, 'openMobile', {})).toBe(false);
    expect(sidebar.canDispatch(mobileShown, 'closeMobile', {})).toBe(true);
  });

  it('gates desktop on the CONTROLLED value when present', () => {
    const drifted: SidebarState = { open: false, openMobile: false };
    expect(sidebar.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(sidebar.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('sidebar actions move the two axes through dispatch', () => {
  it('desktop open/close', () => {
    const { memory, dispatch } = createBehavior(sidebar, { defaultOpen: false });
    expect(dispatch('open', {})).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(dispatch('open', {})).toBe(false);
    expect(dispatch('close', {})).toBe(true);
    expect(memory.get().open).toBe(false);
  });

  it('mobile openMobile/closeMobile, independent of the desktop axis', () => {
    const { memory, dispatch } = createBehavior(sidebar, {});
    expect(memory.get().open).toBe(true);
    expect(dispatch('openMobile', {})).toBe(true);
    expect(memory.get().openMobile).toBe(true);
    // The desktop axis is untouched by a mobile action.
    expect(memory.get().open).toBe(true);
    expect(dispatch('closeMobile', {})).toBe(true);
    expect(memory.get().openMobile).toBe(false);
  });
});

describe('sidebar aria projection', () => {
  it('expanded: panel reports expanded, no collapse hook, mobile closed', () => {
    const aria = ariaAt({});
    expect(aria.panel).toEqual({
      'data-state': 'expanded',
      'data-collapsible': undefined,
      'data-mobile': 'closed',
    });
    expect(aria.trigger).toEqual({ 'aria-controls': 'p', 'data-state': 'expanded' });
    expect(aria.rail).toEqual({ 'aria-label': 'Toggle Sidebar', 'data-state': 'expanded' });
  });

  it('collapsed: panel reports the collapse mode hook', () => {
    const aria = ariaAt({ defaultOpen: false, collapsible: 'icon' });
    expect(aria.panel?.['data-state']).toBe('collapsed');
    expect(aria.panel?.['data-collapsible']).toBe('icon');
  });

  it('collapsible=none never projects a collapse hook, even collapsed', () => {
    const aria = ariaAt({ defaultOpen: false, collapsible: 'none' });
    expect(aria.panel?.['data-state']).toBe('collapsed');
    expect(aria.panel?.['data-collapsible']).toBeUndefined();
  });

  it('trigger controls the panel by real id; absent panel id projects no dangling reference', () => {
    const aria = sidebar.aria(sidebar.initialState({}), {}, { ...ids, panel: '' });
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
  });

  it('mobile axis flips the panel data-mobile without touching the desktop one', () => {
    const shown: SidebarState = { open: true, openMobile: true };
    const aria = sidebar.aria(shown, {}, ids);
    expect(aria.panel?.['data-mobile']).toBe('open');
    expect(aria.panel?.['data-state']).toBe('expanded');
    // role=dialog/aria-modal are bind-managed (viewport-dependent), never in the
    // pure projection.
    expect(aria.panel?.role).toBeUndefined();
  });

  it('side and variant are decoration -- they never enter the projection', () => {
    const aria = sidebar.aria(
      sidebar.initialState({}),
      { side: 'right', variant: 'floating' },
      ids,
    );
    const serialized = JSON.stringify(aria);
    expect(serialized).not.toContain('right');
    expect(serialized).not.toContain('floating');
  });
});

describe('sidebar keymap', () => {
  const state: SidebarState = { open: true, openMobile: true };
  it('Escape on the panel dismisses the mobile overlay', () => {
    expect(sidebar.keymap({ key: 'Escape' }, state, 'panel', {})).toBe('closeMobile');
  });
  it('Escape elsewhere and other keys are not claimed', () => {
    expect(sidebar.keymap({ key: 'Escape' }, state, 'trigger', {})).toBeNull();
    expect(sidebar.keymap({ key: 'Enter' }, state, 'panel', {})).toBeNull();
  });
});
