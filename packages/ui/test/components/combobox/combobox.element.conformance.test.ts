/**
 * WC performance of the combobox score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the binding applies the
 * projection imperatively, filters the options in place, and composes the
 * positioning + outside-dismiss affordances.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCombobox } from '../../../src/components/combobox/combobox.element';

beforeAll(() => {
  if (!customElements.get('rafters-combobox')) {
    customElements.define('rafters-combobox', RaftersCombobox);
  }
});

function optionMarkup(v: string, label: string): string {
  return `<div role="option" data-part="item" id="cb-content-option-${v}" data-value="${v}"><span></span><span>${label}</span></div>`;
}

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-combobox data-part="root" value="" ${attrs}>
      <div data-part="field">
        <input data-part="input" id="cb-input" type="text" autocomplete="off" value="" />
        <button type="button" data-part="trigger" tabindex="-1" aria-label="Open"></button>
      </div>
      <div data-part="content" id="cb-content" hidden>
        ${optionMarkup('react', 'React')}
        ${optionMarkup('vue', 'Vue')}
        ${optionMarkup('angular', 'Angular')}
        <div data-part="empty" hidden>No results.</div>
      </div>
    </rafters-combobox>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-combobox') as HTMLElement;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;
const toggle = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const empty = () => document.body.querySelector<HTMLElement>('[data-part="empty"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('combobox conformance [wc]', () => {
  it('closed: listbox hidden, input a collapsed combobox wired by real ids', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    expect(content().getAttribute('role')).toBe('listbox');
    expect(content().getAttribute('aria-labelledby')).toBe('cb-input');
    expect(option('react').getAttribute('aria-selected')).toBe('false');
  });

  it('typing filters the options and reveals the empty state', async () => {
    const user = userEvent.setup();
    await mount();
    input().focus();
    await user.keyboard('vu');
    expect(content().hidden).toBe(false);
    expect(option('vue').hidden).toBe(false);
    expect(option('react').hidden).toBe(true);
    expect(empty().hidden).toBe(true);

    await user.keyboard('zzz');
    expect(empty().hidden).toBe(false);
  });

  it('ArrowDown opens, highlights the first option, and points activedescendant at it', async () => {
    const user = userEvent.setup();
    await mount();
    input().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(option('react').getAttribute('data-highlighted')).toBe('');
    expect(input().getAttribute('aria-activedescendant')).toBe('cb-content-option-react');
  });

  it('arrows move the highlight and Enter commits the highlighted option', async () => {
    const user = userEvent.setup();
    await mount();
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(content().hidden).toBe(true);
    expect(input().value).toBe('Vue');
    expect(option('vue').getAttribute('aria-selected')).toBe('true');
  });

  it('clicking an option commits it and returns focus to the input', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(option('angular'));
    expect(content().hidden).toBe(true);
    expect(input().value).toBe('Angular');
    expect(option('angular').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(input());
  });

  it('Escape closes and keeps focus on the input', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(toggle());
    input().focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(outside);
    expect(content().hidden).toBe(true);
  });

  it("the toggle's accessible name flips with the open state", async () => {
    const user = userEvent.setup();
    await mount();
    // The bind applies the projection on first paint, overwriting the SSR label.
    expect(toggle().getAttribute('aria-label')).toBe('Open');
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    expect(toggle().getAttribute('aria-label')).toBe('Close');
    await user.click(toggle());
    expect(content().hidden).toBe(true);
    expect(toggle().getAttribute('aria-label')).toBe('Open');
  });
});
