/**
 * Astro performance of the AspectRatio score. AspectRatio is a PURE STATIC --
 * the score projects no ARIA, holds no state, runs no effects -- so its Astro
 * file ships NO <script> and there is NO bindAspectRatio. This test renders the
 * server markup and asserts the one contract a static box carries: the root
 * region, the shared base classes, and the ratio painted on the inline style
 * channel.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AspectRatio from '../../../src/components/aspect-ratio/aspect-ratio.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

function partElement(root: ParentNode, part: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/**
 * The painted proportion, normalised. A single-number `aspect-ratio` is the CSS
 * ratio `n / 1`, and the DOM serialises it that way; strip the `/ 1` so the
 * assertion reads the bare proportion the score resolved.
 */
function paintedRatio(el: HTMLElement): string {
  return el.style.getPropertyValue('aspect-ratio').replace(/\s*\/\s*1$/, '');
}

async function render(
  props: Record<string, unknown> = {},
  slot = '<img src="/photo.jpg" alt="Photo" />',
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(AspectRatio, { props, slots: { default: slot } });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('aspect-ratio conformance [astro]', () => {
  it('renders a root box carrying the shared base and child-fill classes', async () => {
    const doc = await render();
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('relative w-full');
    // Astro escapes the `&` in the `[&>*]:` variant selectors to `&#38;`; a real
    // browser decodes it, but happy-dom's innerHTML parser leaves numeric
    // entities intact, so decode before asserting the child-fill classes.
    const decoded = root.className.replaceAll('&#38;', '&');
    expect(decoded).toContain('[&>*]:absolute');
  });

  it('projects NO ARIA: the root is a pure static box (no role)', async () => {
    const doc = await render();
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const doc = await render();
    expect(doc.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('defaults a missing ratio to 1 on the inline style channel', async () => {
    const doc = await render({});
    const root = partElement(doc, 'root') as HTMLElement;
    expect(paintedRatio(root)).toBe('1');
  });

  it('paints the supplied ratio through the one inline style channel', async () => {
    const doc = await render({ ratio: 16 / 9 });
    const root = partElement(doc, 'root') as HTMLElement;
    expect(paintedRatio(root)).toBe(String(16 / 9));
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const doc = await render({ class: 'rounded-lg' });
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full');
    expect(root.className).not.toContain('rounded-lg');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
