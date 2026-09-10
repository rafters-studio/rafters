/**
 * Ported conformance for Empty, Astro target. Empty is a PURE STATIC -- the
 * score projects no ARIA, holds no state, runs no effects -- so its Astro
 * file ships NO <script> and there is NO bindEmpty. This renders the server
 * markup and asserts the one contract a static placeholder can carry: the
 * root part, the named-slot structure with its data-slot markers.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, test, vi } from 'vitest';
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
  // A placeholder is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

test('renders a root part carrying the shared centered-column classes', async () => {
  const body = await render();
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
  expect(root).not.toBeNull();
  expect(root.className).toContain('flex flex-col');
  expect(root.className).toContain('items-center');
  expect(root.className).toContain('py-12');
});

test('projects no aria: the root is a pure static placeholder (no role)', async () => {
  const body = await render();
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.getAttribute('role')).toBeNull();
});

test('root is the only declared part -- sub-wrappers carry classes, not data-part', async () => {
  const body = await render();
  const parts = body.querySelectorAll('[data-part]');
  expect(parts).toHaveLength(1);
});

test('consumer class is discarded silently -- not merged onto the root', async () => {
  const warn = vi.spyOn(console, 'warn');
  const error = vi.spyOn(console, 'error');
  const body = await render({ class: 'mt-4' });
  const root = body.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.className).toContain('flex flex-col');
  expect(root.className).not.toContain('mt-4');
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

test('exposes the icon/title/description/action named-slot regions', async () => {
  const body = await render();
  expect(body.querySelector('[data-slot="empty-icon"]')).not.toBeNull();
  expect(body.querySelector('[data-slot="empty-title"]')).not.toBeNull();
  expect(body.querySelector('[data-slot="empty-description"]')).not.toBeNull();
  expect(body.querySelector('[data-slot="empty-action"]')).not.toBeNull();
});

test('slotted content projects into its region', async () => {
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
