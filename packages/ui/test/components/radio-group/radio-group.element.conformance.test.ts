/**
 * WC performance of the radio-group score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the only difference is
 * the controller applies the projection imperatively via bindRadioGroup.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersRadioGroup } from '../../../src/components/radio-group/radio-group.element';

beforeAll(() => {
  if (!customElements.get('rafters-radio-group')) {
    customElements.define('rafters-radio-group', RaftersRadioGroup);
  }
});

interface MountOptions {
  orientation?: 'horizontal' | 'vertical';
  checked?: string;
  disabled?: boolean;
  disabledItems?: string[];
}

function itemMarkup(value: string, label: string, checked: boolean, disabled: boolean): string {
  const state = checked ? 'checked' : 'unchecked';
  return `<button type="button" role="radio" data-part="item" data-value="${value}" data-state="${state}" aria-checked="${checked}"${disabled ? ' disabled' : ''}><span data-part="indicator"></span>${label}</button>`;
}

async function mount(options: MountOptions = {}): Promise<HTMLElement> {
  const { orientation = 'vertical', checked, disabled = false, disabledItems = [] } = options;
  const items = [
    ['a', 'Alpha'],
    ['b', 'Beta'],
    ['c', 'Gamma'],
  ]
    .map(([value, label]) =>
      itemMarkup(
        value as string,
        label as string,
        value === checked,
        disabled || disabledItems.includes(value as string),
      ),
    )
    .join('');
  document.body.innerHTML = `
    <rafters-radio-group>
      <div data-part="root" role="radiogroup" aria-orientation="${orientation}"${disabled ? ' aria-disabled="true"' : ''}>
        ${items}
      </div>
    </rafters-radio-group>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
}

const item = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('radio-group conformance [wc]', () => {
  it('reflects the server-rendered checked item as the initial selection', async () => {
    await mount({ checked: 'b' });
    expect(item('b').getAttribute('aria-checked')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('checked');
    expect(item('a').getAttribute('aria-checked')).toBe('false');
  });

  it('click selects an item and reflects aria-checked/data-state', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(item('b'));
    expect(item('b').getAttribute('aria-checked')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('checked');
    expect(item('a').getAttribute('aria-checked')).toBe('false');
  });

  it('arrow keys move focus AND select the newly focused item', async () => {
    const user = userEvent.setup();
    await mount();
    item('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('b'));
    expect(item('b').getAttribute('aria-checked')).toBe('true');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('a'));
    expect(item('a').getAttribute('aria-checked')).toBe('true');
  });

  it('horizontal orientation moves+selects with left/right arrows', async () => {
    const user = userEvent.setup();
    await mount({ orientation: 'horizontal' });
    item('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(item('b').getAttribute('aria-checked')).toBe('true');
  });

  it('Space and Enter select the focused item', async () => {
    const user = userEvent.setup();
    await mount();
    item('c').focus();
    await user.keyboard(' ');
    expect(item('c').getAttribute('aria-checked')).toBe('true');
    item('a').focus();
    await user.keyboard('{Enter}');
    expect(item('a').getAttribute('aria-checked')).toBe('true');
  });

  it('roving skips a disabled item', async () => {
    const user = userEvent.setup();
    await mount({ disabledItems: ['b'] });
    item('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('c'));
    expect(item('c').getAttribute('aria-checked')).toBe('true');
  });

  it('a disabled group gates selection', async () => {
    const user = userEvent.setup();
    await mount({ disabled: true });
    await user.click(item('a'));
    expect(item('a').getAttribute('aria-checked')).toBe('false');
  });
});
