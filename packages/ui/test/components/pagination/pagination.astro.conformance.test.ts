/**
 * Astro performance of the Pagination score. Pagination is a PURE STATIC -- the
 * score projects no ARIA, holds no state, runs no effects -- so its Astro file
 * ships NO <script> and there is NO bindPagination. This test renders the
 * server markup and asserts the one contract a static landmark can carry: the
 * nav[aria-label="Pagination"] root, the slotted trail's earned semantics
 * (aria-current on the current page, aria-disabled on the boundary control,
 * aria-hidden on the ellipsis), and axe cleanliness. One score, three
 * performances; here it is markup + slots.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Pagination from '../../../src/components/pagination/pagination.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

// The consumer composes plain semantic children into the default slot; the
// Astro performance owns only the nav landmark. This is the settled trail
// markup a consumer would slot in: Previous disabled at the boundary, page 1
// the live current page, an ellipsis, and Next.
const TRAIL = `
  <ul class="flex flex-row items-center gap-1">
    <li><a href="/page/1" aria-label="Go to previous page" aria-disabled="true">Previous</a></li>
    <li><a href="/page/1" aria-current="page">1</a></li>
    <li><a href="/page/2">2</a></li>
    <li><span aria-hidden="true">...<span class="sr-only">More pages</span></span></li>
    <li><a href="/page/10">10</a></li>
    <li><a href="/page/2" aria-label="Go to next page">Next</a></li>
  </ul>
`;

async function render(
  props: Record<string, unknown> = {},
  slot: string = TRAIL,
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Pagination, { props, slots: { default: slot } });
  document.body.innerHTML = html;
  return document.body;
}

describe('pagination conformance [astro]', () => {
  it('the root IS the nav landmark labelled "Pagination"', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Pagination');
  });

  it('projects NO server-side ARIA beyond the fixed landmark label (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part -- the slotted family carries no data-part', async () => {
    const body = await render();
    expect(body.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('slotted trail keeps its earned semantics: live current page, disabled boundary, hidden ellipsis', async () => {
    const body = await render();
    const current = body.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.tagName.toLowerCase()).toBe('a');
    expect(current.getAttribute('href')).toBe('/page/1');
    expect(current.hasAttribute('aria-disabled')).toBe(false);
    const prev = body.querySelector('[aria-label="Go to previous page"]') as HTMLElement;
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(body.querySelector('span[aria-hidden="true"] .sr-only')?.textContent).toBe('More pages');
  });

  it('consumer class merges onto the nav via classy', async () => {
    const body = await render({ class: 'mt-4' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('mt-4');
  });

  it('is axe-clean -- the nav is its own landmark', async () => {
    const body = await render();
    await assertAxeClean(body);
  });
});
