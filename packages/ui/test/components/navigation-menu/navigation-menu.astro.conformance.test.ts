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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NavigationMenu from '../../../src/components/navigation-menu/navigation-menu.astro';
import {
  bindNavigationMenu,
  navigationMenu,
} from '../../../src/components/navigation-menu/navigation-menu.behavior';
import {
  assertConfigTravelsAsData,
  assertInstanceAriaFulfillment,
} from '../../harness/conformance';
import { installMotionDelaySheet } from '../../harness/motion-sheet';

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

// The emitted token sheet is what a real page loads; bindNavigationMenu reads
// the hover-intent delay off it. Without it, the accessor fails loud on the
// missing sheet (#2132).
let uninstallMotionSheet: () => void = () => {};
beforeEach(() => {
  uninstallMotionSheet = installMotionDelaySheet();
});

afterEach(() => {
  document.body.innerHTML = '';
  uninstallMotionSheet();
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(NavigationMenu, {
    props: { id: 'nav', items, ...props },
  });
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

  // The #2001 pairing: config is data-* in the markup AND read through dataset
  // in the bind. Neither `orientation` nor `delay-duration` is valid on a <nav>.
  it('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
    const user = userEvent.setup();
    const root = await mount({ delayDuration: 120 });

    assertConfigTravelsAsData(root, { orientation: 'horizontal', delayDuration: '120' });

    // Rehydration: opening is wired only by bindNavigationMenu, which built its
    // config from dataset alone.
    await user.click(trigger('products'));
    expect(content('products').hidden).toBe(false);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });

  // #1995: an omitted delay must NOT be frozen into the markup. Absence is what
  // lets the binding read `--rafters-delay-hover-intent` at mount time.
  it('omits data-delay-duration when the author did not set one', async () => {
    const root = await mount();
    expect(root.dataset['delayDuration']).toBeUndefined();
    expect(root.hasAttribute('data-delay-duration')).toBe(false);
  });
});
