/**
 * WC performance of the alert-dialog score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis), the focus-trap + scroll-lock pair, focus-to-Cancel,
 * and the deliberate ABSENCE of outside-dismiss, all through the DOM binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersAlertDialog } from '../../../src/components/alert-dialog/alert-dialog.element';

beforeAll(() => {
  if (!customElements.get('rafters-alert-dialog')) {
    customElements.define('rafters-alert-dialog', RaftersAlertDialog);
  }
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-alert-dialog data-part="root">
      <button type="button" data-part="trigger" id="a-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Delete</button>
      <div data-part="overlay" id="a-overlay" aria-hidden="true" data-state="closed" hidden></div>
      <div data-part="content" id="a-content" role="alertdialog" aria-modal="true" tabindex="-1" aria-labelledby="a-title" data-state="closed" hidden>
        <h2 data-part="title" id="a-title">Are you sure?</h2>
        <button type="button" data-part="cancel" id="a-cancel">Cancel</button>
        <button type="button" data-part="action" id="a-action">Delete</button>
      </div>
    </rafters-alert-dialog>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-alert-dialog') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const cancel = () => document.body.querySelector<HTMLElement>('[data-part="cancel"]')!;
const action = () => document.body.querySelector<HTMLElement>('[data-part="action"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('alert-dialog conformance [wc]', () => {
  it('closed: content hidden, trigger collapsed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('trigger opens: content shows, aria wired, focus lands on Cancel, scroll locked', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('a-content');
    expect(document.activeElement).toBe(cancel());
    expect(document.body.style.overflow).toBe('hidden');
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

  it('Cancel and the action both close', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.click(action());
    expect(content().hidden).toBe(true);
    await user.click(trigger());
    await user.click(cancel());
    expect(content().hidden).toBe(true);
  });

  it('an outside pointerdown does NOT dismiss', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(false);
  });
});
