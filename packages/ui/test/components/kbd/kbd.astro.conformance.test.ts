/**
 * Astro performance of the Kbd score. Kbd is a PURE STATIC -- the score
 * projects no ARIA, holds no state, runs no effects -- so its Astro file ships
 * NO <script> and there is NO bindKbd. This test renders the server markup and
 * asserts the one contract a static cap can carry: the root <kbd> element, the
 * shared class string, slotted key text, and axe cleanliness. One score, three
 * performances; here the performance is markup + classes + slot, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Kbd from '../../../src/components/kbd/kbd.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}, slot = 'Enter'): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Kbd, { props, slots: { default: slot } });
  // A key cap is inline text, not a landmark; the page around it supplies the
  // region so the axe best-practice `region` rule is about the page, not the
  // cap -- the same wrapping card's Astro conformance uses.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('kbd conformance [astro]', () => {
  it('renders a <kbd> root cap carrying the shared classes', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('kbd');
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('ts-code-small');
  });

  it('projects NO ARIA: the root is a pure static cap (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('slotted key text projects into the cap', async () => {
    const body = await render({}, 'Cmd');
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.textContent).toContain('Cmd');
  });

  it('consumer class merges via classy', async () => {
    const body = await render({ class: 'ml-1' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('inline-flex');
    expect(root.className).toContain('ml-1');
  });

  it('is axe-clean scoped to the rendered cap', async () => {
    const body = await render();
    await assertAxeClean(body);
  });
});
