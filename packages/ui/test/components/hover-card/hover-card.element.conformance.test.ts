/**
 * WC performance of the hover-card score, driven end to end against light-DOM
 * markup. Same score as the React conformance test.
 *
 * WHAT CHANGED AT #2148: presence is CONSTANT. The preview is never `hidden`
 * and never unmounted -- the stylesheet reveals it through
 * `[data-hover-card]:hover > [data-part=content]`, and this binding's remaining
 * job is to keep `data-state`, `aria-describedby`, and the WCAG dismissal flag
 * in step with the real gesture. There is no timer left to zero out, so nothing
 * here configures a delay.
 */
import { cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersHoverCard } from '../../../src/components/hover-card/hover-card.element';

beforeAll(() => {
  if (!customElements.get('rafters-hover-card')) {
    customElements.define('rafters-hover-card', RaftersHoverCard);
  }
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-hover-card data-part="root">
      <a href="#" data-part="trigger" id="hc-trigger" data-state="closed">@john</a>
      <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="closed">
        Software Engineer
      </div>
    </rafters-hover-card>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-hover-card') as HTMLElement;
}

const host = () => document.body.querySelector<HTMLElement>('rafters-hover-card')!;
const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const state = () => content().dataset['state'];

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('hover-card conformance [wc]', () => {
  it('host pins display:block to match the unclassed block root of the other targets', async () => {
    const element = await mount();
    expect(element.style.display).toBe('block');
  });

  it('host carries the data-hover-card marker the CSS reveal rule is scoped by', async () => {
    const element = await mount();
    expect(element.hasAttribute('data-hover-card')).toBe(true);
  });

  it('closed: content present and described, never hidden', async () => {
    await mount();
    expect(state()).toBe('closed');
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-describedby')).toBe('hc-content');
  });

  it('hover opens: data-state follows the gesture', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    expect(content().getAttribute('role')).toBe('dialog');
  });

  it('leaving the root closes the card', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    await user.unhover(host());
    expect(state()).toBe('closed');
  });

  it('Escape dismisses while the trigger is focused, and raises data-dismissed', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(state()).toBe('open');
    await user.keyboard('{Escape}');
    expect(state()).toBe('closed');
    expect(host().dataset['dismissed']).toBe('true');
  });

  it('hoverable content holds the card open: the root is the hover scope', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    // Trigger -> content never leaves the root. The LINGER on the way back out
    // is the stylesheet's transition-delay, not a JavaScript grace window.
    await user.hover(content());
    expect(state()).toBe('open');
    await user.unhover(host());
    expect(state()).toBe('closed');
  });

  it('Escape dismisses a default-open card that never received a hover/focus event', async () => {
    // Regression (shared bindHoverCard path, also drives Astro): a defaultOpen
    // card dismissed only through the retired hover primitive stayed open, since
    // no prior hover/focus had given the primitive state to close.
    document.body.innerHTML = `
      <rafters-hover-card data-part="root" data-default-open="true">
        <a href="#" data-part="trigger" id="hc-trigger" data-state="open">@john</a>
        <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="open">Software Engineer</div>
      </rafters-hover-card>`;
    await Promise.resolve();
    expect(state()).toBe('open');
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(state()).toBe('closed');
    expect(host().dataset['dismissed']).toBe('true');
  });
});
