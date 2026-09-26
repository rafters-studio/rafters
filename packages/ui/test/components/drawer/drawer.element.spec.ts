/**
 * WC performance of the drawer score, driven end to end against light-DOM
 * markup. Same score as the React spec -- proves presence (content
 * inert off the open axis; CSS moves and hides them) and the directly-composed modal trio (focus-trap,
 * scroll-lock, dismiss) drive through the DOM binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersDrawer } from '../../../src/components/drawer/drawer.element';

beforeAll(() => {
  if (!customElements.get('rafters-drawer')) customElements.define('rafters-drawer', RaftersDrawer);
});

async function mount(modal = true): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-drawer${modal ? '' : ' data-modal="false"'} data-side="bottom">
      <button type="button" data-part="trigger" id="dr-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
      <div data-part="overlay" id="dr-overlay" aria-hidden="true" data-state="closed" inert></div>
      <div data-part="content" id="dr-content" role="dialog" tabindex="-1" aria-labelledby="dr-title" data-state="closed" inert>
        <div aria-hidden="true"></div>
        <div id="dr-title" data-part="title" role="heading" aria-level="2">Actions</div>
        <button type="button">Save</button>
        <button type="button" data-part="close" id="dr-close" aria-label="Close">x</button>
      </div>
    </rafters-drawer>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-drawer') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const overlay = () => document.body.querySelector<HTMLElement>('[data-part="overlay"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('drawer [wc]', () => {
  it('host pins display:block to match the unclassed block root of the other targets', async () => {
    const host = await mount();
    expect(host.style.display).toBe('block');
  });

  it('closed: overlay and content inert, trigger collapsed', async () => {
    await mount();
    expect(content().inert).toBe(true);
    expect(overlay().inert).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('trigger opens: overlay and content live, aria wired, focus trapped, scroll locked', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().inert).toBe(false);
    expect(overlay().inert).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('dr-content');
    expect(content().contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('the trap lands initial focus inside the content while visibility transitions', async () => {
    // The trap focuses synchronously on open, and a hidden element cannot take
    // focus. A transition that included visibility on enter would read hidden
    // on its first frame and the focus would stay on the trigger, so the open
    // pose narrows the transition to transform (drawer.classes.ts). The
    // component tests load no Tailwind output, so the two poses are injected as
    // the CSS those classes compile to.
    const style = document.createElement('style');
    style.textContent = `
      [data-part="content"] { visibility: hidden; transition: all 1s; }
      [data-part="content"][data-state="open"] {
        visibility: visible;
        transition-property: transform, translate, scale, rotate;
      }`;
    document.head.appendChild(style);
    try {
      const user = userEvent.setup();
      await mount();
      await user.click(trigger());
      expect(getComputedStyle(content()).visibility).toBe('visible');
      expect(content().contains(document.activeElement)).toBe(true);
      // Closing holds the panel visible until the slide ends.
      await user.keyboard('{Escape}');
      expect(getComputedStyle(content()).visibility).toBe('visible');
    } finally {
      style.remove();
    }
  });

  it('Escape closes, restores focus to the trigger, releases scroll', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().inert).toBe(true);
    expect(overlay().inert).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('close button closes', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.click(document.body.querySelector('[data-part="close"]') as HTMLElement);
    expect(content().inert).toBe(true);
  });

  it('pointerdown outside dismisses; the trigger toggles, not close-then-open', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().inert).toBe(false);
    await user.click(outside);
    expect(content().inert).toBe(true);
    await user.click(trigger());
    expect(content().inert).toBe(false);
    await user.click(trigger());
    expect(content().inert).toBe(true);
  });

  it('Escape closes even when the close button holds the trap initial focus', async () => {
    // Regression: the focus-trap focuses the first focusable DESCENDANT. In a
    // bare drawer whose only focusable child is the close button, initial focus
    // lands on data-part="close", so a target-scoped keymap would drop Escape.
    // The bind resolves any keydown inside content as content-scoped.
    const user = userEvent.setup();
    document.body.innerHTML = `
      <rafters-drawer data-side="bottom">
        <button type="button" data-part="trigger" id="dr-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
        <div data-part="overlay" id="dr-overlay" aria-hidden="true" data-state="closed" inert></div>
        <div data-part="content" id="dr-content" role="dialog" tabindex="-1" aria-labelledby="dr-title" data-state="closed" inert>
          <div id="dr-title" data-part="title" role="heading" aria-level="2">Actions</div>
          <button type="button" data-part="close" id="dr-close" aria-label="Close">x</button>
        </div>
      </rafters-drawer>`;
    await Promise.resolve();
    await user.click(trigger());
    // The close button is the only focusable child, so it takes initial focus.
    expect(document.activeElement).toBe(document.body.querySelector('[data-part="close"]'));
    await user.keyboard('{Escape}');
    expect(content().inert).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('non-modal: no scroll lock, Escape still closes', async () => {
    const user = userEvent.setup();
    await mount(false);
    await user.click(trigger());
    expect(document.body.style.overflow).not.toBe('hidden');
    (content().querySelector('button') as HTMLElement).focus();
    await user.keyboard('{Escape}');
    expect(content().inert).toBe(true);
  });
});
