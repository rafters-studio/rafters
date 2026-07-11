/**
 * Astro render adapter + the static-tier breadcrumb conformance suite
 * (Spec 01 testing obligations; breadcrumb.astro's docblock). Sub-parts
 * render to strings and compose as slot content, the same technique as
 * grid.astro.conformance.test.ts (GridItem) and
 * navigation-menu.astro.conformance.test.ts (Item/Link).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';
import BreadcrumbEllipsis from '../../../src/components/breadcrumb/breadcrumb-ellipsis.astro';
import BreadcrumbItem from '../../../src/components/breadcrumb/breadcrumb-item.astro';
import BreadcrumbLink from '../../../src/components/breadcrumb/breadcrumb-link.astro';
import BreadcrumbList from '../../../src/components/breadcrumb/breadcrumb-list.astro';
import BreadcrumbPage from '../../../src/components/breadcrumb/breadcrumb-page.astro';
import BreadcrumbSeparator from '../../../src/components/breadcrumb/breadcrumb-separator.astro';
import Breadcrumb from '../../../src/components/breadcrumb/breadcrumb.astro';
import { breadcrumb } from '../../../src/components/breadcrumb/breadcrumb.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderTo(
  Component: Parameters<typeof AstroContainer.prototype.renderToString>[0],
  props: Record<string, unknown>,
  slot: string,
): Promise<string> {
  const astroContainer = await AstroContainer.create();
  return astroContainer.renderToString(Component, { props, slots: { default: slot } });
}

/** No `slots` key at all -- passing an empty string slot would make
 *  `Astro.slots.has('default')` true and suppress the default chevron. */
async function renderDefaultSeparator(): Promise<string> {
  const astroContainer = await AstroContainer.create();
  return astroContainer.renderToString(BreadcrumbSeparator, { props: {} });
}

async function renderBreadcrumb(
  listInner: string,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const list = await astroContainer.renderToString(BreadcrumbList, {
    props: {},
    slots: { default: listInner },
  });
  const html = await astroContainer.renderToString(Breadcrumb, { props, slots: { default: list } });
  document.body.innerHTML = html;
  return document.body;
}

/** A standard three-crumb trail: two links, one current page. */
async function trail(): Promise<string> {
  const home = await renderTo(BreadcrumbLink, { href: '/' }, 'Home');
  const homeItem = await renderTo(BreadcrumbItem, {}, home);
  const sep1 = await renderDefaultSeparator();

  const products = await renderTo(BreadcrumbLink, { href: '/products' }, 'Products');
  const productsItem = await renderTo(BreadcrumbItem, {}, products);
  const sep2 = await renderDefaultSeparator();

  const page = await renderTo(BreadcrumbPage, {}, 'Widget');
  const pageItem = await renderTo(BreadcrumbItem, {}, page);

  return homeItem + sep1 + productsItem + sep2 + pageItem;
}

describe('breadcrumb conformance [astro]', () => {
  it('nav aria-label="Breadcrumb" by default; contract fulfillment on root', async () => {
    const body = await renderBreadcrumb(await trail());
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('nav');

    const config = {};
    const state = breadcrumb.initialState(config);
    assertContractFulfillment(breadcrumb, body, state, config, ['root']);
    await assertAxeClean(body);
  });

  it('an explicit ariaLabel overrides the default accessible name', async () => {
    const body = await renderBreadcrumb(await trail(), { ariaLabel: 'You are here' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('You are here');
  });

  it('links are navigable; the current page is a non-navigable pseudo-link', async () => {
    const body = await renderBreadcrumb(await trail());

    const links = body.querySelectorAll('a[href]');
    expect(links).toHaveLength(2);
    expect(links[0]?.textContent?.trim()).toBe('Home');
    expect(links[1]?.textContent?.trim()).toBe('Products');

    const current = body.querySelector('a:not([href])') as HTMLElement;
    expect(current.textContent?.trim()).toBe('Widget');
    expect(current.getAttribute('role')).toBe('link');
    expect(current.getAttribute('aria-disabled')).toBe('true');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('current is declared by which component renders, not by position: an interior crumb can be current', async () => {
    const section = await renderTo(BreadcrumbPage, {}, 'Section');
    const sectionItem = await renderTo(BreadcrumbItem, {}, section);
    const sep = await renderDefaultSeparator();
    const detail = await renderTo(BreadcrumbLink, { href: '/detail' }, 'Detail');
    const detailItem = await renderTo(BreadcrumbItem, {}, detail);

    const body = await renderBreadcrumb(sectionItem + sep + detailItem);
    const current = body.querySelector('[aria-current="page"]') as HTMLElement;
    expect(current.textContent?.trim()).toBe('Section');
    expect(body.querySelectorAll('a[href]')).toHaveLength(1);
  });

  it('separators are decorative and hidden from assistive tech, default chevron', async () => {
    const body = await renderBreadcrumb(await trail());
    const separators = body.querySelectorAll('li[role="presentation"][aria-hidden="true"]');
    expect(separators).toHaveLength(2);
    expect(separators[0]?.querySelector('svg')).not.toBeNull();
  });

  it('a custom separator slot overrides the default chevron', async () => {
    const custom = await renderTo(BreadcrumbSeparator, {}, '/');
    document.body.innerHTML = custom;
    const separator = document.body.querySelector('li[role="presentation"]') as HTMLElement;
    expect(separator.textContent?.trim()).toBe('/');
    expect(separator.querySelector('svg')).toBeNull();
  });

  it('an ellipsis marker is presentational, hidden, no interactive affordance', async () => {
    const ellipsisMarkup = await renderTo(BreadcrumbEllipsis, {}, '');
    const ellipsisItem = await renderTo(BreadcrumbItem, {}, ellipsisMarkup);
    const home = await renderTo(BreadcrumbLink, { href: '/' }, 'Home');
    const homeItem = await renderTo(BreadcrumbItem, {}, home);

    const body = await renderBreadcrumb(homeItem + ellipsisItem);
    const ellipsis = body.querySelector('[role="presentation"]:not(li)') as HTMLElement;
    expect(ellipsis).not.toBeNull();
    expect(ellipsis.tagName.toLowerCase()).toBe('div');
    expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
    expect(ellipsis.querySelector('svg')).not.toBeNull();
    expect(ellipsis.querySelector('.sr-only')).toBeNull();
    await assertAxeClean(body);
  });

  it('consumer class merges via classy on the root', async () => {
    const body = await renderBreadcrumb(await trail(), { class: 'mt-2' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain('mt-2');
  });
});
