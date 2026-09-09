/**
 * The Astro sub-component files are the DROP-IN PARITY SURFACE: an Astro tree
 * has to compose exactly like the React tree --
 *
 *   <Sidebar id="app"><SidebarHeader/><SidebarContent>
 *     <SidebarGroup><SidebarGroupLabel/><SidebarMenu>
 *       <SidebarMenuItem><SidebarMenuButton asChild><a/></SidebarMenuButton></SidebarMenuItem>
 *     </SidebarMenu></SidebarGroup>
 *   </SidebarContent><SidebarFooter/></Sidebar><SidebarInset/>
 *
 * -- with each part importable on its own from
 * `@/components/ui/sidebar-header.astro` and siblings. sidebar.astro's named
 * `trigger`/default slots remain as a convenience; these files are what a
 * shadcn consumer's existing imports resolve to (Decision 1, 2026-09-09:
 * shadcn's flat names -- `SidebarHeader`, not the React-only `Sidebar.Header`).
 *
 * Both draw from the SAME class strings in sidebar.classes.ts the React
 * performance reads, so a class-string assertion here is the cross-framework
 * proof: React and Astro can only agree because there is exactly one
 * projection, never two hand-copied ones (the same trust card-subcomponents
 * places in card.classes.ts).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean } from '../../harness/conformance';
import {
  sidebarClasses,
  sidebarMenuButtonClasses,
  sidebarMenuSubButtonClasses,
} from '../../../src/components/sidebar/sidebar.classes';
import SidebarHeader from '../../../src/components/sidebar/sidebar-header.astro';
import SidebarFooter from '../../../src/components/sidebar/sidebar-footer.astro';
import SidebarContent from '../../../src/components/sidebar/sidebar-content.astro';
import SidebarGroup from '../../../src/components/sidebar/sidebar-group.astro';
import SidebarGroupLabel from '../../../src/components/sidebar/sidebar-group-label.astro';
import SidebarGroupAction from '../../../src/components/sidebar/sidebar-group-action.astro';
import SidebarGroupContent from '../../../src/components/sidebar/sidebar-group-content.astro';
import SidebarMenu from '../../../src/components/sidebar/sidebar-menu.astro';
import SidebarMenuItem from '../../../src/components/sidebar/sidebar-menu-item.astro';
import SidebarMenuButton from '../../../src/components/sidebar/sidebar-menu-button.astro';
import SidebarMenuAction from '../../../src/components/sidebar/sidebar-menu-action.astro';
import SidebarMenuBadge from '../../../src/components/sidebar/sidebar-menu-badge.astro';
import SidebarMenuSkeleton from '../../../src/components/sidebar/sidebar-menu-skeleton.astro';
import SidebarMenuSub from '../../../src/components/sidebar/sidebar-menu-sub.astro';
import SidebarMenuSubItem from '../../../src/components/sidebar/sidebar-menu-sub-item.astro';
import SidebarMenuSubButton from '../../../src/components/sidebar/sidebar-menu-sub-button.astro';
import SidebarSeparator from '../../../src/components/sidebar/sidebar-separator.astro';
import SidebarInset from '../../../src/components/sidebar/sidebar-inset.astro';
import SidebarTrigger from '../../../src/components/sidebar/sidebar-trigger.astro';
import SidebarRail from '../../../src/components/sidebar/sidebar-rail.astro';
import Sidebar from '../../../src/components/sidebar/sidebar.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderOne(
  Component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

const classes = sidebarClasses();

describe('sidebar astro sub-components [parity surface, pure decoration]', () => {
  it.each([
    [SidebarHeader, 'header', classes.header],
    [SidebarFooter, 'footer', classes.footer],
    [SidebarContent, 'content', classes.content],
    [SidebarGroup, 'group', classes.group],
    [SidebarGroupContent, 'group-content', classes.groupContent],
    [SidebarMenuBadge, 'menu-badge', classes.menuBadge],
    [SidebarMenuSub, 'menu-sub', classes.menuSub],
    [SidebarMenuSubItem, 'menu-sub-item', classes.menuSubItem],
    [SidebarSeparator, 'separator', classes.separator],
  ] as const)(
    '%s renders [data-sidebar="%s"] with the projection class',
    async (Component, part, expected) => {
      const body = await renderOne(Component, {}, { default: 'x' });
      const el = body.querySelector(`[data-sidebar="${part}"]`) as HTMLElement;
      expect(el, part).not.toBeNull();
      expect(el.className, part).toBe(expected);
    },
  );

  it('SidebarMenu renders a ul[data-sidebar="menu"]', async () => {
    const body = await renderOne(SidebarMenu, {}, { default: '<li>x</li>' });
    const el = body.querySelector('[data-sidebar="menu"]') as HTMLElement;
    expect(el.tagName).toBe('UL');
    expect(el.className).toBe(classes.menu);
  });

  it('SidebarMenuItem renders a li[data-sidebar="menu-item"]', async () => {
    const body = await renderOne(SidebarMenuItem, {}, { default: 'x' });
    const el = body.querySelector('[data-sidebar="menu-item"]') as HTMLElement;
    expect(el.tagName).toBe('LI');
    expect(el.className).toBe(classes.menuItem);
  });

  it('SidebarInset renders a main[data-part="inset"]', async () => {
    const body = await renderOne(SidebarInset, {}, { default: 'x' });
    const el = body.querySelector('[data-part="inset"]') as HTMLElement;
    expect(el.tagName).toBe('MAIN');
    expect(el.className).toBe(classes.inset);
  });

  it('SidebarMenuSkeleton renders the icon only when showIcon is set, with a per-render width', async () => {
    const withoutIcon = await renderOne(SidebarMenuSkeleton);
    expect(withoutIcon.querySelector('[data-sidebar="menu-skeleton"]')?.className).toBe(
      classes.menuSkeleton,
    );
    expect(withoutIcon.querySelector(`.${classes.menuSkeletonIcon.split(' ')[0]}`)).toBeNull();

    const withIcon = await renderOne(SidebarMenuSkeleton, { showIcon: true });
    const icon = withIcon.querySelector(
      '[data-sidebar="menu-skeleton"] > div:first-child',
    ) as HTMLElement;
    expect(icon.className).toBe(classes.menuSkeletonIcon);
    const text = withIcon.querySelector(
      '[data-sidebar="menu-skeleton"] > div:last-child',
    ) as HTMLElement;
    expect(text.className).toBe(classes.menuSkeletonText);
    expect(text.style.getPropertyValue('--skeleton-width')).toMatch(/^\d+%$/);
  });

  it('class is NOT a prop on any decoration sub-component -- it never reaches the element', async () => {
    for (const [Component, part] of [
      [SidebarHeader, 'header'],
      [SidebarFooter, 'footer'],
      [SidebarContent, 'content'],
      [SidebarGroup, 'group'],
      [SidebarGroupContent, 'group-content'],
      [SidebarMenuBadge, 'menu-badge'],
      [SidebarMenuSub, 'menu-sub'],
      [SidebarMenuSubItem, 'menu-sub-item'],
      [SidebarSeparator, 'separator'],
    ] as const) {
      const body = await renderOne(Component, { class: 'bg-red-500' }, { default: 'x' });
      const el = body.querySelector(`[data-sidebar="${part}"]`) as HTMLElement;
      expect(el, part).not.toBeNull();
      expect(el.className, part).not.toContain('bg-red-500');
    }
  });
});

describe('sidebar astro sub-components [asChild, render-then-inject]', () => {
  it('SidebarGroupLabel: default renders its own div; asChild injects onto the child, dropping its class', async () => {
    const asDiv = await renderOne(SidebarGroupLabel, {}, { default: 'Main' });
    const div = asDiv.querySelector('[data-sidebar="group-label"]') as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div.className).toBe(classes.groupLabel);

    const asChild = await renderOne(
      SidebarGroupLabel,
      { asChild: true },
      { default: '<a href="/x" class="leaked">Main</a>' },
    );
    const a = asChild.querySelector('a') as HTMLElement;
    expect(a.getAttribute('data-sidebar')).toBe('group-label');
    expect(a.className).toBe(classes.groupLabel);
    expect(a.getAttribute('href')).toBe('/x');
    expect(asChild.querySelectorAll('div')).toHaveLength(0);
  });

  it('SidebarGroupAction: default renders its own button; asChild injects onto the child', async () => {
    const asButton = await renderOne(SidebarGroupAction, {}, { default: '+' });
    const button = asButton.querySelector('[data-sidebar="group-action"]') as HTMLElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button.className).toBe(classes.groupAction);

    const asChild = await renderOne(
      SidebarGroupAction,
      { asChild: true },
      { default: '<a href="/x" class="leaked">+</a>' },
    );
    const a = asChild.querySelector('a') as HTMLElement;
    expect(a.getAttribute('data-sidebar')).toBe('group-action');
    expect(a.className).toBe(classes.groupAction);
  });

  it('SidebarMenuButton: default renders its own button with variant/size/isActive; asChild injects onto the child', async () => {
    const asButton = await renderOne(
      SidebarMenuButton,
      { isActive: true, size: 'sm' },
      { default: 'Home' },
    );
    const button = asButton.querySelector('[data-sidebar="menu-button"]') as HTMLElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button.className).toBe(sidebarMenuButtonClasses('default', 'sm'));
    expect(button.getAttribute('data-size')).toBe('sm');
    expect(button.getAttribute('data-active')).toBe('true');

    const asChild = await renderOne(
      SidebarMenuButton,
      { asChild: true, isActive: true },
      { default: '<a href="/dashboard" class="leaked">Dashboard</a>' },
    );
    const a = asChild.querySelector('a') as HTMLElement;
    expect(a.getAttribute('data-sidebar')).toBe('menu-button');
    expect(a.getAttribute('data-active')).toBe('true');
    expect(a.className).toBe(sidebarMenuButtonClasses('default', 'default'));
    expect(a.getAttribute('href')).toBe('/dashboard');
    expect(a.className).not.toContain('leaked');
  });

  it('SidebarMenuAction: showOnHover composes the second class; asChild injects onto the child', async () => {
    const withHover = await renderOne(SidebarMenuAction, { showOnHover: true }, { default: 'x' });
    const button = withHover.querySelector('[data-sidebar="menu-action"]') as HTMLElement;
    expect(button.className).toBe(`${classes.menuAction} ${classes.menuActionShowOnHover}`);

    const asChild = await renderOne(
      SidebarMenuAction,
      { asChild: true },
      { default: '<a href="/x" class="leaked">x</a>' },
    );
    const a = asChild.querySelector('a') as HTMLElement;
    expect(a.getAttribute('data-sidebar')).toBe('menu-action');
    expect(a.className).toBe(classes.menuAction);
  });

  it('SidebarMenuSubButton: default renders an <a> with size/isActive; asChild injects onto the child', async () => {
    const asAnchor = await renderOne(
      SidebarMenuSubButton,
      { isActive: true, size: 'sm', href: '/x' },
      { default: 'Home' },
    );
    const a = asAnchor.querySelector('[data-sidebar="menu-sub-button"]') as HTMLElement;
    expect(a.tagName).toBe('A');
    expect(a.className).toBe(sidebarMenuSubButtonClasses('sm'));
    expect(a.getAttribute('data-size')).toBe('sm');
    expect(a.getAttribute('data-active')).toBe('true');
    expect(a.getAttribute('href')).toBe('/x');

    const asChild = await renderOne(
      SidebarMenuSubButton,
      { asChild: true },
      { default: '<span class="leaked">Home</span>' },
    );
    const span = asChild.querySelector('span') as HTMLElement;
    expect(span.getAttribute('data-sidebar')).toBe('menu-sub-button');
    expect(span.className).toBe(sidebarMenuSubButtonClasses('md'));
    expect(asChild.querySelectorAll('a')).toHaveLength(0);
  });

  it("asChild with no element in the slot falls back to the part's own tag", async () => {
    const body = await renderOne(SidebarMenuButton, { asChild: true }, { default: 'plain text' });
    const button = body.querySelector('[data-sidebar="menu-button"]') as HTMLElement;
    expect(button).not.toBeNull();
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toBe('plain text');
  });
});

describe('sidebar astro sub-components [trigger/rail, behavior-connected]', () => {
  it('SidebarTrigger recomputes the SAME projection sidebar.astro renders inline, given the same id', async () => {
    const body = await renderOne(SidebarTrigger, { id: 'sb' });
    const trigger = body.querySelector('[data-part="trigger"]') as HTMLElement;
    expect(trigger.id).toBe('sb-trigger');
    expect(trigger.getAttribute('aria-controls')).toBe('sb-panel');
    expect(trigger.getAttribute('data-state')).toBe('expanded');
    expect(trigger.className).toBe(classes.trigger);
  });

  it('SidebarTrigger reflects a collapsed defaultOpen', async () => {
    const body = await renderOne(SidebarTrigger, { id: 'sb', defaultOpen: false });
    const trigger = body.querySelector('[data-part="trigger"]') as HTMLElement;
    expect(trigger.getAttribute('data-state')).toBe('collapsed');
  });

  it('SidebarRail recomputes the SAME projection sidebar.astro renders inline, given the same id', async () => {
    const body = await renderOne(SidebarRail, { id: 'sb' });
    const rail = body.querySelector('[data-part="rail"]') as HTMLElement;
    expect(rail.id).toBe('sb-rail');
    expect(rail.getAttribute('data-state')).toBe('expanded');
    expect(rail.getAttribute('aria-label')).toBe('Toggle Sidebar');
    expect(rail.className).toBe(classes.rail);
  });
});

describe('sidebar astro sub-components [composed tree matches sidebar.astro:23-47]', () => {
  it('composes into the flat SidebarHeader/SidebarContent/SidebarMenuButton example, axe-clean', async () => {
    // The whole point of restoring these files: this tree, with no slot
    // syntax and no namespaced Sidebar.X spelling (Decision 1, 2026-09-09).
    const container = await AstroContainer.create();

    const groupLabel = await container.renderToString(SidebarGroupLabel, {
      slots: { default: 'Main' },
    });
    const menuButton = await container.renderToString(SidebarMenuButton, {
      props: { asChild: true },
      slots: { default: '<a href="/dashboard">Dashboard</a>' },
    });
    const menuItem = await container.renderToString(SidebarMenuItem, {
      slots: { default: menuButton },
    });
    const menu = await container.renderToString(SidebarMenu, { slots: { default: menuItem } });
    const group = await container.renderToString(SidebarGroup, {
      slots: { default: groupLabel + menu },
    });
    const content = await container.renderToString(SidebarContent, { slots: { default: group } });
    const header = await container.renderToString(SidebarHeader, { slots: { default: 'Logo' } });
    const footer = await container.renderToString(SidebarFooter, {
      slots: { default: 'UserMenu' },
    });

    // Composed inside the real Sidebar root (sidebar.astro) so the tree gets
    // its actual <nav> landmark, matching how a consumer would really use
    // these files -- not a bare fragment of loose sub-components.
    const sidebarHtml = await container.renderToString(Sidebar, {
      props: { id: 'app' },
      slots: { default: header + content + footer },
    });
    const inset = await container.renderToString(SidebarInset, {
      slots: { default: 'Content here' },
    });

    document.body.innerHTML = `<div>${sidebarHtml}${inset}</div>`;

    const markers = [...document.body.querySelectorAll('[data-sidebar]')].map((n) =>
      n.getAttribute('data-sidebar'),
    );
    // The React tree from sidebar.tsx:22-47, re-spelled flat (Decision 1):
    // Header, Content, Group, GroupLabel, Menu, MenuItem, MenuButton, Footer.
    expect(markers).toEqual([
      'header',
      'content',
      'group',
      'group-label',
      'menu',
      'menu-item',
      'menu-button',
      'footer',
    ]);

    const headerEl = document.body.querySelector('[data-sidebar="header"]') as HTMLElement;
    expect(headerEl.className).toBe(classes.header);
    const groupLabelEl = document.body.querySelector('[data-sidebar="group-label"]') as HTMLElement;
    expect(groupLabelEl.className).toBe(classes.groupLabel);
    const menuButtonEl = document.body.querySelector('[data-sidebar="menu-button"]') as HTMLElement;
    expect(menuButtonEl.tagName).toBe('A');
    expect(menuButtonEl.className).toBe(sidebarMenuButtonClasses('default', 'default'));

    const insetEl = document.body.querySelector('[data-part="inset"]') as HTMLElement;
    expect(insetEl).not.toBeNull();
    expect(insetEl.className).toBe(classes.inset);

    await assertAxeClean(document.body);
  });
});
