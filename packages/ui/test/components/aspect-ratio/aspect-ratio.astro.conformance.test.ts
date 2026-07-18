/**
 * Astro performance of the AspectRatio score. AspectRatio is a PURE STATIC --
 * the score projects no ARIA, holds no state, runs no effects -- so its Astro
 * file ships NO <script> and there is NO bindAspectRatio. This test renders the
 * server markup and asserts the one contract a static box carries: the root
 * region, the shared base classes, the ratio painted on the inline style
 * channel, and axe cleanliness. One score, three performances; here the
 * performance is markup + classes + slot, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import AspectRatio from '../../../src/components/aspect-ratio/aspect-ratio.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

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
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('relative w-full');
    // Astro escapes the `&` in the `[&>*]:` variant selectors to `&#38;`; a real
    // browser decodes it, but happy-dom's innerHTML parser leaves numeric
    // entities intact, so decode before asserting the child-fill classes.
    const decoded = root.className.replaceAll('&#38;', '&');
    expect(decoded).toContain('[&>*]:absolute');
  });

  it('projects NO ARIA: the root is a pure static box (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('defaults a missing ratio to 1 on the inline style channel', async () => {
    const body = await render({});
    const root = partElement(body, 'root') as HTMLElement;
    expect(paintedRatio(root)).toBe('1');
  });

  it('paints the supplied ratio through the one inline style channel', async () => {
    const body = await render({ ratio: 16 / 9 });
    const root = partElement(body, 'root') as HTMLElement;
    expect(paintedRatio(root)).toBe(String(16 / 9));
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'rounded-lg' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('relative w-full');
    expect(root.className).toContain('rounded-lg');
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render();
    await assertAxeClean(body);
  });
});
