/**
 * WC performance of the popover score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis), the dismiss effect, and the positioning +
 * focus-first affordances drive through the DOM binding. Non-modal: no trap, no
 * scroll lock.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersPopover } from '../../../src/components/popover/popover.element';

beforeAll(() => {
  if (!customElements.get('rafters-popover'))
    customElements.define('rafters-popover', RaftersPopover);
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-popover data-part="root" data-side="bottom" data-align="center">
      <button type="button" data-part="trigger" id="p-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
      <div data-part="content" id="p-content" role="dialog" tabindex="-1" data-state="closed" data-side="bottom" data-align="center" hidden>
        <button type="button">Action</button>
        <button type="button" data-part="close" id="p-close">Dismiss</button>
      </div>
    </rafters-popover>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-popover') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('popover conformance [wc]', () => {
  it('closed: content hidden, trigger collapsed with haspopup dialog', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('trigger opens: content shows, aria wired, focus moves in, scroll never locks', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('p-content');
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('Escape closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });

  it('close button closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.click(document.body.querySelector('[data-part="close"]') as HTMLElement);
    expect(content().hidden).toBe(true);
  });

  it('pointerdown outside dismisses; the trigger toggles, not close-then-open', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(true);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(trigger());
    expect(content().hidden).toBe(true);
  });
});
