/**
 * React performance of the sidebar score, driven end to end. Nothing portals, so
 * part queries run against the RTL container. The mobile axis is exercised by
 * mocking matchMedia (the viewport signal useIsMobile reads).
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

afterEach(() => {
  cleanup();
  setViewport(false);
});

describe('sidebar conformance [react]', () => {
  it('default: expanded rail, every declared part present, ARIA equals the projection', async () => {
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
      'overlay',
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
    // The desktop collapse never touches the mobile axis.
    expect(panel.getAttribute('data-mobile')).toBe('closed');
  });

  it('desktop: the rail toggles the same expand axis as the trigger', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const panel = partElement(container, 'panel') as HTMLElement;
    await user.click(partElement(container, 'rail') as HTMLElement);
    expect(panel.getAttribute('data-state')).toBe('collapsed');
  });

  it('mobile: the trigger reveals the overlay and unhides the scrim', async () => {
    setViewport(true);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const panel = partElement(container, 'panel') as HTMLElement;
    const overlay = partElement(container, 'overlay') as HTMLElement;
    expect(overlay.hasAttribute('hidden')).toBe(true);

    await user.click(partElement(container, 'trigger') as HTMLElement);
    expect(panel.getAttribute('data-mobile')).toBe('open');
    expect(overlay.hasAttribute('hidden')).toBe(false);
    // The mobile overlay never touches the desktop expand axis.
    expect(panel.getAttribute('data-state')).toBe('expanded');
  });

  it('mobile: clicking the scrim dismisses the overlay', async () => {
    setViewport(true);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    await user.click(partElement(container, 'trigger') as HTMLElement);
    const panel = partElement(container, 'panel') as HTMLElement;
    expect(panel.getAttribute('data-mobile')).toBe('open');

    await user.click(partElement(container, 'overlay') as HTMLElement);
    expect(panel.getAttribute('data-mobile')).toBe('closed');
  });

  it('mobile: Escape inside the panel dismisses and restores focus to the trigger', async () => {
    setViewport(true);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const trigger = partElement(container, 'trigger') as HTMLElement;
    await user.click(trigger);
    const panel = partElement(container, 'panel') as HTMLElement;
    expect(panel.getAttribute('data-mobile')).toBe('open');

    // Focus a control INSIDE the panel, then press Escape: the panel-scoped
    // keymap must fire even though focus is on a descendant.
    const menuButton = panel.querySelector<HTMLElement>(
      '[data-sidebar="menu-button"]',
    ) as HTMLElement;
    menuButton.focus();
    await user.keyboard('{Escape}');
    expect(panel.getAttribute('data-mobile')).toBe('closed');
    expect(document.activeElement).toBe(trigger);
  });

  it('desktop: Escape is inert while the overlay is closed (no swallowed key)', async () => {
    setViewport(false);
    const user = userEvent.setup();
    const { container } = render(<TestSidebar />);
    const panel = partElement(container, 'panel') as HTMLElement;
    const menuButton = panel.querySelector<HTMLElement>(
      '[data-sidebar="menu-button"]',
    ) as HTMLElement;
    menuButton.focus();
    await user.keyboard('{Escape}');
    // The idempotence gate makes closeMobile a no-op; nothing changes.
    expect(panel.getAttribute('data-mobile')).toBe('closed');
    expect(panel.getAttribute('data-state')).toBe('expanded');
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
    // Effective value is controlled: the rail stays collapsed until the prop moves.
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
