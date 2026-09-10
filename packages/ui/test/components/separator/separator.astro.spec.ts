/**
 * Astro performance of the Separator score. Separator is a static score -- the
 * role/orientation projection is a pure function of config -- so its Astro file
 * ships NO <script> and there is NO bindSeparator. This test renders the server
 * markup and asserts the one contract a rule carries: the root part, the
 * resolved role/aria-orientation projection, and the orientation axis switch.
 * `decorative` is a plain boolean prop default true.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Separator from '../../../src/components/separator/separator.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Separator, { props });
  document.body.innerHTML = `<main><p>Above</p>${html}<p>Below</p></main>`;
  return document.body;
}

function root(body: HTMLElement): HTMLElement {
  const el = body.querySelector<HTMLElement>('[data-part="root"]');
  if (!el) throw new Error('no [data-part="root"] rendered');
  return el;
}

describe('separator [astro]', () => {
  it('renders a root rule carrying the shared classes', async () => {
    const el = root(await render());
    expect(el).not.toBeNull();
    expect(el.className).toContain('shrink-0');
    expect(el.className).toContain('bg-border');
    expect(el.className).toContain('h-px w-full');
  });

  it('is decorative by default: role="none", no aria-orientation', async () => {
    const el = root(await render());
    expect(el.getAttribute('role')).toBe('none');
    expect(el.hasAttribute('aria-orientation')).toBe(false);
  });

  it('opting out projects a semantic separator carrying aria-orientation', async () => {
    const el = root(await render({ decorative: false, orientation: 'vertical' }));
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('orientation flips the visual axis through the same projection', async () => {
    const el = root(await render({ orientation: 'vertical' }));
    expect(el.className).toContain('h-full w-px');
    expect(el.className).not.toContain('h-px w-full');
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const el = root(await render({ class: 'mx-4' }));
    expect(el.className).toContain('shrink-0');
    expect(el.className).not.toContain('mx-4');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('root is the only declared part -- a rule has no content or sub-parts', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });
});
