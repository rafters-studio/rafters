/**
 * WC performance of the dropdown-menu score, driven end to end against light-DOM
 * markup. Same score as the React spec -- the binding applies the
 * projection imperatively and runs the roving/typeahead/dismiss effects.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ICON_SVG_16, iconRect, installIconLayout, labelRect } from './icon-layout';
import { RaftersDropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.element';

beforeAll(() => {
  if (!customElements.get('rafters-dropdown-menu'))
    customElements.define('rafters-dropdown-menu', RaftersDropdownMenu);
});

function itemMarkup(label: string, disabled = false): string {
  const dis = disabled ? 'data-disabled aria-disabled="true"' : 'tabindex="-1"';
  return `<div role="menuitem" data-part="item" data-roving-item ${dis}>${label}</div>`;
}

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-dropdown-menu data-part="root">
      <button type="button" data-part="trigger" id="dm-trigger">Options</button>
      <div data-part="content" id="dm-content" hidden>
        ${itemMarkup('Edit')}
        ${itemMarkup('Duplicate')}
        ${itemMarkup('Archive', true)}
        ${itemMarkup('Delete')}
      </div>
    </rafters-dropdown-menu>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('rafters-dropdown-menu') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const item = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent === label,
  )!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('dropdown-menu [wc]', () => {
  it('closed: menu hidden, trigger a collapsed menu button, aria wired by real ids', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(content().getAttribute('role')).toBe('menu');
    expect(content().getAttribute('aria-orientation')).toBe('vertical');
    expect(content().getAttribute('aria-labelledby')).toBe('dm-trigger');
  });

  it('click opens and lands focus on the first item; trigger wires aria-controls', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('dm-content');
    expect(document.activeElement).toBe(item('Edit'));
  });

  it('arrows rove the items and skip the disabled one', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Duplicate'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('typeahead jumps focus to the first matching item', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('d');
    expect(document.activeElement).toBe(item('Duplicate'));
  });

  it('activating an item (Enter) closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(trigger());
    await user.keyboard('{Enter}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
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

describe('dropdown-menu icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const mountIcons = async (): Promise<void> => {
    const user = userEvent.setup();
    document.body.innerHTML = `
      <rafters-dropdown-menu data-part="root">
        <button type="button" data-part="trigger" id="dm-trigger">Options</button>
        <div data-part="content" id="dm-content" hidden>
          <div role="menuitem" data-part="item" data-roving-item tabindex="-1">${ICON_SVG_16.replace('<svg', '<svg slot="start-icon"')}Edit</div>
          ${itemMarkup('Duplicate')}
        </div>
      </rafters-dropdown-menu>`;
    await Promise.resolve();
    await user.click(trigger());
  };

  it('wraps the slotted icon in an aria-hidden wrapper before the label', async () => {
    await mountIcons();
    const wrappers = document.body.querySelectorAll('[data-part="startIcon"]');
    expect(wrappers).toHaveLength(1);
    const wrapper = wrappers[0]!;
    expect(wrapper.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.getAttribute('data-icon')).toBe('inline-start');
    expect(wrapper.querySelector('[slot]')).toBeNull();
    const edit = item('Edit');
    expect(edit.lastElementChild?.textContent).toBe('Edit');
    expect(iconRect(edit).right).toBeLessThanOrEqual(labelRect(edit).left + 0.5);
    expect(item('Duplicate').querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('on a dir="rtl" page the start icon renders on the right of the label; size is kept', async () => {
    document.documentElement.dir = 'rtl';
    await mountIcons();
    const edit = item('Edit');
    expect(iconRect(edit).left).toBeGreaterThan(labelRect(edit).left);
    expect(iconRect(edit).width).toBe(16);
  });

  it('no wrapper is made when no icon is given', async () => {
    await mount();
    expect(document.body.querySelector('[data-part="startIcon"]')).toBeNull();
  });
});
