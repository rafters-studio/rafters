/**
 * Astro performance of the NavigationMenu score, driven end to end.
 * AstroContainer renders the SSR markup with the initial (closed) projection
 * already applied -- content present, never `hidden`, so links stay crawlable
 * AND the stylesheet's :hover / :focus-within reveal can reach them on a JS-off
 * page (#2148) -- but does NOT run the <script>, so the test calls
 * bindNavigationMenu directly -- that IS the script's job -- then drives the
 * same score the React and WC performances drive. One score, three
 * performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import NavigationMenu from '../../../src/components/navigation-menu/navigation-menu.astro';
import {
  bindNavigationMenu,
  navigationMenu,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';
import {
  assertConfigTravelsAsData,
  assertInstanceAriaFulfillment,
} from '../../harness/conformance';

const items = [
  {
    value: 'products',
    label: 'Products',
    links: [
      { href: '/a', label: 'Alpha' },
      { href: '/b', label: 'Beta' },
    ],
  },
  {
    value: 'company',
    label: 'Company',
    links: [{ href: '/c', label: 'Careers' }],
  },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(NavigationMenu, { props: { id: 'nav', items, ...props } });
}

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  document.body.innerHTML = await render(props);
  const root = document.body.querySelector('nav[data-part="root"]') as HTMLElement;
  bindNavigationMenu(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;
/** The panel's open axis is `data-state` now; `hidden` is gone for good. */
const state = (value: string) => content(value).getAttribute('data-state');

describe('navigation-menu conformance [astro]', () => {
  it('SSR closed: content present, crawlable, and NEVER hidden', async () => {
    document.body.innerHTML = await render();
    expect(state('products')).toBe('closed');
    expect(content('products').hasAttribute('hidden')).toBe(false);
    expect(content('company').hasAttribute('hidden')).toBe(false);
    // Links are in the DOM even while closed -- SSR-stable and crawlable.
    expect(content('products').querySelector('a[href="/a"]')).not.toBeNull();
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });

  it('SSR carries the panel open cell and NO delay on close', async () => {
    const html = await render();
    // The open cell's delay reaches the page as a class candidate...
    expect(html).toMatch(/delay-hover-intent/);
    // ...and the close cell carries no delay generic at all, per motion.jsonl.
    expect(html).not.toMatch(/delay-linger/);
    expect(html).not.toMatch(/delay-skip/);
    // No delay config attribute survives either.
    expect(html).not.toContain('data-delay-duration');
  });

  it('per-instance ARIA equals the score projection, closed (SSR) and open', async () => {
    const user = userEvent.setup();
    const root = await mount();
    // SSR-rendered markup already carries the closed projection.
    assertInstanceAriaFulfillment(navigationMenu, root, { active: null, pointerOpened: false }, {});
    await user.click(trigger('products'));
    assertInstanceAriaFulfillment(
      navigationMenu,
      root,
      { active: 'products', pointerOpened: false },
      {},
    );
  });

  it('click opens a panel: content shown, trigger expanded', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking a second trigger switches which panel is open', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    await user.click(trigger('company'));
    expect(state('company')).toBe('open');
    expect(state('products')).toBe('closed');
    expect(trigger('company').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the open panel and raises the dismissal flag', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(state('products')).toBe('closed');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
    // Focus is back on the trigger, so `:focus-within` still matches the item --
    // only the flag can force the panel down (WCAG 1.4.13). It is raised on the
    // dismissed PANEL: root-scoped it blanked every panel in the bar at once.
    expect(content('products').dataset['dismissed']).toBe('true');
    expect(content('company').dataset['dismissed']).toBeUndefined();

    // ...so the sibling still answers a hover while the dismissal stands.
    await user.hover(trigger('company'));
    expect(state('company')).toBe('open');
  });

  // The #2001 pairing: config is data-* in the markup AND read through dataset
  // in the bind. `orientation` is not valid on a <nav>; timing is no longer
  // config at all (#2148), so `orientation` is the only thing left to carry.
  it('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
    const user = userEvent.setup();
    const root = await mount();

    assertConfigTravelsAsData(root, { orientation: 'horizontal' });
    expect(root.hasAttribute('data-delay-duration')).toBe(false);

    // Rehydration: opening is wired only by bindNavigationMenu, which built its
    // config from dataset alone.
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });
});
