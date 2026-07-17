/**
 * Astro performance of the ScrollArea score. ScrollArea is a PURE STATIC -- the
 * score projects no ARIA, holds no state, runs no effects -- so its Astro file
 * ships NO <script> and there is NO bindScrollArea. This test renders the
 * server markup and asserts the one contract a static scroll surface carries:
 * the root region with the shared classes, the orientation switch, and axe
 * cleanliness. One score, three performances; here it is markup + classes +
 * slot, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
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

describe('scroll-area conformance [astro]', () => {
  it('renders a root scroll surface carrying the shared classes', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('h-full w-full');
    // SSR HTML-escapes the `&` in the WebKit arbitrary-variant selector, so
    // assert the surviving tail rather than the `[&` prefix.
    expect(root.className).toContain('::-webkit-scrollbar-thumb]:bg-border');
    expect(root.className).toContain('overflow-y-auto');
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const body = await render({}, { default: '<p>Body</p>' });
    const parts = body.querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('orientation mirrors the React/WC prop through the same projection', async () => {
    const body = await render({ orientation: 'horizontal' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('overflow-x-auto');
    expect(root.className).not.toContain('overflow-y-auto');
  });

  it('slotted content projects into the surface', async () => {
    const body = await render({}, { default: '<ul><li>One</li></ul>' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.textContent).toContain('One');
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render({}, { default: '<p>Body</p>' });
    await assertAxeClean(body);
  });
});
