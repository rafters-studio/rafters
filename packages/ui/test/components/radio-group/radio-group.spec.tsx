/**
 * React performance of the radio-group score, driven end to end. Selection
 * moves only through dispatched actions; roving focus is a declarative effect;
 * arrow keys move focus AND select (selection follows focus).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RadioGroup, RadioGroupItem } from '../../../src/components/radio-group/radio-group';
import {
  radioGroup,
  radioItemAria,
  type RadioGroupConfig,
  type RadioGroupPart,
  type RadioGroupState,
} from '../../../src/components/radio-group/radio-group.behavior';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  disabledItems?: string[];
}

function TestGroup({ disabledItems = [], ...props }: SetupProps) {
  return (
    <RadioGroup aria-label="Choose one" {...props}>
      <RadioGroupItem value="a" disabled={disabledItems.includes('a')}>
        Alpha
      </RadioGroupItem>
      <RadioGroupItem value="b" disabled={disabledItems.includes('b')}>
        Beta
      </RadioGroupItem>
      <RadioGroupItem value="c" disabled={disabledItems.includes('c')}>
        Gamma
      </RadioGroupItem>
    </RadioGroup>
  );
}

const body = () => document.body;

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function itemFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`);
  if (!element) throw new Error(`no item for ${value}`);
  return element;
}

/** Every declared part renders (with its role), and the rendered ARIA equals
 *  the score's projection -- including absence: a projected `undefined` means
 *  the attribute must not be rendered. */
function assertContractFulfillment(
  root: HTMLElement,
  state: RadioGroupState,
  config: RadioGroupConfig,
  expectedParts: readonly RadioGroupPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = radioGroup.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }
  const allParts = Object.keys(radioGroup.parts) as RadioGroupPart[];
  const ids = {} as Record<RadioGroupPart, string>;
  for (const part of allParts) ids[part] = partElement(root, part)?.id ?? '';
  const projection = radioGroup.aria(state, config, ids);
  for (const part of allParts) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element = partElement(root, part);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

/** Bespoke many-part driver (Spec 01, radio-group is a uniform-item family):
 *  every rendered `item` instance's ARIA equals `instanceAria(key)`. */
function assertInstanceContractFulfillment(
  root: HTMLElement,
  instanceKeys: readonly string[],
  instanceAria: (key: string) => Record<string, string | boolean | undefined>,
): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]'));
  expect(elements.length, 'many part "item": rendered instances must match supplied keys').toBe(
    instanceKeys.length,
  );
  for (const [i, key] of instanceKeys.entries()) {
    const element = elements[i];
    expect(element, `instance "${key}" of part "item"`).toBeDefined();
    if (!element) continue;
    for (const [attr, value] of Object.entries(instanceAria(key))) {
      if (value === undefined) {
        expect(
          element.hasAttribute(attr),
          `instance "${key}" of "item" must NOT render ${attr}`,
        ).toBe(false);
      } else {
        expect(element.getAttribute(attr), `instance "${key}" of "item" ${attr}`).toBe(
          String(value),
        );
      }
    }
  }
}

afterEach(() => {
  cleanup();
});

describe('radio-group [react]', () => {
  it('renders a radiogroup with radio items', () => {
    render(
      <main>
        <TestGroup defaultValue="a" />
      </main>,
    );
    const root = partElement(body(), 'root');
    expect(root?.getAttribute('role')).toBe('radiogroup');
    expect(root?.getAttribute('aria-orientation')).toBe('vertical');
    expect(itemFor('a').getAttribute('role')).toBe('radio');
  });

  it('contract: root + item projections equal the rendered DOM', () => {
    const config: RadioGroupConfig = { defaultValue: 'b', orientation: 'vertical' };
    render(<TestGroup defaultValue="b" />);
    const root = partElement(body(), 'root');
    if (!root) throw new Error('no root');
    const state = radioGroup.initialState(config);
    assertContractFulfillment(root, state, config, ['root', 'item']);
    assertInstanceContractFulfillment(root, ['a', 'b', 'c'], (key) =>
      radioItemAria(key, state, config),
    );
  });

  it('click selects an item and fires onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <main>
        <TestGroup onValueChange={onValueChange} />
      </main>,
    );
    await user.click(itemFor('b'));
    expect(itemFor('b').getAttribute('aria-checked')).toBe('true');
    expect(itemFor('b').getAttribute('data-state')).toBe('checked');
    expect(itemFor('a').getAttribute('aria-checked')).toBe('false');
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('re-clicking the selected item does NOT deselect or re-fire the callback', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup defaultValue="a" onValueChange={onValueChange} />);
    await user.click(itemFor('a'));
    expect(itemFor('a').getAttribute('aria-checked')).toBe('true');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('arrow keys move focus AND select the newly focused item', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup onValueChange={onValueChange} />);
    itemFor('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(itemFor('b'));
    expect(itemFor('b').getAttribute('aria-checked')).toBe('true');
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(itemFor('c'));
    expect(itemFor('c').getAttribute('aria-checked')).toBe('true');
  });

  it('horizontal orientation moves+selects with left/right arrows', async () => {
    const user = userEvent.setup();
    render(<TestGroup orientation="horizontal" />);
    expect(partElement(body(), 'root')?.getAttribute('aria-orientation')).toBe('horizontal');
    itemFor('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(itemFor('b').getAttribute('aria-checked')).toBe('true');
    await user.keyboard('{ArrowLeft}');
    expect(itemFor('a').getAttribute('aria-checked')).toBe('true');
  });

  it('Space and Enter select the focused item', async () => {
    const user = userEvent.setup();
    render(<TestGroup />);
    itemFor('b').focus();
    await user.keyboard(' ');
    expect(itemFor('b').getAttribute('aria-checked')).toBe('true');
    itemFor('c').focus();
    await user.keyboard('{Enter}');
    expect(itemFor('c').getAttribute('aria-checked')).toBe('true');
  });

  it('controlled: state follows the prop, callback reports the value to set', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestGroup value="a" onValueChange={onValueChange} />);
    expect(itemFor('a').getAttribute('aria-checked')).toBe('true');

    // A controlled group's effective value does not move on click, but the
    // callback still reports what to set.
    await user.click(itemFor('b'));
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    expect(itemFor('a').getAttribute('aria-checked')).toBe('true');
    expect(itemFor('b').getAttribute('aria-checked')).toBe('false');

    rerender(<TestGroup value="b" onValueChange={onValueChange} />);
    expect(itemFor('b').getAttribute('aria-checked')).toBe('true');
    expect(itemFor('a').getAttribute('aria-checked')).toBe('false');
  });

  it('a disabled group gates selection', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup disabled onValueChange={onValueChange} />);
    expect(partElement(body(), 'root')?.getAttribute('aria-disabled')).toBe('true');
    await user.click(itemFor('a'));
    expect(itemFor('a').getAttribute('aria-checked')).toBe('false');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('roving skips a disabled item', async () => {
    const user = userEvent.setup();
    render(<TestGroup disabledItems={['b']} />);
    expect(itemFor('b').hasAttribute('disabled')).toBe(true);
    itemFor('a').focus();
    await user.keyboard('{ArrowDown}');
    // b is disabled, so focus + selection jump to c.
    expect(document.activeElement).toBe(itemFor('c'));
    expect(itemFor('c').getAttribute('aria-checked')).toBe('true');
  });
});
