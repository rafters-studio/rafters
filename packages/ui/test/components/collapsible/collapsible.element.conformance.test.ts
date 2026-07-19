/**
 * WC performance of the collapsible score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis) and the native-button toggle drive through the DOM
 * binding.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCollapsible } from '../../../src/components/collapsible/collapsible.element';

beforeAll(() => {
  if (!customElements.get('rafters-collapsible')) {
    customElements.define('rafters-collapsible', RaftersCollapsible);
  }
});

async function mount(disabled = false): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-collapsible data-part="root" data-state="closed">
      <button type="button" data-part="trigger" id="c-trigger" aria-expanded="false" data-state="closed"${
        disabled ? ' disabled' : ''
      }>Toggle</button>
      <div data-part="content" id="c-content" data-state="closed" hidden>
        <p>Revealed content</p>
      </div>
    </rafters-collapsible>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-collapsible') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('collapsible conformance [wc]', () => {
  it('closed: content hidden, trigger collapsed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
  });

  it('trigger opens: content shows, aria wired to content', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('c-content');
  });

  it('trigger toggles closed again', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.click(trigger());
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
  });

  it('Enter and Space on the native button toggle the region', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.keyboard('{Enter}');
    expect(content().hidden).toBe(false);
    await user.keyboard(' ');
    expect(content().hidden).toBe(true);
  });

  it('disabled: the native button suppresses the toggle', async () => {
    const user = userEvent.setup();
    await mount(true);
    await user.click(trigger());
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });
});
