/**
 * Astro performance of the NavigationMenu score, driven end to end.
 * AstroContainer renders the SSR markup with the initial (closed) projection
 * already applied -- content present-but-hidden so links stay crawlable -- but
 * does NOT run the <script>, so the test calls bindNavigationMenu directly --
 * that IS the script's job -- then drives the same score the React and WC
 * performances drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import NavigationMenu from '../../../src/components/navigation-menu/navigation-menu.astro';
import { bindNavigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';

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

async function mount(): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(NavigationMenu, { props: { id: 'nav', items } });
  document.body.innerHTML = html;
  const root = document.body.querySelector('nav[data-part="root"]') as HTMLElement;
  bindNavigationMenu(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;

describe('navigation-menu conformance [astro]', () => {
  it('SSR closed: content hidden but present in the DOM (crawlable), triggers collapsed', async () => {
    await mount();
    expect(content('products').hidden).toBe(true);
    expect(content('company').hidden).toBe(true);
    // Links are in the DOM even while closed -- SSR-stable and crawlable.
    expect(content('products').querySelector('a[href="/a"]')).not.toBeNull();
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });

  it('click opens a panel: content shown, trigger expanded', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(content('products').hidden).toBe(false);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking a second trigger switches which panel is open', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    await user.click(trigger('company'));
    expect(content('company').hidden).toBe(false);
    expect(content('products').hidden).toBe(true);
    expect(trigger('company').getAttribute('aria-expanded')).toBe('true');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the open panel', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(content('products').hidden).toBe(false);
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(content('products').hidden).toBe(true);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });
});
