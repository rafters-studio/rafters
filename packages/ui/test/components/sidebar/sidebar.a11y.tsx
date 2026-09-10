import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '../../../src/components/sidebar/sidebar';
import type { SidebarConfig } from '../../../src/components/sidebar/sidebar.behavior';

interface SceneProps {
  defaultOpen?: boolean;
  collapsible?: SidebarConfig['collapsible'];
}

function Scene(props: SceneProps) {
  return (
    <SidebarProvider {...props}>
      <SidebarTrigger />
      <Sidebar>
        <SidebarRail />
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>Dashboard</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>Page</SidebarInset>
    </SidebarProvider>
  );
}

// The viewport is the real signal useIsMobile reads (the `md` breakpoint), so
// each scene sets it explicitly: vitest's default browser viewport is narrow.
const DESKTOP: [number, number] = [1280, 800];
const MOBILE: [number, number] = [375, 800];

interface Scene {
  props: SceneProps;
  viewport: [number, number];
  openMobile?: boolean;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['desktop expanded', { props: {}, viewport: DESKTOP }],
  ['desktop collapsed offcanvas', { props: { defaultOpen: false }, viewport: DESKTOP }],
  [
    'desktop collapsed to icons',
    { props: { defaultOpen: false, collapsible: 'icon' }, viewport: DESKTOP },
  ],
  ['desktop never collapsible', { props: { collapsible: 'none' }, viewport: DESKTOP }],
  ['mobile closed', { props: {}, viewport: MOBILE }],
  ['mobile open', { props: {}, viewport: MOBILE, openMobile: true }],
];

for (const [name, { props, viewport, openMobile }] of scenes) {
  test(`sidebar ${name}`, async ({ task }) => {
    await page.viewport(...viewport);
    const { container } = await render(<Scene {...props} />);
    if (openMobile) {
      // The mobile overlay is the merged Sheet, which portals to document.body
      // and mounts its content only once open, so the scene opens it through
      // the trigger and audits the whole body.
      (container.querySelector('[data-part="trigger"]') as HTMLElement).click();
      await expect.element(page.getByRole('dialog', { name: 'Sidebar' })).toBeInTheDocument();
    }
    const results = await runAxe(openMobile ? document.body : container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
