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
} from '../../../src/components/radio-group/radio-group.behavior';
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

function itemFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`);
  if (!element) throw new Error(`no item for ${value}`);
  return element;
}

afterEach(() => {
  cleanup();
});

describe('radio-group conformance [react]', () => {
  it('renders a radiogroup with radio items, axe-clean', async () => {
    // Wrapped in a landmark: a radiogroup is not itself a landmark, and axe's
    // best-practice `region` rule flags page content outside one.
    render(
      <main>
        <TestGroup defaultValue="a" />
      </main>,
    );
    const root = partElement(body(), 'root');
    expect(root?.getAttribute('role')).toBe('radiogroup');
    expect(root?.getAttribute('aria-orientation')).toBe('vertical');
    expect(itemFor('a').getAttribute('role')).toBe('radio');
    await assertAxeClean(body());
  });

  it('contract: root + item projections equal the rendered DOM', () => {
    const config: RadioGroupConfig = { defaultValue: 'b', orientation: 'vertical' };
    render(<TestGroup defaultValue="b" />);
    const root = partElement(body(), 'root');
    if (!root) throw new Error('no root');
    const state = radioGroup.initialState(config);
    assertContractFulfillment(radioGroup, root, state, config, ['root', 'item']);
    assertInstanceContractFulfillment(root, 'item', ['a', 'b', 'c'], (key) =>
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
    await assertAxeClean(body());
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
