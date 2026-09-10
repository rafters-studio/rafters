import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Sidebar from '../../../src/components/sidebar/sidebar.astro';
import SidebarHeader from '../../../src/components/sidebar/sidebar-header.astro';
import SidebarContent from '../../../src/components/sidebar/sidebar-content.astro';
import SidebarFooter from '../../../src/components/sidebar/sidebar-footer.astro';
import SidebarGroup from '../../../src/components/sidebar/sidebar-group.astro';
import SidebarGroupLabel from '../../../src/components/sidebar/sidebar-group-label.astro';
import SidebarMenu from '../../../src/components/sidebar/sidebar-menu.astro';
import SidebarMenuItem from '../../../src/components/sidebar/sidebar-menu-item.astro';
import SidebarMenuButton from '../../../src/components/sidebar/sidebar-menu-button.astro';
import { bindSidebar } from '../../../src/components/sidebar/sidebar.behavior';

interface Scene {
  props?: Record<string, unknown>;
  mobile?: boolean;
  openMobile?: boolean;
}

/** bindSidebar reads the viewport from the global window.matchMedia (the
 *  same signal the conformance tests mock); the mocked list is captured at
 *  bind time, so the original is restored right after. */
function withViewport<T>(isMobile: boolean, run: () => T): T {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    return run();
  } finally {
    window.matchMedia = original;
  }
}

async function mount({ props = {}, mobile = false, openMobile = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sidebar, {
    props: { id: 'sb', ...props },
    slots: { default: '<a href="/dashboard" data-sidebar="menu-button">Dashboard</a>' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  const root = document.querySelector('rafters-sidebar') as HTMLElement;
  withViewport(mobile, () => bindSidebar(root));
  if (openMobile) {
    // The mobile overlay opens only through the trigger; the bind renders
    // synchronously on dispatch.
    (root.querySelector('[data-part="trigger"]') as HTMLElement).click();
  }
  return document;
}

// `mobile open` was excluded while bindSidebar put role="dialog" on the `<nav>`
// panel, which HTML does not allow on nav and axe reports as aria-allowed-role.
// #2324 moved those modal attributes onto a dedicated wrapper element the panel
// now renders inside, so the scene audits clean and is back in the table.
const scenes: ReadonlyArray<[string, Scene]> = [
  ['desktop expanded', {}],
  ['desktop collapsed offcanvas', { props: { defaultOpen: false } }],
  ['desktop collapsed to icons', { props: { defaultOpen: false, collapsible: 'icon' } }],
  ['desktop on the right', { props: { side: 'right' } }],
  ['desktop floating variant', { props: { variant: 'floating' } }],
  ['mobile closed', { mobile: true }],
  ['mobile open', { mobile: true, openMobile: true }],
];

/**
 * The scenes above pass the sidebar's own default slot a single anchor. The
 * part files are the parity surface (#2324), and a tree built from them is a
 * different DOM: real ul and li elements, a group label, and a menu button that
 * rendered through asChild onto an anchor. sidebar-subcomponents' conformance
 * test used to audit that composition; auditing only the plain slot would leave
 * the shape a consumer actually writes unaudited.
 */
async function partComposedScene(): Promise<Document> {
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
  const footer = await container.renderToString(SidebarFooter, { slots: { default: 'UserMenu' } });
  const html = await container.renderToString(Sidebar, {
    props: { id: 'sb' },
    slots: { default: header + content + footer },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.querySelector('rafters-sidebar') as HTMLElement;
  withViewport(false, () => bindSidebar(root));
  return document;
}

test('sidebar.astro composed from the flat part files', async ({ task }) => {
  const document = await partComposedScene();
  // The part-file tree, not the plain-slot one: real list semantics and an
  // anchor the menu button injected onto through asChild.
  expect(document.querySelector('ul[data-sidebar="menu"]')).not.toBeNull();
  expect(document.querySelector('a[data-sidebar="menu-button"]')).not.toBeNull();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

for (const [name, scene] of scenes) {
  test(`sidebar.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
