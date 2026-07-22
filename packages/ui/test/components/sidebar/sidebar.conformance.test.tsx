/**
 * React performance of the sidebar score, driven end to end. The desktop rail
 * renders in the RTL container; the mobile overlay is the merged Sheet, which
 * portals to document.body. The mobile axis is exercised by mocking matchMedia
 * (the viewport signal useIsMobile reads).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { sidebar } from '../../../src/components/sidebar/sidebar.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';
import type { SidebarConfig, SidebarState } from '../../../src/components/sidebar/sidebar.behavior';

function setViewport(isMobile: boolean): void {
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
}

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  collapsible?: SidebarConfig['collapsible'];
  onOpenChange?: (open: boolean) => void;
}

function TestSidebar(props: SetupProps) {
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

const menuButton = () => document.body.querySelector<HTMLElement>('[data-sidebar="menu-button"]');
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  setViewport(false);
});

describe('sidebar conformance [react]', () => {
  it('desktop default: expanded rail, every declared part present, ARIA equals the projection', async () => {
    setViewport(false);
    const { container } = render(<TestSidebar />);
    const config: SidebarConfig = {
      defaultOpen: true,
      side: 'left',
      variant: 'sidebar',
      collapsible: 'offcanvas',
    };
    const state: SidebarState = { open: true, openMobile: false };
    assertContractFulfillment(sidebar, container, state, config, [
      'root',
      'trigger',
      'rail',
      'panel',
    ]);
    await assertAxeClean(container);
  });

  it('desktop: the trigger collapses the rail and projects the collapse mode hook', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar collapsible="icon" />);
    const panel = partElement(container, 'panel') as HTMLElement;
    expect(panel.getAttribute('data-state')).toBe('expanded');

    await user.click(partElement(container, 'trigger') as HTMLElement);
    expect(panel.getAttribute('data-state')).toBe('collapsed');
    expect(panel.getAttribute('data-collapsible')).toBe('icon');
    // The collapsed desktop rail stays in the tree, navigable (never hidden).
    expect(panel.hasAttribute('hidden')).toBe(false);
  });

  it('desktop: the rail toggles the same expand axis as the trigger', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const panel = partElement(container, 'panel') as HTMLElement;
    await user.click(partElement(container, 'rail') as HTMLElement);
    expect(panel.getAttribute('data-state')).toBe('collapsed');
  });

  it('mobile: a CLOSED overlay renders no nav content -- links are not in the DOM or tab order', () => {
    setViewport(true);
    render(<TestSidebar />);
    // The merged Sheet is closed, so SheetContent is unmounted: the menu button
    // does not exist anywhere in the document (the AAA focus-management fix).
    expect(menuButton()).toBeNull();
    expect(dialog()).toBeNull();
  });

  it('mobile: the trigger reveals a modal dialog with the nav content and traps focus', async () => {
    setViewport(true);
    const user = userEvent.setup();
    render(<TestSidebar />);
    await user.click(partElement(document.body, 'trigger') as HTMLElement);

    const modal = dialog() as HTMLElement;
    expect(modal).not.toBeNull();
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-label')).toBe('Sidebar');
    expect(menuButton()).not.toBeNull();
    expect(modal.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    await assertAxeClean(document.body);
  });

  it('mobile: Escape closes the overlay, unmounts the nav, and restores focus to the trigger', async () => {
    setViewport(true);
    const user = userEvent.setup();
    render(<TestSidebar />);
    const trigger = partElement(document.body, 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(dialog()).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(menuButton()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('controlled: onOpenChange fires and the desktop axis follows the prop, not the gesture', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container, rerender } = render(
      <TestSidebar open={false} onOpenChange={onOpenChange} />,
    );
    const panel = partElement(container, 'panel') as HTMLElement;
    expect(panel.getAttribute('data-state')).toBe('collapsed');

    await user.click(partElement(container, 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(panel.getAttribute('data-state')).toBe('collapsed');

    rerender(<TestSidebar open onOpenChange={onOpenChange} />);
    expect(panel.getAttribute('data-state')).toBe('expanded');
  });

  it('Cmd/Ctrl+B toggles the desktop expand axis from anywhere', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const panel = partElement(container, 'panel') as HTMLElement;
    expect(panel.getAttribute('data-state')).toBe('expanded');
    await user.keyboard('{Meta>}b{/Meta}');
    expect(panel.getAttribute('data-state')).toBe('collapsed');
  });
});
