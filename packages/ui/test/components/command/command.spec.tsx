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

/** The element carrying data-part="<part>". */
function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Every rendered instance of a many part. */
function partElements(root: HTMLElement, part: string): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`));
  if (root.getAttribute('data-part') === part) all.unshift(root);
  return all;
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly string[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every expected part renders (with its declared role), and the rendered
 *  ARIA equals the score's projection -- including absence. */
function assertContractFulfillment(
  root: HTMLElement,
  state: CommandState,
  config: CommandConfig,
  expectedParts: readonly string[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = command.parts[part as keyof typeof command.parts];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }
  const allParts = Object.keys(command.parts) as (keyof typeof command.parts)[];
  const ids = domPartIds(root, allParts);
  const projection = command.aria(state, config, ids);
  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/** Bespoke `many`-part assertion: the caller supplies `instanceAria(key)` and
 *  the DOM-order instance keys (command's item projection takes only the key,
 *  living beside the component rather than on the spec). */
function assertInstanceContractFulfillment(
  root: HTMLElement,
  part: string,
  instanceKeys: readonly string[],
  instanceAria: (key: string) => Record<string, string | boolean | undefined>,
): void {
  const elements = partElements(root, part);
  expect(elements.length, `many part "${part}": rendered instances must match supplied keys`).toBe(
    instanceKeys.length,
  );
  for (const [i, key] of instanceKeys.entries()) {
    const element = elements[i];
    expect(element, `instance "${key}" of part "${part}"`).toBeDefined();
    if (!element) continue;
    for (const [attr, value] of Object.entries(instanceAria(key))) {
      if (value === undefined) {
        expect(
          element.hasAttribute(attr),
          `instance "${key}" of "${part}" must NOT render ${attr}`,
        ).toBe(false);
      } else {
        expect(element.getAttribute(attr), `instance "${key}" of "${part}" ${attr}`).toBe(
          String(value),
        );
      }
    }
  }
}

afterEach(() => {
  cleanup();
});

describe('command [react]', () => {
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
    assertContractFulfillment(partElement(body(), 'root')!, state, config, [
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
