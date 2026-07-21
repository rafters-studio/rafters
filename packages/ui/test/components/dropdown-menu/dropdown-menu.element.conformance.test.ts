/**
 * WC performance of the dropdown-menu score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the binding applies the
 * projection imperatively and runs the roving/typeahead/dismiss effects.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
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

describe('dropdown-menu conformance [wc]', () => {
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
