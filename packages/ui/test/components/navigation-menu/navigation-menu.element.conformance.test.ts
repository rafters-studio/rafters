/**
 * WC performance of the navigation-menu score, driven end to end against
 * light-DOM markup. Same score as the React conformance test -- the only
 * difference is the controller applies the projection imperatively.
 */
import { cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { navigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { RaftersNavigationMenu } from '../../../src/components/navigation-menu/navigation-menu.element';
import { assertInstanceAriaFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-navigation-menu')) {
    customElements.define('rafters-navigation-menu', RaftersNavigationMenu);
  }
});

async function mount(delayDuration = 1): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-navigation-menu data-delay-duration="${delayDuration}">
      <ul data-part="list">
        <li>
          <button type="button" data-part="trigger" data-value="products" data-roving-item id="t-products">Products</button>
          <div data-part="content" data-value="products" id="c-products"><a href="/one">One</a><a href="/two">Two</a></div>
        </li>
        <li>
          <button type="button" data-part="trigger" data-value="docs" data-roving-item id="t-docs">Docs</button>
          <div data-part="content" data-value="docs" id="c-docs"><a href="/docs">Docs home</a></div>
        </li>
      </ul>
    </rafters-navigation-menu>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-navigation-menu') as HTMLElement;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('navigation-menu conformance [wc]', () => {
  it('closed: content hidden and crawlable, aria wired by real ids', async () => {
    await mount();
    expect(content('products').hidden).toBe(true);
    expect(content('products').getAttribute('data-state')).toBe('closed');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
    expect(trigger('products').getAttribute('aria-controls')).toBe('c-products');
    expect(content('products').getAttribute('aria-labelledby')).toBe('t-products');
  });

  it('per-instance ARIA equals the score projection, closed and open', async () => {
    const user = userEvent.setup();
    const root = await mount();
    // The DOM-native binding writes hidden="true"; the harness asserts by
    // presence, so the same driver holds across React/WC/Astro.
    assertInstanceAriaFulfillment(navigationMenu, root, { active: null, pointerOpened: false }, {});
    await user.click(trigger('products'));
    assertInstanceAriaFulfillment(
      navigationMenu,
      root,
      { active: 'products', pointerOpened: false },
      {},
    );
  });

  it('click opens, click again closes, clicking another switches', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(content('products').hidden).toBe(false);
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');

    await user.click(trigger('docs'));
    expect(content('products').hidden).toBe(true);
    expect(content('docs').hidden).toBe(false);

    await user.click(trigger('docs'));
    expect(content('docs').hidden).toBe(true);
  });

  it('arrow keys rove focus across triggers with wrap', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('products').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('docs'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('products'));
  });

  it('ArrowDown opens the focused trigger on the horizontal axis', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('products').focus();
    await user.keyboard('{ArrowDown}');
    expect(content('products').hidden).toBe(false);
  });

  it('Escape closes and returns focus to the open trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    (content('products').querySelector('a') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(content('products').hidden).toBe(true);
    expect(document.activeElement).toBe(trigger('products'));
  });

  // The fixture's data-delay-duration is not decoration: it is the hover-intent
  // window the binding composes. This is the only test that spends it -- hover
  // must NOT open synchronously, and must open once the window elapses.
  it('hover opens the panel only after the configured delay elapses', async () => {
    const user = userEvent.setup();
    await mount(60);
    await user.hover(trigger('products'));
    // Still shut: the intent window has not elapsed, so hover is not a click.
    expect(content('products').hidden).toBe(true);
    await waitFor(() => expect(content('products').hidden).toBe(false));
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger('products'));
    expect(content('products').hidden).toBe(false);
    await user.click(outside);
    expect(content('products').hidden).toBe(true);
  });
});
