import { describe, expect, it } from 'vitest';
import {
  panelSideClasses,
  panelVariantClasses,
  sidebarClasses,
  sidebarMenuButtonClasses,
  sidebarMenuSubButtonClasses,
  sidebarPanelClasses,
} from '../../../src/components/sidebar/sidebar.classes';

const classes = sidebarClasses();

describe('sidebar shell classes', () => {
  it('the mobile overlay surface paints the sidebar fill over the Sheet frame', () => {
    // Sheet owns the modal positioning; this class only carries the sidebar
    // chrome, so it must not re-declare fixed/inset positioning.
    expect(classes.mobilePanel).toContain('bg-sidebar');
    expect(classes.mobilePanel).toContain('flex');
    expect(classes.mobilePanel).not.toContain('fixed');
  });

  it('the rail hairline is desktop-only on the navigation depth', () => {
    expect(classes.rail).toContain('md:flex');
    expect(classes.rail).toContain('z-depth-navigation');
    expect(classes.rail).toContain('cursor-ew-resize');
  });

  it('separators and menus sit on sidebar surface tokens', () => {
    expect(classes.separator).toContain('bg-sidebar-border');
    expect(classes.menu).toContain('flex');
  });
});

describe('sidebar panel: one element, both axes', () => {
  it('carries the mobile overlay size and the desktop rail size on their breakpoints', () => {
    const panel = sidebarPanelClasses('left', 'sidebar');
    expect(panel).toContain('z-depth-modal'); // mobile overlay depth
    expect(panel).toContain('w-72'); // mobile overlay width
    expect(panel).toContain('md:z-depth-navigation'); // desktop rail depth
    expect(panel).toContain('md:w-64'); // desktop rail width
  });

  it('keys the desktop collapse off data-state + data-collapsible', () => {
    const panel = sidebarPanelClasses('left', 'sidebar');
    expect(panel).toContain('md:data-[state=collapsed]:data-[collapsible=icon]:w-12');
    expect(panel).toContain('md:data-[state=collapsed]:data-[collapsible=offcanvas]:w-0');
  });

  it('anchors the panel to its side edge with the matching border', () => {
    expect(panelSideClasses.left).toContain('left-0');
    expect(panelSideClasses.left).toContain('border-r');
    expect(panelSideClasses.right).toContain('right-0');
    expect(panelSideClasses.right).toContain('border-l');
  });

  it('floating and inset variants round and lift the desktop rail', () => {
    expect(panelVariantClasses.floating).toContain('md:rounded-lg');
    expect(panelVariantClasses.floating).toContain('md:border');
    expect(panelVariantClasses.inset).toContain('md:rounded-lg');
    expect(panelVariantClasses.sidebar).toBe('');
  });

  it('declares NO layout motion: the collapse/slide timing is undeclared (tokens pending)', () => {
    // The oracle animated the collapse and slide with raw duration-200 +
    // ease-linear/ease-in-out; those are dropped -- only the from/to states ride
    // the data hooks. The horizontal-slide motion tokens do not exist yet.
    const panel = `${sidebarPanelClasses('left', 'sidebar')} ${sidebarPanelClasses('right', 'inset')}`;
    expect(panel).not.toContain('duration-200');
    expect(panel).not.toContain('ease-linear');
    expect(panel).not.toContain('ease-in-out');
    expect(panel).not.toContain('transition-transform');
    expect(panel).not.toContain('transition-all');
    expect(panel).not.toContain('animate-in');
    expect(panel).not.toContain('slide-in');
  });
});

describe('sidebar menu button variants', () => {
  it('base keeps only the small interaction-feedback duration (Spec 04)', () => {
    const base = sidebarMenuButtonClasses('default', 'default');
    expect(base).toContain('transition-colors');
    expect(base).toContain('duration-150');
    expect(base).toContain('motion-reduce:transition-none');
    expect(base).not.toContain('duration-200');
  });

  it('size and outline variants layer onto the base', () => {
    expect(sidebarMenuButtonClasses('default', 'sm')).toContain('text-label-small');
    expect(sidebarMenuButtonClasses('outline', 'default')).toContain('bg-background');
    expect(sidebarMenuButtonClasses('default', 'default')).not.toContain('bg-background');
  });

  it('submenu button sizes layer onto its base', () => {
    expect(sidebarMenuSubButtonClasses('sm')).toContain('text-label-small');
    expect(sidebarMenuSubButtonClasses('md')).toContain('text-label-medium');
  });
});
