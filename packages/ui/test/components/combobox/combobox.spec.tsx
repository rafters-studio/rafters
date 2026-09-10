/**
 * React performance of the combobox score, driven end to end. State moves only
 * through dispatched actions; positioning and outside dismissal are composed
 * primitives run in a useEffect, exactly as bindCombobox composes them.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
} from '../../../src/components/combobox/combobox';
import {
  combobox,
  comboboxItemAria,
  type ComboboxConfig,
  type ComboboxState,
} from '../../../src/components/combobox/combobox.behavior';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

function TestCombobox(props: SetupProps) {
  return (
    <Combobox {...props}>
      <ComboboxInput aria-label="Framework" placeholder="Search framework" />
      <ComboboxContent>
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxItem value="react">React</ComboboxItem>
        <ComboboxItem value="vue">Vue</ComboboxItem>
        <ComboboxItem value="angular">Angular</ComboboxItem>
      </ComboboxContent>
    </Combobox>
  );
}

const body = () => document.body;
const input = () => body().querySelector<HTMLInputElement>('[data-part="input"]')!;
const toggle = () => body().querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => body().querySelector<HTMLElement>('[data-part="content"]')!;
const empty = () => body().querySelector<HTMLElement>('[data-part="empty"]')!;
const option = (v: string) =>
  body().querySelector<HTMLElement>(`[data-part="item"][data-value="${v}"]`)!;

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
  state: ComboboxState,
  config: ComboboxConfig,
  expectedParts: readonly string[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = combobox.parts[part as keyof typeof combobox.parts];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }
  const allParts = Object.keys(combobox.parts) as (keyof typeof combobox.parts)[];
  const ids = domPartIds(root, allParts);
  const projection = combobox.aria(state, config, ids);
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
 *  the DOM-order instance keys (combobox's item projection takes only the key,
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

describe('combobox conformance [react]', () => {
  it('closed: listbox hidden, input is a collapsed combobox, aria clean', async () => {
    render(
      <main>
        <TestCombobox />
      </main>,
    );
    expect(content().hidden).toBe(true);
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);

    const config: ComboboxConfig = {};
    const state: ComboboxState = combobox.initialState(config);
    assertContractFulfillment(partElement(body(), 'root')!, state, config, [
      'root',
      'input',
      'content',
    ]);
    assertInstanceContractFulfillment(
      partElement(body(), 'root')!,
      'item',
      ['react', 'vue', 'angular'],
      (key) => comboboxItemAria(key, state, config),
    );
  });

  it('input and listbox are wired by real ids', () => {
    render(<TestCombobox defaultOpen />);
    expect(input().getAttribute('aria-controls')).toBe(content().id);
    expect(content().getAttribute('aria-labelledby')).toBe(input().id);
  });

  it('typing filters the options and reveals the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<TestCombobox />);
    input().focus();
    await user.keyboard('vu');
    expect(input().value).toBe('vu');
    expect(content().hidden).toBe(false);
    expect(option('vue').hidden).toBe(false);
    expect(option('react').hidden).toBe(true);
    expect(empty().hidden).toBe(true);

    await user.keyboard('zzz');
    expect(option('vue').hidden).toBe(true);
    expect(empty().hidden).toBe(false);
  });

  it('ArrowDown opens the list, highlights the first option, and points activedescendant at it', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <TestCombobox />
      </main>,
    );
    input().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
    expect(option('react').getAttribute('data-highlighted')).toBe('');
    expect(input().getAttribute('aria-activedescendant')).toBe(option('react').id);

    await user.keyboard('{ArrowDown}');
    expect(option('vue').getAttribute('data-highlighted')).toBe('');
    expect(input().getAttribute('aria-activedescendant')).toBe(option('vue').id);
  });

  it('Enter commits the highlighted option: fills the input, closes, marks it selected', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestCombobox onValueChange={onValueChange} />);
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('vue');
    expect(content().hidden).toBe(true);
    expect(input().value).toBe('Vue');
    expect(option('vue').getAttribute('aria-selected')).toBe('true');
  });

  it('clicking an option commits it and returns focus to the input', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <main>
        <TestCombobox onValueChange={onValueChange} />
      </main>,
    );
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(option('angular'));
    expect(onValueChange).toHaveBeenLastCalledWith('angular');
    expect(content().hidden).toBe(true);
    expect(input().value).toBe('Angular');
    expect(document.activeElement).toBe(input());
  });

  it('the toggle opens and closes the list', async () => {
    const user = userEvent.setup();
    render(<TestCombobox />);
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(toggle());
    expect(content().hidden).toBe(true);
  });

  it('Escape closes the list and keeps focus on the input', async () => {
    const user = userEvent.setup();
    render(<TestCombobox defaultOpen />);
    input().focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(input());
  });

  it('pointerdown outside closes the list', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestCombobox />
      </div>,
    );
    await user.click(toggle());
    expect(content().hidden).toBe(false);
    await user.click(body().querySelector('button') as HTMLElement);
    expect(content().hidden).toBe(true);
  });

  it('controlled value: callback fires and the projection follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestCombobox value="react" onValueChange={onValueChange} />);
    expect(option('react').getAttribute('aria-selected')).toBe('true');

    await user.click(toggle());
    await user.click(option('angular'));
    // Controlled: effective value did not move, but the callback reports the pick.
    expect(onValueChange).toHaveBeenLastCalledWith('angular');
    expect(option('react').getAttribute('aria-selected')).toBe('true');

    rerender(<TestCombobox value="angular" onValueChange={onValueChange} />);
    expect(option('angular').getAttribute('aria-selected')).toBe('true');
  });

  it('disabled: the input is disabled and the toggle does not open', async () => {
    const user = userEvent.setup();
    render(<TestCombobox disabled />);
    expect(input().getAttribute('aria-disabled')).toBe('true');
    expect(input().disabled).toBe(true);
    await user.click(toggle());
    expect(content().hidden).toBe(true);
  });
});
