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

  it('carries the root expand/collapse rows on the desktop width transition', () => {
    // motion.jsonl sidebar / root / "expand" (normal, enter) and "collapse"
    // (moderate, exit). The base rule is the expanded rail; data-[state=collapsed]
    // owns the collapse. md:-scoped -- below that the same element is the mobile
    // overlay, whose presence Sheet owns.
    const panel = sidebarPanelClasses('left', 'sidebar');
    expect(panel).toContain('md:transition-[width]');
    expect(panel).toContain('md:duration-normal');
    expect(panel).toContain('md:ease-enter');
    expect(panel).toContain('md:data-[state=collapsed]:duration-moderate');
    expect(panel).toContain('md:data-[state=collapsed]:ease-exit');
  });

  it('drops the oracle literals and the stock Tailwind curves', () => {
    const panel = `${sidebarPanelClasses('left', 'sidebar')} ${sidebarPanelClasses('right', 'inset')}`;
    expect(panel).not.toContain('duration-200');
    expect(panel).not.toContain('ease-in-out');
    expect(panel).not.toContain('animate-in');
    expect(panel).not.toContain('slide-in');
  });

  it('leaves the mobile overlay rows to the Sheet node this class lands on', () => {
    // sidebar.tsx passes mobilePanel as SheetContent's className, and sheet
    // already carries animate-fade-in-normal-spring-smooth /
    // animate-fade-out-moderate-exit -- the identical triples sidebar's own
    // cells emit. Restating them would double-drive opacity on one node.
    expect(classes.mobilePanel).not.toContain('animate-');
  });
});

describe('sidebar menu button variants', () => {
  it('carries the item hover and active-change rows: color, fast, standard', () => {
    // Both rows assign the same movement, properties, tier and curve on the same
    // element, so one declaration serves both.
    const base = sidebarMenuButtonClasses('default', 'default');
    expect(base).toContain('transition-colors');
    expect(base).toContain('duration-fast');
    expect(base).toContain('ease-standard');
    expect(base).not.toContain('duration-200');
  });

  it('the action buttons transition colours, not transforms', () => {
    // transition-transform was the wrong property as well as an incomplete
    // generic: nothing on these buttons transforms; hover changes bg and text.
    for (const value of [classes.groupAction, classes.menuAction]) {
      expect(value).toContain('transition-colors');
      expect(value).toContain('duration-fast');
      expect(value).toContain('ease-standard');
      expect(value).not.toContain('transition-transform');
    }
  });

  it('the submenu button carries the same item rows', () => {
    const sub = sidebarMenuSubButtonClasses('md');
    expect(sub).toContain('transition-colors');
    expect(sub).toContain('duration-fast');
    expect(sub).toContain('ease-standard');
  });

  it('the loading placeholder borrows the skeleton loop cell, not stock animate-pulse', () => {
    // The matrix assigns the moment once, as skeleton / root / "waiting" -- a
    // period-kind loop the generator emits as animate-pulse-shimmer. A loop is
    // exempt from the reduced-motion zero by design, and animate-none would win
    // destructively. Sidebar has no skeleton row of its own; reported on #2302.
    for (const value of [classes.menuSkeletonIcon, classes.menuSkeletonText]) {
      expect(value.split(/\s+/)).toContain('animate-pulse-shimmer');
      expect(value).not.toContain('motion-reduce:animate-none');
    }
  });

  it('size and outline variants layer onto the base', () => {
    expect(sidebarMenuButtonClasses('default', 'sm')).toContain('ts-label-small');
    expect(sidebarMenuButtonClasses('outline', 'default')).toContain('bg-background');
    expect(sidebarMenuButtonClasses('default', 'default')).not.toContain('bg-background');
  });

  it('submenu button sizes layer onto its base', () => {
    expect(sidebarMenuSubButtonClasses('sm')).toContain('ts-label-small');
    expect(sidebarMenuSubButtonClasses('md')).toContain('ts-label-medium');
  });
});

describe('sidebar motion vocabulary', () => {
  const everyClass = [
    ...Object.values(classes),
    sidebarPanelClasses('left', 'sidebar'),
    sidebarPanelClasses('right', 'inset'),
    sidebarMenuButtonClasses('outline', 'lg'),
    sidebarMenuSubButtonClasses('sm'),
  ];

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    for (const value of everyClass) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
  });

  it('names only the six curve roles', () => {
    const roles = ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'];
    for (const value of everyClass) {
      for (const candidate of value.split(/\s+/)) {
        const curve = candidate.split(':').pop() ?? '';
        if (!curve.startsWith('ease-')) continue;
        expect(roles).toContain(curve.slice('ease-'.length));
      }
    }
  });
});
