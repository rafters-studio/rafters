/**
 * React performance of the sidebar score, driven end to end. The desktop rail
 * renders in the RTL container; the mobile overlay is the merged Sheet, which
 * portals to document.body. The mobile axis is exercised by mocking matchMedia
 * (the viewport signal useIsMobile reads).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '../../../src/components/sidebar/sidebar';
import { sidebar, type SidebarPart } from '../../../src/components/sidebar/sidebar.behavior';
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

/** The element carrying data-part="<part>". */
function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly SidebarPart[]): Record<SidebarPart, string> {
  const ids = {} as Record<SidebarPart, string>;
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

const menuButton = () => document.body.querySelector<HTMLElement>('[data-sidebar="menu-button"]');
const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]');

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  setViewport(false);
});

describe('sidebar [react]', () => {
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
    const expectedParts: SidebarPart[] = ['root', 'trigger', 'rail', 'panel'];
    const allParts = Object.keys(sidebar.parts) as SidebarPart[];
    const ids = domPartIds(container, allParts);
    const projection = sidebar.aria(state, config, ids);

    for (const part of expectedParts) {
      const element = partElement(container, part);
      expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
      const decl = sidebar.parts[part];
      if (decl.role) {
        expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
      }
      const attrs = projection[part];
      if (!attrs) continue;
      for (const [attr, attrValue] of Object.entries(attrs)) {
        if (attrValue === undefined) {
          expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
        } else {
          expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(attrValue));
        }
      }
    }
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

describe('sidebar icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    setViewport(false);
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;

  interface SceneProps {
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    sub?: boolean;
  }
  function Scene({ sub, ...icons }: SceneProps) {
    return (
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {sub ? (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton {...icons}>Settings</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                ) : (
                  <SidebarMenuButton {...icons}>Dashboard</SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
  }

  const buttonOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]',
    ) as HTMLElement;

  it.each([false, true])('start, end and both sit beside the label (sub: %s)', (sub) => {
    for (const [name, icons] of [
      ['start', { startIcon: svg(ICON_SVG_16) }],
      ['end', { endIcon: svg(ICON_SVG_16) }],
      ['both', { startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_16) }],
    ] as const) {
      const { container, unmount } = render(<Scene sub={sub} {...icons} />);
      const r = rectsOf(buttonOf(container));
      if (name !== 'end') {
        expect(r.start?.right as number, name).toBeLessThanOrEqual(r.label.left + 0.5);
      }
      if (name !== 'start') {
        expect(r.end?.left as number, name).toBeGreaterThanOrEqual(r.label.right - 0.5);
      }
      unmount();
    }
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const { container } = render(<Scene startIcon={svg(ICON_SVG_16)} />);
    const r = rectsOf(buttonOf(container));
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', () => {
    const { container } = render(<Scene startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_20)} />);
    const r = rectsOf(buttonOf(container));
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('each wrapper is aria-hidden and absent when no icon is given', () => {
    const { container } = render(<Scene startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)} />);
    const button = buttonOf(container);
    const start = button.querySelector('[data-part="startIcon"]');
    const end = button.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    cleanup();
    const bare = render(<Scene />);
    expect(bare.container.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(bare.container.querySelector('[data-part="endIcon"]')).toBeNull();
    expect(bare.container.querySelector('[data-part="label"]')).toBeNull();
  });

  it('asChild puts the icons around the child content', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild startIcon={svg(ICON_SVG_16)}>
                  <a href="/x">Home</a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );
    const a = container.querySelector('a') as HTMLElement;
    const order = [...a.querySelectorAll('[data-part]')].map((el) => el.getAttribute('data-part'));
    expect(order).toEqual(['startIcon', 'label']);
    expect(a.querySelector('[data-part="label"]')?.textContent).toBe('Home');
  });

  it('the accessible name is the label alone even when the svg has a title', async () => {
    render(
      <Scene
        startIcon={
          <svg viewBox="0 0 24 24" width="16" height="16">
            <title>Dash icon</title>
          </svg>
        }
      />,
    );
    await expect
      .element(page.getByRole('button', { name: 'Dashboard', exact: true }))
      .toBeInTheDocument();
  });
});
