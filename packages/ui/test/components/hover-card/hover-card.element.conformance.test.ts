/**
 * WC performance of the hover-card score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis) and the hover-intent timing (composed from the
 * hover-delay primitive) drive through the DOM binding. Delays are zeroed on the
 * element so intent resolves synchronously.
 */
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersHoverCard } from '../../../src/components/hover-card/hover-card.element';
import { resetHoverDelayState } from '../../../src/primitives/hover-delay';

beforeAll(() => {
  if (!customElements.get('rafters-hover-card')) {
    customElements.define('rafters-hover-card', RaftersHoverCard);
  }
});

async function mount(closeDelay = 0): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-hover-card data-part="root" data-open-delay="0" data-close-delay="${closeDelay}">
      <a href="#" data-part="trigger" id="hc-trigger" data-state="closed">@john</a>
      <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="closed" hidden>
        Software Engineer
      </div>
    </rafters-hover-card>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-hover-card') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  resetHoverDelayState();
});

describe('hover-card conformance [wc]', () => {
  it('host pins display:block to match the unclassed block root of the other targets', async () => {
    const host = await mount();
    expect(host.style.display).toBe('block');
  });

  it('closed: content hidden, trigger undescribed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().hasAttribute('aria-describedby')).toBe(false);
  });

  it('hover opens: content shows and the trigger is wired to it', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-describedby')).toBe('hc-content');
    expect(content().getAttribute('role')).toBe('dialog');
  });

  it('leaving the trigger closes the card', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    await user.unhover(trigger());
    expect(content().hidden).toBe(true);
  });

  it('Escape dismisses while the trigger is focused', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });

  it('hoverable content holds the card open until the pointer leaves it', async () => {
    const user = userEvent.setup();
    // A positive close delay is the grace window that lets the pointer cross
    // from trigger to content without the card going hidden mid-travel.
    await mount(50);
    await user.hover(trigger());
    await user.hover(content());
    await user.unhover(trigger());
    expect(content().hidden).toBe(false);
    await user.unhover(content());
    await waitFor(() => expect(content().hidden).toBe(true));
  });

  it('Escape dismisses a default-open card that never received a hover/focus event', async () => {
    // Regression (shared bindHoverCard path, also drives Astro): a defaultOpen
    // card dismissed only through the hover primitive stayed open, since no prior
    // hover/focus had given the primitive state to close. A raw Escape keydown
    // with no focus event must still close it.
    document.body.innerHTML = `
      <rafters-hover-card data-part="root" data-open-delay="0" data-default-open="true">
        <a href="#" data-part="trigger" id="hc-trigger" data-state="open">@john</a>
        <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="open">Software Engineer</div>
      </rafters-hover-card>`;
    await Promise.resolve();
    expect(content().hidden).toBe(false);
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(content().hidden).toBe(true);
  });
});
