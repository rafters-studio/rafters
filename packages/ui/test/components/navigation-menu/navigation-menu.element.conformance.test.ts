/**
 * WC performance of the navigation-menu score, driven end to end against
 * light-DOM markup. Same score as the React conformance test -- the only
 * difference is the controller applies the projection imperatively.
 *
 * WHAT CHANGED AT #2148: the panel is never `hidden` and there is no
 * hover-intent timer. The open axis observable here is `data-state`; the visual
 * half lives in navigation-menu.classes.ts and test/motion/hover-reveal.e2e.ts.
 */
import { cleanup } from '@testing-library/react';
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

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-navigation-menu>
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
/** The panel's open axis is `data-state` now; `hidden` is gone for good. */
const state = (value: string) => content(value).getAttribute('data-state');

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('navigation-menu conformance [wc]', () => {
  it('closed: content crawlable and NEVER hidden, aria wired by real ids', async () => {
    await mount();
    expect(content('products').hasAttribute('hidden')).toBe(false);
    expect(state('products')).toBe('closed');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
    expect(trigger('products').getAttribute('aria-controls')).toBe('c-products');
    expect(content('products').getAttribute('aria-labelledby')).toBe('t-products');
  });

  it('host adopts the data-part=root marker the dismissal rule is scoped by', async () => {
    const host = await mount();
    expect(host.dataset['part']).toBe('root');
  });

  it('per-instance ARIA equals the score projection, closed and open', async () => {
    const user = userEvent.setup();
    const root = await mount();
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
    expect(state('products')).toBe('open');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');

    await user.click(trigger('docs'));
    expect(state('products')).toBe('closed');
    expect(state('docs')).toBe('open');

    await user.click(trigger('docs'));
    expect(state('docs')).toBe('closed');
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
    expect(state('products')).toBe('open');
  });

  it('Escape closes, returns focus to the trigger, and raises data-dismissed', async () => {
    const user = userEvent.setup();
    const host = await mount();
    await user.click(trigger('products'));
    (content('products').querySelector('a') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(state('products')).toBe('closed');
    expect(document.activeElement).toBe(trigger('products'));
    // The refocus puts focus back INSIDE the item, so `:focus-within` still
    // matches -- only the dismissal flag can force the panel back down, and it
    // is also what stops the refocus from reopening the score (WCAG 1.4.13).
    expect(host.dataset['dismissed']).toBe('true');
  });

  it('a deliberate reopen clears the dismissal', async () => {
    const user = userEvent.setup();
    const host = await mount();
    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(host.dataset['dismissed']).toBe('true');
    await user.keyboard('{ArrowDown}');
    expect(host.dataset['dismissed']).toBeUndefined();
    expect(state('products')).toBe('open');
  });

  it('hover opens the panel IMMEDIATELY -- the intent wait is the transition', async () => {
    // The hover-intent delay is the panel's transition-delay now, so the score
    // moves on the event and assistive tech is never behind the gesture.
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger('products'));
    expect(state('products')).toBe('open');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('true');
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    await user.click(outside);
    expect(state('products')).toBe('closed');
  });
});
