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
/** The WCAG dismissal flag lives on the dismissed PANEL, not on the root. */
const dismissed = (value: string) => content(value).dataset['dismissed'];

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

  it('host adopts the data-part=root marker the score projects onto', async () => {
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
    await mount();
    await user.click(trigger('products'));
    (content('products').querySelector('a') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(state('products')).toBe('closed');
    expect(document.activeElement).toBe(trigger('products'));
    // The refocus puts focus back INSIDE the item, so `:focus-within` still
    // matches -- only the dismissal flag can force the panel back down, and it
    // is also what stops the refocus from reopening the score (WCAG 1.4.13).
    expect(dismissed('products')).toBe('true');
    // ...on THAT panel alone. Root-scoped it blanked the whole bar.
    expect(dismissed('docs')).toBeUndefined();
  });

  it('a click that CLOSES raises the dismissal too -- focus is still on the trigger', async () => {
    // Enter/Space reach the same handler (a native button fulfils them as a
    // click), so this is the keyboard close path as well. Without the flag the
    // item still matches `:focus-within` and the panel would stay visible with
    // data-state="closed".
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    expect(dismissed('products')).toBeUndefined();

    await user.click(trigger('products'));
    expect(state('products')).toBe('closed');
    expect(dismissed('products')).toBe('true');

    // ...and a third click reopens, clearing it again.
    await user.click(trigger('products'));
    expect(state('products')).toBe('open');
    expect(dismissed('products')).toBeUndefined();
  });

  it('a deliberate reopen clears the dismissal', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(dismissed('products')).toBe('true');
    await user.keyboard('{ArrowDown}');
    expect(dismissed('products')).toBeUndefined();
    expect(state('products')).toBe('open');
  });

  it('a dismissal leaves the SIBLING item live, and itself dismissed', async () => {
    // The dead zone the root-scoped flag created: after Escape the hover guard
    // refused every trigger and the CSS force-hide covered every panel, so the
    // whole bar was inert until the pointer left it.
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');

    await user.hover(trigger('docs'));
    expect(state('docs')).toBe('open');
    // ...and the dismissed panel keeps its own flag, because Escape left focus
    // on ITS trigger: `:focus-within` is still matching there, so dropping the
    // flag would bring the dismissed panel back up beside the hovered one.
    expect(dismissed('products')).toBe('true');
    expect(state('products')).toBe('closed');

    // And re-entering the dismissed item does NOT undo the dismissal while it
    // still stands: scoping the flag must not weaken it.
    await mount();
    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');
    await user.hover(trigger('products'));
    expect(state('products')).toBe('closed');
    expect(dismissed('products')).toBe('true');
  });

  it('the dismissal survives a pointer leave while the trigger still holds focus', async () => {
    // The WCAG 1.4.13 regression. Clearing the flag unconditionally when the
    // pointer left the bar re-revealed the panel the user had just dismissed:
    // Escape returns focus to the trigger, so `:focus-within` was still
    // matching and the unflagged panel came back at opacity 1 and hit-testable
    // against `data-state="closed"` / `aria-expanded="false"`.
    const user = userEvent.setup();
    const host = await mount();
    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(dismissed('products')).toBe('true');
    expect(document.activeElement).toBe(trigger('products'));

    host.dispatchEvent(new Event('pointerleave'));
    expect(dismissed('products')).toBe('true');
    expect(state('products')).toBe('closed');
    expect(trigger('products').getAttribute('aria-expanded')).toBe('false');
  });

  it('the dismissal settles once focus leaves too -- no dead item left behind', async () => {
    // The other side of the guard: a flag outliving every reveal condition
    // would leave the item refusing to open on the next hover.
    const user = userEvent.setup();
    const host = await mount();
    const outside = document.createElement('button');
    outside.type = 'button';
    document.body.appendChild(outside);

    await user.click(trigger('products'));
    trigger('products').focus();
    await user.keyboard('{Escape}');
    expect(dismissed('products')).toBe('true');

    host.dispatchEvent(new Event('pointerleave'));
    outside.focus();
    expect(dismissed('products')).toBeUndefined();
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
