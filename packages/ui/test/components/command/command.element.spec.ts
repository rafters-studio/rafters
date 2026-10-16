import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import '../../../src/components/command/command.element';
import {
  command,
  commandItemAria,
  type CommandState,
} from '../../../src/components/command/command.behavior';
import { commandClasses } from '../../../src/components/command/command.classes';

function item(v: string, label: string, extra = ''): string {
  return `<div role="option" data-part="item" data-value="${v}" id="c-item-${v}" ${extra}>${label}</div>`;
}

async function mount(items?: string): Promise<void> {
  document.body.innerHTML = `
    <rafters-command data-part="root" id="c-root" data-label="Actions">
      <div data-part="input-wrapper">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle></svg>
        <input data-part="input" id="c-input" type="text" value="" aria-label="Command" />
      </div>
      <div data-part="list" id="c-list">
        <div data-part="empty" id="c-empty" role="presentation" hidden>No results found.</div>
        ${items ?? `${item('calendar', 'Calendar')}${item('settings', 'Settings')}`}
      </div>
    </rafters-command>`;
  await Promise.resolve();
}

const input = () => document.getElementById('c-input') as HTMLInputElement;
const list = () => document.getElementById('c-list') as HTMLElement;
const empty = () => document.getElementById('c-empty') as HTMLElement;
const option = (v: string) => document.getElementById(`c-item-${v}`) as HTMLElement;
const root = () => document.querySelector('rafters-command') as HTMLElement;
const config = { label: 'Actions' };

function expectProjection(values: string[], state: CommandState): void {
  for (const v of values) {
    const expected = commandItemAria(v, state, config);
    const el = option(v);
    expect(el.getAttribute('aria-selected')).toBe(expected['aria-selected']);
    expect(el.hasAttribute('data-selected')).toBe(expected['data-selected'] !== undefined);
    expect(el.hasAttribute('data-highlighted')).toBe(expected['data-highlighted'] !== undefined);
    expect(el.hidden).toBe(expected['hidden'] === true);
  }
}

function collect(): string[] {
  const seen: string[] = [];
  root().addEventListener('command-select', (event) => {
    if (event instanceof CustomEvent) seen.push((event.detail as { value: string }).value);
  });
  return seen;
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('applies the projection and the class set on first paint', async () => {
  await mount();
  const state = command.initialState(config);
  const aria = command.aria(state, config, {
    root: 'c-root',
    input: 'c-input',
    list: 'c-list',
    empty: 'c-empty',
  } as never);
  expect(input().getAttribute('role')).toBe('combobox');
  expect(input().getAttribute('aria-expanded')).toBe('true');
  expect(input().getAttribute('aria-controls')).toBe('c-list');
  expect(input().getAttribute('role')).toBe(aria.input?.role);
  expect(list().getAttribute('role')).toBe('listbox');
  expect(list().getAttribute('aria-label')).toBe('Actions');
  for (const v of ['calendar', 'settings']) {
    expect(option(v).getAttribute('aria-selected')).toBe(
      commandItemAria(v, state, config)['aria-selected'],
    );
  }
  const classes = commandClasses(config, state);
  expect(root().className).toBe(classes.root);
  expect(document.querySelector('[data-part="input-wrapper"]')?.className).toBe(
    classes.inputWrapper,
  );
  expect(document.querySelector('svg')?.getAttribute('class')).toBe(classes.inputIcon);
  expect(input().className).toBe(classes.input);
  expect(list().className).toBe(classes.list);
  expect(empty().className).toBe(classes.empty);
  expect(option('calendar').className).toBe(classes.item);
  expect(root().shadowRoot).toBeNull();
});

it('typing filters by fuzzy match and shows the empty part only on no match', async () => {
  const user = userEvent.setup();
  await mount();
  expect(empty().hidden).toBe(true);
  await user.type(input(), 'set');
  expect(option('settings').hidden).toBe(false);
  expect(option('calendar').hidden).toBe(true);
  expectProjection(['calendar', 'settings'], { query: 'set', highlighted: undefined });
  expect(empty().hidden).toBe(true);
  await user.type(input(), 'zzz');
  expectProjection(['calendar', 'settings'], { query: 'setzzz', highlighted: undefined });
  expect(empty().hidden).toBe(false);
});

it('Enter commits the highlighted item with command-select', async () => {
  const user = userEvent.setup();
  await mount();
  const seen = collect();
  await user.click(input());
  await user.keyboard('{ArrowDown}');
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-calendar');
  expect(document.activeElement).toBe(input());
  await user.keyboard('{Enter}');
  expect(seen).toEqual(['calendar']);
});

it('arrow, Home and End keys move the highlight and clamp', async () => {
  const user = userEvent.setup();
  await mount(`${item('a', 'Alpha')}${item('b', 'Beta')}${item('c', 'Gamma')}`);
  await user.click(input());
  const all = ['a', 'b', 'c'];
  await user.keyboard('{ArrowDown}{ArrowDown}');
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-b');
  expectProjection(all, { query: '', highlighted: 'b' });
  await user.keyboard('{End}{ArrowDown}');
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-c');
  expectProjection(all, { query: '', highlighted: 'c' });
  await user.keyboard('{Home}{ArrowUp}');
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-a');
  expectProjection(all, { query: '', highlighted: 'a' });
  await user.keyboard('{ArrowDown}');
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-b');
  expect(document.activeElement).toBe(input());
});

it('click commits an enabled item, a disabled item raises nothing, hover highlights', async () => {
  const user = userEvent.setup();
  await mount(`${item('a', 'Alpha')}${item('b', 'Beta', 'data-disabled aria-disabled="true"')}`);
  const seen = collect();
  await user.hover(option('a'));
  expect(input().getAttribute('aria-activedescendant')).toBe('c-item-a');
  await user.click(option('b'));
  expect(seen).toEqual([]);
  await user.click(option('a'));
  expect(seen).toEqual(['a']);
});

it('lays out icon, label and shortcut per item', async () => {
  await mount(
    `<div role="option" data-part="item" data-value="a" id="c-item-a">` +
      `<svg slot="start-icon" viewBox="0 0 24 24"></svg>Alpha<kbd data-part="shortcut">A</kbd></div>` +
      item('b', 'Beta'),
  );
  const classes = commandClasses(config, command.initialState(config));
  const a = option('a');
  const wrapper = a.querySelector<HTMLElement>('[data-part="startIcon"]');
  expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  expect(wrapper?.querySelector('svg')).not.toBeNull();
  expect(a.querySelector('[data-part="label"]')?.textContent).toBe('Alpha');
  expect(a.lastElementChild?.getAttribute('data-part')).toBe('shortcut');
  expect(a.querySelector('[data-part="shortcut"]')?.className).toBe(classes.shortcut);
  expect(a.querySelector('[data-part="label"]')?.className).toBe(classes.label);
  expect(wrapper?.className).toBe(classes.startIcon);
  expect(option('b').querySelector('[data-part="startIcon"]')).toBeNull();
});

it('removing the element runs the teardown', async () => {
  const user = userEvent.setup();
  await mount();
  const el = root();
  const seen = collect();
  const field = input();
  const wrapperOption = option('calendar');
  el.remove();
  await user.type(field, 'set');
  expect(wrapperOption.hidden).toBe(false);
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  wrapperOption.click();
  expect(field.hasAttribute('aria-activedescendant')).toBe(false);
  expect(seen).toEqual([]);
});
