/**
 * #2657: a `contained` sidebar takes its height from its container, not the
 * viewport. The browser test page loads no compiled Tailwind sheet, so the
 * stand-in below is the compiled output for exactly the structural candidates
 * involved, keyed on the REAL class names (so the class strings on the elements
 * must carry them). sidebar.classes.test.ts proves each contained candidate
 * compiles to these rules.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '../../../src/components/sidebar/sidebar';
import type { SidebarVariant } from '../../../src/components/sidebar/sidebar.behavior';

const esc = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;
const inWrapper = ':is(:where(.group\\/sidebar-wrapper)[data-contained=true] *)';

const STAND_IN = `
  ${esc('flex')} { display: flex; }
  ${esc('flex-col')} { flex-direction: column; }
  ${esc('flex-1')} { flex: 1; }
  ${esc('w-full')} { width: 100%; }
  ${esc('min-h-0')} { min-height: 0; }
  ${esc('min-h-svh')} { min-height: 100svh; }
  ${esc('overflow-auto')} { overflow: auto; }
  ${esc('relative')} { position: relative; }
  ${esc('fixed')} { position: fixed; }
  ${esc('h-svh')} { height: 100svh; }
  ${esc('data-[contained=true]:h-full')}[data-contained=true] { height: 100%; }
  ${esc('data-[contained=true]:min-h-0')}[data-contained=true] { min-height: 0; }
  ${esc('group-data-[contained=true]/sidebar-wrapper:min-h-0')}${inWrapper} { min-height: 0; }
  @media (min-width: 48rem) {
    ${esc('md:sticky')} { position: sticky; }
    ${esc('md:top-0')} { top: 0; }
    ${esc('md:w-64')} { width: 16rem; }
    ${esc('md:m-2')} { margin: 0.5rem; }
    ${esc('md:h-svh')} { height: 100svh; }
    ${esc('md:h-[calc(100svh-theme(spacing.4))]')} { height: calc(100svh - 1rem); }
    ${esc('md:group-data-[contained=true]/sidebar-wrapper:h-auto')}${inWrapper} { height: auto; }
  }
  [data-sidebar="menu-button"] { display: block; height: 40px; }
`;

const ITEMS = Array.from({ length: 12 }, (_, i) => (i === 0 ? 'Dashboard' : `Item ${i + 1}`));

function Scene({ contained, variant }: { contained?: boolean; variant?: SidebarVariant }) {
  return (
    <div data-testid="card" style={{ height: '400px' }}>
      <SidebarProvider contained={contained} variant={variant}>
        <Sidebar>
          <SidebarHeader>
            <strong>Acme Studio</strong>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {ITEMS.map((label) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton>{label}</SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>Signed in as Dana Reyes</SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <p>Content here</p>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

const box = (container: HTMLElement, selector: string): DOMRect => {
  const el = container.querySelector(selector);
  if (!(el instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return el.getBoundingClientRect();
};

describe('sidebar contained [react] (#2657)', () => {
  let style: HTMLStyleElement;
  beforeEach(() => {
    style = document.createElement('style');
    style.textContent = STAND_IN;
    document.head.appendChild(style);
  });
  afterEach(() => {
    cleanup();
    style.remove();
  });

  for (const viewport of [
    [1200, 800],
    [1200, 300],
  ] as const) {
    for (const variant of ['sidebar', 'floating'] as const) {
      it(`fits a 400px container at ${viewport.join('x')} (${variant})`, async () => {
        await page.viewport(...viewport);
        const { container } = render(<Scene contained variant={variant} />);

        const root = container.querySelector('[data-part="root"]');
        expect(root?.getAttribute('data-contained')).toBe('true');
        for (const part of ['root', 'panel', 'inset']) {
          expect(box(container, `[data-part="${part}"]`).height, part).toBeLessThanOrEqual(400);
        }

        const card = box(container, '[data-testid="card"]');
        const footer = box(container, '[data-sidebar="footer"]');
        const first = box(container, '[data-sidebar="menu-button"]');
        expect(footer.bottom).toBeLessThanOrEqual(card.bottom);
        expect(first.top).toBeGreaterThanOrEqual(card.top);
        expect(first.bottom).toBeLessThanOrEqual(footer.top);

        const content = container.querySelector('[data-sidebar="content"]');
        if (!(content instanceof HTMLElement)) throw new Error('no content');
        expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
      });
    }
  }

  it('without contained the rail keeps the viewport height', async () => {
    await page.viewport(1200, 300);
    const { container } = render(<Scene />);
    expect(container.querySelector('[data-part="root"]')?.hasAttribute('data-contained')).toBe(
      false,
    );
    expect(box(container, '[data-part="panel"]').height).toBe(300);
  });
});
