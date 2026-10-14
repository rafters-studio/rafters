/**
 * Astro BreadcrumbLink and BreadcrumbPage: the decorative start and end icon
 * slots. Rendered with no script run, so each wrapper already carries
 * aria-hidden="true" in the server markup.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import BreadcrumbLink from '../../../src/components/breadcrumb/breadcrumb-link.astro';
import BreadcrumbPage from '../../../src/components/breadcrumb/breadcrumb-page.astro';
import { ICON_SVG_16 } from './icon-layout';

afterEach(() => {
  document.body.innerHTML = '';
});

const LABEL = '<span data-label>Home</span>';

async function render(
  component: typeof BreadcrumbLink | typeof BreadcrumbPage,
  slots: Record<string, string>,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, {
    props,
    slots: { default: LABEL, ...slots },
  });
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe('breadcrumb icons [astro]', () => {
  it('start, end and both render beside the label, aria-hidden in the server markup', async () => {
    for (const component of [BreadcrumbLink, BreadcrumbPage]) {
      const el = await render(component, {
        'start-icon': ICON_SVG_16,
        'end-icon': ICON_SVG_16,
      });
      const start = el.querySelector('[data-part="startIcon"]');
      const end = el.querySelector('[data-part="endIcon"]');
      expect(start?.getAttribute('aria-hidden')).toBe('true');
      expect(start?.getAttribute('data-icon')).toBe('inline-start');
      expect(end?.getAttribute('aria-hidden')).toBe('true');
      expect(end?.getAttribute('data-icon')).toBe('inline-end');
      // Reading order in the markup: start wrapper, label, end wrapper. The
      // browser geometry (rtl, size) is measured in the React and WC specs.
      expect(el.firstElementChild).toBe(start);
      expect(el.lastElementChild).toBe(end);
      expect(el.querySelector('[data-label]')).not.toBeNull();
    }
  });

  it('start only and end only render just that wrapper; none renders neither', async () => {
    const startOnly = await render(BreadcrumbLink, { 'start-icon': ICON_SVG_16 });
    expect(startOnly.querySelector('[data-part="startIcon"]')).not.toBeNull();
    expect(startOnly.querySelector('[data-part="endIcon"]')).toBeNull();
    const endOnly = await render(BreadcrumbPage, { 'end-icon': ICON_SVG_16 });
    expect(endOnly.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(endOnly.querySelector('[data-part="endIcon"]')).not.toBeNull();
    const none = await render(BreadcrumbLink, {});
    expect(none.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('the page keeps its current-page marker; the link keeps its attributes', async () => {
    const page = await render(BreadcrumbPage, { 'start-icon': ICON_SVG_16 });
    expect(page.getAttribute('role')).toBe('link');
    expect(page.getAttribute('aria-disabled')).toBe('true');
    expect(page.getAttribute('aria-current')).toBe('page');
    const link = await render(BreadcrumbLink, {}, { href: '/products' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/products');
  });
});
