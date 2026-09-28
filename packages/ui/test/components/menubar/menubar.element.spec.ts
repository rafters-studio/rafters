/**
 * WC performance of the menubar score, driven end to end against light-DOM
 * markup. Same score as the React spec -- bindMenubar applies the projection
 * imperatively, moves each menu out of the bar, and runs the bar rove and the
 * open menu's roving/typeahead/dismiss effects.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersMenubar } from '../../../src/components/menubar/menubar.element';
import {
  menubar,
  menubarInstanceAria,
  type MenubarState,
} from '../../../src/components/menubar/menubar.behavior';

beforeAll(() => {
  if (!customElements.get('rafters-menubar'))
    customElements.define('rafters-menubar', RaftersMenubar);
});

function itemMarkup(label: string, disabled = false): string {
  const dis = disabled ? 'data-disabled aria-disabled="true"' : 'tabindex="-1"';
  return `<div role="menuitem" data-part="item" data-roving-item ${dis}>${label}</div>`;
}

function menuMarkup(value: string, items: string): string {
  return `<div data-part="content" data-value="${value}" id="mb-content-${value}" hidden>${items}</div>`;
}

function triggerMarkup(value: string, label: string): string {
  return `<button type="button" data-part="trigger" data-value="${value}" id="mb-trigger-${value}">${label}</button>`;
}

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-menubar data-part="root" id="mb-root">
      ${triggerMarkup('file', 'File')}
      ${triggerMarkup('edit', 'Edit')}
      ${triggerMarkup('view', 'View')}
      ${menuMarkup('file', itemMarkup('New') + itemMarkup('Open') + itemMarkup('Share', true) + itemMarkup('Print'))}
      ${menuMarkup('edit', itemMarkup('Undo') + itemMarkup('Redo'))}
      ${menuMarkup('view', itemMarkup('Zoom'))}
    </rafters-menubar>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-menubar') as HTMLElement;
}

const root = () => document.body.querySelector<HTMLElement>('rafters-menubar')!;
const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;
const item = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent === label,
  )!;

function assertAriaContract(state: MenubarState): void {
  const expectAttrs = (el: HTMLElement, attrs: Record<string, unknown>, label: string) => {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) expect(el.hasAttribute(attr), `${label} ${attr}`).toBe(false);
      else expect(el.getAttribute(attr), `${label} ${attr}`).toBe(String(value));
    }
  };
  const ids = { root: 'mb-root', trigger: '', content: '', item: '' };
  expectAttrs(root(), menubar.aria(state, {}, ids).root ?? {}, 'root');
  for (const value of ['file', 'edit', 'view']) {
    const instance = { trigger: `mb-trigger-${value}`, content: `mb-content-${value}` };
    expectAttrs(trigger(value), menubarInstanceAria('trigger', value, state, {}, instance), value);
    expectAttrs(content(value), menubarInstanceAria('content', value, state, {}, instance), value);
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('menubar [wc]', () => {
  it('closed: projection applied, menus hidden and moved out of the bar', async () => {
    await mount();
    assertAriaContract(menubar.initialState({}));
    expect(content('file').hidden).toBe(true);
    expect(root().contains(content('file'))).toBe(false);
    expect(root().querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it('click opens a menu and lands focus on its first item', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    expect(content('file').hidden).toBe(false);
    assertAriaContract({ active: 'file', pointerOpened: false });
    expect(document.activeElement).toBe(item('New'));
  });

  it('clicking another trigger switches the one open menu', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.click(trigger('edit'));
    expect(content('file').hidden).toBe(true);
    expect(content('edit').hidden).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it('ArrowRight/ArrowLeft rove the triggers while closed', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('file').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('edit'));
    expect(content('edit').hidden).toBe(true);
  });

  it('arrows rove the items, skipping the disabled one; typeahead jumps', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(document.activeElement).toBe(item('Print'));
    await user.keyboard('o');
    expect(document.activeElement).toBe(item('Open'));
  });

  it('ArrowRight inside a menu moves to the next menu', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{ArrowRight}');
    expect(content('edit').hidden).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it('activating an item (Enter) closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('file'));
    await user.keyboard('{Enter}');
    expect(content('file').hidden).toBe(true);
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger('view'));
    await user.keyboard('{Escape}');
    expect(content('view').hidden).toBe(true);
    expect(document.activeElement).toBe(trigger('view'));
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    await mount();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    await user.click(trigger('file'));
    await user.click(outside);
    expect(content('file').hidden).toBe(true);
  });

  it('disconnecting restores each menu to its authored place in the bar', async () => {
    await mount();
    const menu = content('file');
    const host = root();
    host.remove();
    expect(host.contains(menu)).toBe(true);
  });
});
