/**
 * React performance of the command score, driven end to end. State moves only
 * through dispatched actions; filtering is the score's fuzzy matcher and the
 * active option is virtual (aria-activedescendant on the input).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../src/components/command/command';
import {
  command,
  commandItemAria,
  type CommandConfig,
  type CommandState,
} from '../../../src/components/command/command.behavior';
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
  onSelect?: (value: string) => void;
}

function TestCommand({ onSelect, ...props }: SetupProps) {
  return (
    <Command {...props}>
      <CommandInput aria-label="Command" placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="calendar" onSelect={onSelect}>
            Calendar
          </CommandItem>
          <CommandItem value="search" onSelect={onSelect}>
            Search
          </CommandItem>
          <CommandItem value="settings" onSelect={onSelect}>
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

const body = () => document.body;
const input = () => body().querySelector<HTMLInputElement>('[data-part="input"]')!;
const list = () => body().querySelector<HTMLElement>('[data-part="list"]')!;
const option = (v: string) =>
  body().querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;
const emptyEl = () => body().querySelector<HTMLElement>('[data-part="empty"]')!;

afterEach(() => {
  cleanup();
});

describe('command conformance [react]', () => {
  it('renders a combobox wired to a listbox of options, aria clean', async () => {
    render(
      <main>
        <TestCommand />
      </main>,
    );
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-controls')).toBe(list().id);
    expect(list().getAttribute('role')).toBe('listbox');

    const config: CommandConfig = {};
    const state: CommandState = command.initialState(config);
    assertContractFulfillment(command, partElement(body(), 'root')!, state, config, [
      'root',
      'input',
      'list',
    ]);
    assertInstanceContractFulfillment(
      partElement(body(), 'root')!,
      'item',
      ['calendar', 'search', 'settings'],
      (key) => commandItemAria(key, state, config),
    );
    await assertAxeClean(body());
  });

  it('typing fuzzy-filters the options, hiding non-matches', async () => {
    const user = userEvent.setup();
    render(<TestCommand />);
    await user.click(input());
    await user.keyboard('cal');
    expect(option('calendar').hidden).toBe(false);
    expect(option('search').hidden).toBe(true);
    expect(option('settings').hidden).toBe(true);
  });

  it('ArrowDown highlights the first visible option and points activedescendant at it', async () => {
    const user = userEvent.setup();
    render(<TestCommand />);
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(option('calendar').getAttribute('data-selected')).toBe('');
    expect(option('calendar').getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe(option('calendar').id);

    await user.keyboard('{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe(option('search').id);
  });

  it('Enter invokes the highlighted option', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TestCommand onSelect={onSelect} />);
    await user.click(input());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('search');
  });

  it('clicking an option invokes it', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TestCommand onSelect={onSelect} />);
    await user.click(option('settings'));
    expect(onSelect).toHaveBeenLastCalledWith('settings');
  });

  it('the empty state appears only when the query matches nothing', async () => {
    const user = userEvent.setup();
    render(<TestCommand />);
    expect(emptyEl().hidden).toBe(true);
    await user.click(input());
    await user.keyboard('zzz');
    expect(emptyEl().hidden).toBe(false);
  });

  it('controlled value: the callback reports the query and the projection follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestCommand value="" onValueChange={onValueChange} />);
    await user.click(input());
    await user.keyboard('c');
    expect(onValueChange).toHaveBeenLastCalledWith('c');
    // Controlled: the effective query did not move off the prop.
    expect(input().value).toBe('');

    rerender(<TestCommand value="settings" onValueChange={onValueChange} />);
    expect(option('settings').hidden).toBe(false);
    expect(option('calendar').hidden).toBe(true);
  });
});
