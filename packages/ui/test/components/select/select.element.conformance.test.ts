/**
 * WC performance of the select score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the binding applies the
 * projection imperatively and runs the roving/typeahead/dismiss effects.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersSelect } from '../../../src/components/select/select.element';

beforeAll(() => {
  if (!customElements.get('rafters-select')) customElements.define('rafters-select', RaftersSelect);
});

function optionMarkup(v: string, label: string): string {
  return `<div role="option" data-part="item" data-value="${v}" data-roving-item tabindex="-1"><span></span><span>${label}</span></div>`;
}

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-select data-part="root" value="" ${attrs}>
      <button type="button" data-part="trigger" id="s-trigger">
        <div data-part="value" data-placeholder="Pick a fruit">Pick a fruit</div>
      </button>
      <div data-part="content" id="s-content" hidden>
        <div>
          ${optionMarkup('apple', 'Apple')}
          ${optionMarkup('banana', 'Banana')}
          ${optionMarkup('cherry', 'Cherry')}
        </div>
      </div>
    </rafters-select>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-select') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const valueEl = () => document.body.querySelector<HTMLElement>('[data-part="value"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('select conformance [wc]', () => {
  it('closed: listbox hidden, trigger a collapsed combobox, aria wired by real ids', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(content().getAttribute('role')).toBe('listbox');
    expect(content().getAttribute('aria-labelledby')).toBe('s-trigger');
    expect(option('apple').getAttribute('aria-selected')).toBe('false');
  });

  it('click opens; clicking an option selects it, closes, updates the value, refocuses trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('s-content');

    await user.click(option('banana'));
    expect(content().hidden).toBe(true);
    expect(option('banana').getAttribute('aria-selected')).toBe('true');
    expect(valueEl().textContent).toBe('Banana');
    expect(document.activeElement).toBe(trigger());
  });

  it('ArrowDown on the trigger opens and lands focus on the first option', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(option('apple'));
  });

  it('arrows rove the options and Enter commits the focused one', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('banana'));
    await user.keyboard('{Enter}');
    expect(content().hidden).toBe(true);
    expect(option('banana').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(trigger());
  });

  it('typeahead jumps focus to the first matching option', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('c');
    expect(document.activeElement).toBe(option('cherry'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(true);
  });
});
