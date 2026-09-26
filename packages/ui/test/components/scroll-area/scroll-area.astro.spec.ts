/**
 * Astro performance of the ScrollArea score. ScrollArea is a PURE STATIC -- the
 * score projects no ARIA, holds no state, runs no effects -- so its Astro file
 * ships NO <script> and there is NO bindScrollArea. This test renders the
 * server markup and asserts the one contract a static scroll surface carries:
 * the root region with the shared classes, the orientation switch, and the
 * part boundary.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollArea from '../../../src/components/scroll-area/scroll-area.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ScrollArea, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

function root(body: HTMLElement): HTMLElement {
  const el = body.querySelector<HTMLElement>('[data-part="root"]');
  if (!el) throw new Error('no [data-part="root"] rendered');
  return el;
}

describe('scroll-area [astro]', () => {
  it('renders a root scroll surface carrying the shared classes', async () => {
    const body = await render();
    const el = root(body);
    expect(el.className).toContain('h-full w-full');
    // SSR HTML-escapes the `&` in the WebKit arbitrary-variant selector, so
    // assert the surviving tail rather than the `[&` prefix.
    expect(el.className).toContain('::-webkit-scrollbar-thumb]:bg-border');
    expect(el.className).toContain('overflow-y-auto');
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const body = await render();
    expect(root(body).getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const body = await render({}, { default: '<p>Body</p>' });
    const parts = body.querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('orientation mirrors the React/WC prop through the same projection', async () => {
    const body = await render({ orientation: 'horizontal' });
    const el = root(body);
    expect(el.className).toContain('overflow-x-auto');
    expect(el.className).not.toContain('overflow-y-auto');
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const body = await render({ class: 'mx-4' });
    const el = root(body);
    expect(el.className).toContain('h-full w-full');
    expect(el.className).not.toContain('mx-4');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('slotted content projects into the surface', async () => {
    const body = await render({}, { default: '<ul><li>One</li></ul>' });
    expect(root(body).textContent).toContain('One');
  });
});
