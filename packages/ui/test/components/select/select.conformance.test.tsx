/**
 * React performance of the select score, driven end to end. State moves only
 * through dispatched actions; roving focus, typeahead, and outside dismissal
 * are declarative effects run by the shared runner.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/select/select';
import {
  select,
  selectItemAria,
  type SelectConfig,
  type SelectState,
} from '../../../src/components/select/select.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceContractFulfillment,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
}

function TestSelect(props: SetupProps) {
  return (
    <Select {...props}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  );
}

const body = () => document.body;
const trigger = () => body().querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => body().querySelector<HTMLElement>('[data-part="content"]')!;
const value = () => body().querySelector<HTMLElement>('[data-part="value"]')!;
const option = (v: string) =>
  body().querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

afterEach(() => {
  cleanup();
});

describe('select conformance [react]', () => {
  it('closed: listbox hidden, trigger is a collapsed combobox, aria clean', async () => {
    render(
      <main>
        <TestSelect />
      </main>,
    );
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(value().textContent).toBe('Pick a fruit');

    const config: SelectConfig = {};
    const state: SelectState = select.initialState(config);
    assertContractFulfillment(select, partElement(body(), 'root')!, state, config, [
      'root',
      'trigger',
      'content',
    ]);
    assertInstanceContractFulfillment(
      partElement(body(), 'root')!,
      'item',
      ['apple', 'banana', 'cherry'],
      (key) => selectItemAria(key, state, config),
    );
    await assertAxeClean(body());
  });

  it('trigger and listbox are wired by real ids', () => {
    render(<TestSelect defaultOpen />);
    expect(trigger().getAttribute('aria-controls')).toBe(content().id);
    expect(content().getAttribute('aria-labelledby')).toBe(trigger().id);
  });

  it('click opens; clicking an option selects it, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <main>
        <TestSelect onValueChange={onValueChange} />
      </main>,
    );

    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    await assertAxeClean(body());

    await user.click(option('banana'));
    expect(onValueChange).toHaveBeenLastCalledWith('banana');
    expect(content().hidden).toBe(true);
    expect(value().textContent).toBe('Banana');
    expect(option('banana').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(trigger());
  });

  it('opening focuses the selected option; arrows rove; Enter commits', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestSelect defaultValue="banana" onValueChange={onValueChange} />);
    await user.click(trigger());
    expect(document.activeElement).toBe(option('banana'));
    expect(option('banana').getAttribute('data-highlighted')).toBe('');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(option('cherry'));

    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('cherry');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('ArrowDown on the closed trigger opens the listbox', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
  });

  it('Enter on the closed trigger opens the listbox (does not toggle back)', async () => {
    const user = userEvent.setup();
    render(<TestSelect />);
    trigger().focus();
    await user.keyboard('{Enter}');
    expect(content().hidden).toBe(false);
  });

  it('typeahead jumps focus to the first matching option', async () => {
    const user = userEvent.setup();
    render(<TestSelect defaultOpen />);
    await user.keyboard('c');
    expect(document.activeElement).toBe(option('cherry'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<TestSelect defaultOpen />);
    option('apple').focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestSelect />
      </div>,
    );
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(body().querySelector('button') as HTMLElement);
    expect(content().hidden).toBe(true);
  });

  it('controlled value: callback fires, the projection follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestSelect value="apple" onValueChange={onValueChange} />);
    expect(value().textContent).toBe('Apple');

    await user.click(trigger());
    await user.click(option('cherry'));
    // Controlled: effective value did not move, but the callback reports the pick.
    expect(onValueChange).toHaveBeenLastCalledWith('cherry');
    expect(value().textContent).toBe('Apple');

    rerender(<TestSelect value="cherry" onValueChange={onValueChange} />);
    expect(value().textContent).toBe('Cherry');
    expect(option('cherry').getAttribute('aria-selected')).toBe('true');
  });

  it('controlled open: onOpenChange fires and state follows the prop', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<TestSelect open={false} onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(content().hidden).toBe(true);

    rerender(<TestSelect open onOpenChange={onOpenChange} />);
    expect(content().hidden).toBe(false);
  });

  it('disabled: the trigger does not open and carries the disabled projection', async () => {
    const user = userEvent.setup();
    render(<TestSelect disabled />);
    expect(trigger().getAttribute('aria-disabled')).toBe('true');
    expect(trigger().getAttribute('data-disabled')).toBe('');
    await user.click(trigger());
    expect(content().hidden).toBe(true);
  });

  it('a name renders a mirrored hidden input carrying the value', async () => {
    const user = userEvent.setup();
    render(<TestSelect name="fruit" />);
    const input = body().querySelector<HTMLInputElement>('input[data-part="hidden-input"]')!;
    expect(input.name).toBe('fruit');
    expect(input.value).toBe('');
    await user.click(trigger());
    await user.click(option('apple'));
    expect(input.value).toBe('apple');
  });
});
