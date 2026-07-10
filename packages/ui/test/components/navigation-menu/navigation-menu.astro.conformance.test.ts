/**
 * Astro render adapter + the static-tier subset of the navigation-menu
 * conformance suite (Spec 01 testing obligations; navigation-menu.astro's
 * docblock). Only the React suite's "closed" scenarios transfer: click,
 * roving-focus, ArrowDown-open, Escape, dismiss-on-outside, and hover-intent
 * are all effects or dispatch loops this tier does not have (Spec 03), so
 * navigation-menu.astro never opens an item -- dropped along with the
 * interaction, not skip-registered. Viewport/Indicator are dropped
 * entirely: both only render while open or forceMount, and this tier's
 * `open` is never true.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import NavigationMenuItem from '../../../src/components/navigation-menu/navigation-menu-item.astro';
import NavigationMenuLink from '../../../src/components/navigation-menu/navigation-menu-link.astro';
import NavigationMenuList from '../../../src/components/navigation-menu/navigation-menu-list.astro';
import NavigationMenu from '../../../src/components/navigation-menu/navigation-menu.astro';
import {
  navContentAria,
  navigationMenu,
  navTriggerAria,
  type NavigationMenuConfig,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function renderLink(props: Record<string, unknown>, slot: string): Promise<string> {
  const astroContainer = await AstroContainer.create();
  return astroContainer.renderToString(NavigationMenuLink, { props, slots: { default: slot } });
}

async function renderItem(
  value: string,
  label: string,
  content: string,
  props: Record<string, unknown> = {},
): Promise<string> {
  const astroContainer = await AstroContainer.create();
  return astroContainer.renderToString(NavigationMenuItem, {
    props: { value, ...props },
    slots: { default: content, trigger: label },
  });
}

async function renderMenu(
  items: string,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const list = await astroContainer.renderToString(NavigationMenuList, {
    props,
    slots: { default: items },
  });
  const html = await astroContainer.renderToString(NavigationMenu, {
    props,
    slots: { default: list },
  });
  document.body.innerHTML = html;
  return document.body;
}

function triggerFor(body: HTMLElement, value: string): HTMLElement {
  const element = body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
  if (!element) throw new Error(`no trigger for ${value}`);
  return element;
}

function contentFor(body: HTMLElement, value: string): HTMLElement {
  const element = body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`);
  if (!element) throw new Error(`no content for ${value}`);
  return element;
}

describe('navigation-menu conformance [astro]', () => {
  it('closed panels: bar, triggers, and content all render -- crawlable, none open', async () => {
    const links = await renderLink({ href: '/one' }, 'One');
    const products = await renderItem('products', 'Products', links);
    const body = await renderMenu(products);

    const config: NavigationMenuConfig = { orientation: 'horizontal' };
    const state = navigationMenu.initialState(config);
    assertContractFulfillment(navigationMenu, body, state, config, ['root', 'list']);

    expect(contentFor(body, 'products').hidden).toBe(true);
    expect(contentFor(body, 'products').getAttribute('data-state')).toBe('closed');
    expect(triggerFor(body, 'products').getAttribute('aria-expanded')).toBe('false');
    expect(partElement(body, 'root')?.getAttribute('aria-label')).toBe('Main navigation');
    await assertAxeClean(body);
  });

  it('trigger and content are wired by real, correlated ids', async () => {
    const links = await renderLink({ href: '/one' }, 'One');
    const products = await renderItem('products', 'Products', links);
    const body = await renderMenu(products);

    const trigger = triggerFor(body, 'products');
    const content = contentFor(body, 'products');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('trigger aria matches the score projection exactly (score-derived, not hand-authored)', async () => {
    const links = await renderLink({ href: '/one' }, 'One');
    const products = await renderItem('products', 'Products', links);
    const body = await renderMenu(products);

    const config: NavigationMenuConfig = {};
    const state = navigationMenu.initialState(config);
    const trigger = triggerFor(body, 'products');
    const content = contentFor(body, 'products');
    const expectedTrigger = navTriggerAria('products', state, config, { contentId: content.id });
    const expectedContent = navContentAria('products', state, config, { triggerId: trigger.id });
    for (const [attr, value] of Object.entries(expectedTrigger)) {
      expect(trigger.getAttribute(attr)).toBe(String(value));
    }
    expect(content.getAttribute('data-state')).toBe(String(expectedContent['data-state']));
    expect(content.hasAttribute('hidden')).toBe(true);
  });

  it('data-roving-item and aria-haspopup are dropped -- no machinery to back them', async () => {
    const links = await renderLink({ href: '/one' }, 'One');
    const products = await renderItem('products', 'Products', links);
    const body = await renderMenu(products);
    const trigger = triggerFor(body, 'products');
    expect(trigger.hasAttribute('data-roving-item')).toBe(false);
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('multiple items each render trigger + content, independently addressable', async () => {
    const productsLinks = await renderLink({ href: '/one' }, 'One');
    const docsLinks = await renderLink({ href: '/docs' }, 'Docs home');
    const products = await renderItem('products', 'Products', productsLinks);
    const docs = await renderItem('docs', 'Docs', docsLinks);
    const body = await renderMenu(products + docs);

    expect(triggerFor(body, 'products').textContent?.trim()).toBe('Products');
    expect(triggerFor(body, 'docs').textContent?.trim()).toBe('Docs');
    expect(contentFor(body, 'products').querySelector('a')?.getAttribute('href')).toBe('/one');
    expect(contentFor(body, 'docs').querySelector('a')?.getAttribute('href')).toBe('/docs');
  });

  it('orientation projects data-orientation onto root and list', async () => {
    const links = await renderLink({ href: '/one' }, 'One');
    const products = await renderItem('products', 'Products', links);
    const body = await renderMenu(products, { orientation: 'vertical' });
    expect(partElement(body, 'root')?.getAttribute('data-orientation')).toBe('vertical');
    expect(partElement(body, 'list')?.getAttribute('data-orientation')).toBe('vertical');
  });

  it('link: data-active passes through from the consumer, not derived', async () => {
    const astroContainer = await AstroContainer.create();
    const html = await astroContainer.renderToString(NavigationMenuLink, {
      props: { href: '/here', active: true },
      slots: { default: 'Here' },
    });
    document.body.innerHTML = html;
    const link = document.body.querySelector('a[href="/here"]');
    expect(link?.hasAttribute('data-active')).toBe(true);
    expect(link?.textContent?.trim()).toBe('Here');
  });

  it('link: no active prop leaves data-active absent', async () => {
    const astroContainer = await AstroContainer.create();
    const html = await astroContainer.renderToString(NavigationMenuLink, {
      props: { href: '/there' },
      slots: { default: 'There' },
    });
    document.body.innerHTML = html;
    const link = document.body.querySelector('a[href="/there"]');
    expect(link?.hasAttribute('data-active')).toBe(false);
  });
});
