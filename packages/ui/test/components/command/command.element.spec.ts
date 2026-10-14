/**
 * WC performance of the command score, driven end to end against light-DOM
 * markup. Same score as the React spec -- the binding applies the
 * projection imperatively, fuzzy-filters the options, and commits via the
 * command-select event.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ICON_SVG_16, installIconLayout, rect } from './icon-layout';
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

describe('command [wc]', () => {
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

describe('command icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const mountIcons = async (): Promise<void> => {
    document.body.innerHTML = `
      <rafters-command data-part="root" id="c-root" data-label="Actions">
        <div data-part="input-wrapper">
          <input data-part="input" id="c-input" type="text" value="" aria-label="Command" />
        </div>
        <div data-part="list" id="c-list">
          <div role="option" data-part="item" data-value="calendar" id="c-item-calendar">${ICON_SVG_16.replace('<svg', '<svg slot="start-icon"')}Calendar<kbd data-part="shortcut">Cmd+K</kbd></div>
          ${optionMarkup('search', 'Search')}
        </div>
      </rafters-command>`;
    await Promise.resolve();
  };

  it('wraps the slotted icon in an aria-hidden wrapper before the label', async () => {
    await mountIcons();
    const wrappers = document.body.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(wrappers[0]?.getAttribute('data-icon')).toBe('inline-start');
    expect(wrappers[0]?.querySelector('[slot]')).toBeNull();
    expect(option('search').querySelector('[data-part="startIcon"]')).toBeNull();
    const item = option('calendar');
    expect([...item.children].map((el) => el.getAttribute('data-part'))).toEqual([
      'startIcon',
      'label',
      'shortcut',
    ]);
    expect(item.querySelector('[data-part="label"]')?.textContent).toBe('Calendar');
    expect(rect(item, '[data-part="startIcon"]').right).toBeLessThanOrEqual(
      rect(item, '[data-part="label"]').left + 0.5,
    );
  });

  it('on a dir="rtl" page the start icon renders on the right of the label; size is kept', async () => {
    document.documentElement.dir = 'rtl';
    await mountIcons();
    const item = option('calendar');
    expect(rect(item, '[data-part="startIcon"]').left).toBeGreaterThan(
      rect(item, '[data-part="label"]').left,
    );
    expect(rect(item, '[data-part="startIcon"]').width).toBe(16);
  });

  it('typing still filters by the option value with the label wrapped', async () => {
    const user = userEvent.setup();
    await mountIcons();
    await user.click(input());
    await user.keyboard('sea');
    expect(option('search').hidden).toBe(false);
    expect(option('calendar').hidden).toBe(true);
  });
});
