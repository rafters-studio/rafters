/**
 * React server render of the menubar. The menus portal into a host that exists
 * only after mount; until then each renders in place, closed and inert, so the server
 * markup carries every menu (as the Astro performance does) and every trigger
 * reference resolves.
 */
import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '../../../src/components/menubar/menubar';

function Scene() {
  return (
    <Menubar defaultValue="file">
      <MenubarMenu value="file">
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe('menubar [react ssr]', () => {
  it('hydrates the server markup without a mismatch, then moves the menu out of the bar', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(<Scene />);
    document.body.appendChild(container);
    // The unit project runs with isolation off, so whether an earlier file left
    // React's act environment flag set is order-dependent: set it here.
    const actEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
    actEnv.IS_REACT_ACT_ENVIRONMENT = true;
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const recoverable: unknown[] = [];
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Scene />, {
        onRecoverableError: (error) => recoverable.push(error),
      });
    });
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    const bar = container.querySelector('[data-part="root"]');
    expect(bar?.querySelector('[data-part="content"]')).toBeNull();
    expect(container.querySelector('[data-part="content"]')).not.toBeNull();
    await act(async () => root?.unmount());
    errors.mockRestore();
    actEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    container.remove();
  });

  it('server markup carries the menu, closed and inert, and the trigger references it', () => {
    const html = renderToString(<Scene />);
    const host = document.createElement('div');
    host.innerHTML = html;
    const trigger = host.querySelector('[data-part="trigger"][data-value="file"]');
    const menu = host.querySelector<HTMLElement>('[data-part="content"][data-value="file"]');
    expect(menu).not.toBeNull();
    expect(menu?.inert).toBe(true);
    expect(menu?.hidden).toBe(false);
    // Inline, unpositioned: the closed pose even for the default-open menu.
    expect(menu?.dataset['state']).toBe('closed');
    expect(menu?.getAttribute('role')).toBe('menu');
    expect(menu?.textContent).toBe('New');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(trigger?.getAttribute('aria-controls')).toBe(menu?.id);
    expect(menu?.getAttribute('aria-labelledby')).toBe(trigger?.id);
  });
});
