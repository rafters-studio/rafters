/**
 * WC performance of the sheet score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis) and the modal overlay trio (focus-trap, scroll-lock,
 * dismiss) drive through the DOM binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersSheet } from '../../../src/components/sheet/sheet.element';

beforeAll(() => {
  if (!customElements.get('rafters-sheet')) customElements.define('rafters-sheet', RaftersSheet);
});

async function mount(modal = true): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-sheet${modal ? '' : ' modal="false"'}>
      <button type="button" data-part="trigger" id="s-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
      <div data-part="overlay" id="s-overlay" aria-hidden="true" data-state="closed" hidden></div>
      <div data-part="content" id="s-content" data-side="right" role="dialog" tabindex="-1" aria-labelledby="s-title" data-state="closed" hidden>
        <h2 data-part="title" id="s-title">Filters</h2>
        <button type="button">Apply</button>
        <button type="button" data-part="close" id="s-close" aria-label="Close">x</button>
      </div>
    </rafters-sheet>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-sheet') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('sheet conformance [wc]', () => {
  it('closed: content hidden, trigger collapsed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('trigger opens: content shows, aria wired, focus trapped, scroll locked', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('s-content');
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('the authored side survives the binding untouched', async () => {
    await mount();
    expect(content().getAttribute('data-side')).toBe('right');
  });

  it('Escape closes, restores focus to the trigger, releases scroll', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
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

  it('non-modal: no scroll lock, Escape still closes', async () => {
    const user = userEvent.setup();
    await mount(false);
    await user.click(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
    (content().querySelector('button') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });
});
