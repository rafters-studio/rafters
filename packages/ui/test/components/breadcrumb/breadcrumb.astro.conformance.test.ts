/**
 * Astro performance of the Breadcrumb score. Breadcrumb is a PURE STATIC --
 * the score projects no ARIA, holds no state, runs no effects -- so its Astro
 * file ships NO <script> and there is NO bindBreadcrumb. This test renders the
 * server markup and asserts the one contract a static landmark can carry: the
 * nav[aria-label="Breadcrumb"] root, the slotted trail's earned semantics
 * (aria-current on the current page, aria-hidden on separators), and axe
 * cleanliness. One score, three performances; here it is markup + slots.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Breadcrumb from '../../../src/components/breadcrumb/breadcrumb.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

// The consumer composes plain semantic children into the default slot; the
// Astro performance owns only the nav landmark. This is the settled trail
// markup a consumer would slot in.
const TRAIL = `
  <ol class="flex flex-wrap items-center gap-1.5">
    <li class="inline-flex items-center gap-1.5"><a href="/">Home</a></li>
    <li role="presentation" aria-hidden="true">/</li>
    <li class="inline-flex items-center gap-1.5">
      <span role="link" aria-disabled="true" aria-current="page">Widget</span>
    </li>
  </ol>
`;

async function render(
  props: Record<string, unknown> = {},
  slot: string = TRAIL,
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Breadcrumb, { props, slots: { default: slot } });
  document.body.innerHTML = html;
  return document.body;
}

describe('breadcrumb conformance [astro]', () => {
  it('the root IS the nav landmark labelled "Breadcrumb"', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Breadcrumb');
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

  it('slotted trail keeps its earned semantics: current page and hidden separator', async () => {
    const body = await render();
    const page = body.querySelector('[aria-current="page"]') as HTMLElement;
    expect(page.getAttribute('role')).toBe('link');
    expect(page.getAttribute('aria-disabled')).toBe('true');
    expect(body.querySelector('li[role="presentation"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('consumer class merges onto the nav via classy', async () => {
    const body = await render({ class: 'mb-4' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('mb-4');
  });

  it('is axe-clean -- the nav is its own landmark', async () => {
    const body = await render();
    await assertAxeClean(body);
  });
});
