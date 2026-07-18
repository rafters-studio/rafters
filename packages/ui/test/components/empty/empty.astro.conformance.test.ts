/**
 * Astro performance of the Empty score. Empty is a PURE STATIC -- the score
 * projects no ARIA, holds no state, runs no effects -- so its Astro file ships
 * NO <script> and there is NO bindEmpty. This test renders the server markup
 * and asserts the one contract a static placeholder can carry: the root part,
 * the named-slot structure with its data-slot markers, and axe cleanliness.
 * One score, three performances; here the performance is markup + classes +
 * slots, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import Empty from '../../../src/components/empty/empty.astro';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Empty, { props, slots });
  // A placeholder is not a landmark; the page around it supplies the region so
  // the axe best-practice `region` rule is satisfied.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('empty conformance [astro]', () => {
  it('renders a root part carrying the shared centered-column classes', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('flex flex-col');
    expect(root.className).toContain('items-center');
    expect(root.className).toContain('py-12');
  });

  it('projects NO ARIA: the root is a pure static placeholder (no role)', async () => {
    const body = await render();
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('root is the only declared part -- sub-wrappers carry classes, not data-part', async () => {
    const body = await render();
    const parts = body.querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('exposes the icon/title/description/action named-slot regions', async () => {
    const body = await render();
    expect(body.querySelector('[data-slot="empty-icon"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="empty-title"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="empty-description"]')).not.toBeNull();
    expect(body.querySelector('[data-slot="empty-action"]')).not.toBeNull();
  });

  it('slotted content projects into its region', async () => {
    const body = await render(
      {},
      {
        title: '<h3>No results found</h3>',
        description: 'Try another search',
      },
    );
    const title = body.querySelector('[data-slot="empty-title"]') as HTMLElement;
    expect(title.textContent).toContain('No results found');
    expect(
      (body.querySelector('[data-slot="empty-description"]') as HTMLElement).textContent,
    ).toContain('Try another search');
  });

  it('is axe-clean rendered inside a landmark', async () => {
    const body = await render(
      {},
      { title: '<h3>No results found</h3>', description: 'Try another search' },
    );
    await assertAxeClean(body);
  });
});
