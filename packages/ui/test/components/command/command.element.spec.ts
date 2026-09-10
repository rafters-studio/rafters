/**
 * WC performance of the command score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the binding applies the
 * projection imperatively, fuzzy-filters the options, and commits via the
 * command-select event.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersCommand } from '../../../src/components/command/command.element';
import { COMMAND_SELECT_EVENT } from '../../../src/components/command/command.behavior';

beforeAll(() => {
  if (!customElements.get('rafters-command')) {
    customElements.define('rafters-command', RaftersCommand);
  }
});

function optionMarkup(v: string, label: string): string {
  return `<div role="option" data-part="item" data-value="${v}" id="c-item-${v}">${label}</div>`;
}

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-command data-part="root" id="c-root" data-label="Actions">
      <div data-part="input-wrapper">
        <input data-part="input" id="c-input" type="text" value="" aria-label="Command" />
      </div>
      <div data-part="list" id="c-list">
        <div data-part="empty" id="c-empty" hidden>No results found.</div>
        ${optionMarkup('calendar', 'Calendar')}
        ${optionMarkup('search', 'Search')}
        ${optionMarkup('settings', 'Settings')}
      </div>
    </rafters-command>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-command') as HTMLElement;
}

const input = () => document.body.querySelector<HTMLInputElement>('[data-part="input"]')!;
const list = () => document.body.querySelector<HTMLElement>('[data-part="list"]')!;
const option = (v: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;
const emptyEl = () => document.body.querySelector<HTMLElement>('[data-part="empty"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('command conformance [wc]', () => {
  it('wires the combobox to the listbox by real ids on first paint', async () => {
    await mount();
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(input().getAttribute('aria-controls')).toBe('c-list');
    expect(list().getAttribute('role')).toBe('listbox');
    expect(list().getAttribute('aria-label')).toBe('Actions');
    expect(option('calendar').getAttribute('aria-selected')).toBe('false');
  });

  it('typing fuzzy-filters the options, hiding non-matches', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(input());
    await user.keyboard('cal');
    expect(option('calendar').hidden).toBe(false);
    expect(option('search').hidden).toBe(true);
    expect(option('settings').hidden).toBe(true);
  });

  it('arrows move the virtual highlight and point activedescendant at the option', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(option('calendar').getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe('c-item-calendar');
    await user.keyboard('{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe('c-item-search');
  });

  it('Enter commits the highlighted option via the command-select event', async () => {
    const user = userEvent.setup();
    const root = await mount();
    const seen: string[] = [];
    root.addEventListener(COMMAND_SELECT_EVENT, (event) => {
      seen.push((event as CustomEvent<{ value: string }>).detail.value);
    });
    await user.click(input());
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(seen).toEqual(['search']);
  });

  it('the empty state appears only when the query matches nothing', async () => {
    const user = userEvent.setup();
    await mount();
    expect(emptyEl().hidden).toBe(true);
    await user.click(input());
    await user.keyboard('zzz');
    expect(emptyEl().hidden).toBe(false);
  });
});
