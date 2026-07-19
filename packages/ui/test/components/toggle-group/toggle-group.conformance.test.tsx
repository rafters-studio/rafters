/**
 * React performance of the toggle-group score, driven end to end. Selection
 * moves only through dispatched actions; roving focus is a declarative effect;
 * arrow keys move focus ONLY (selection does NOT follow focus -- the toolbar
 * pattern). Activation is Space/Enter/click, fulfilled by the native <button>.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '../../../src/components/toggle-group/toggle-group';
import {
  toggleGroup,
  toggleItemAria,
  type ToggleGroupConfig,
} from '../../../src/components/toggle-group/toggle-group.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceContractFulfillment,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  disabledItems?: string[];
}

function TestGroup({ disabledItems = [], type = 'single', ...props }: SetupProps) {
  return (
    <ToggleGroup aria-label="Text formatting" type={type} {...props}>
      <ToggleGroupItem value="a" disabled={disabledItems.includes('a')}>
        Alpha
      </ToggleGroupItem>
      <ToggleGroupItem value="b" disabled={disabledItems.includes('b')}>
        Beta
      </ToggleGroupItem>
      <ToggleGroupItem value="c" disabled={disabledItems.includes('c')}>
        Gamma
      </ToggleGroupItem>
    </ToggleGroup>
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

describe('toggle-group conformance [react]', () => {
  it('renders a role=group with toggle items, axe-clean', async () => {
    render(
      <main>
        <TestGroup defaultValue="a" />
      </main>,
    );
    const root = partElement(body(), 'root');
    expect(root?.getAttribute('role')).toBe('group');
    expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');
    await assertAxeClean(body());
  });

  it('contract: root + item projections equal the rendered DOM', () => {
    const config: ToggleGroupConfig = {
      type: 'single',
      defaultValue: 'b',
      orientation: 'horizontal',
    };
    render(<TestGroup defaultValue="b" />);
    const root = partElement(body(), 'root');
    if (!root) throw new Error('no root');
    const state = toggleGroup.initialState(config);
    assertContractFulfillment(toggleGroup, root, state, config, ['root', 'item']);
    assertInstanceContractFulfillment(root, 'item', ['a', 'b', 'c'], (key) =>
      toggleItemAria(key, state, config),
    );
  });

  it('single: click selects an item and fires onValueChange with the string', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <main>
        <TestGroup onValueChange={onValueChange} />
      </main>,
    );
    await user.click(itemFor('b'));
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('true');
    expect(itemFor('b').getAttribute('data-state')).toBe('on');
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('false');
    expect(onValueChange).toHaveBeenCalledWith('b');
    await assertAxeClean(body());
  });

  it('single is collapsible: re-clicking the selected item clears it and reports empty', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup defaultValue="a" onValueChange={onValueChange} />);
    await user.click(itemFor('a'));
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('false');
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('multiple: clicks add and remove values, reporting the array', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup type="multiple" onValueChange={onValueChange} />);
    await user.click(itemFor('a'));
    expect(onValueChange).toHaveBeenLastCalledWith(['a']);
    await user.click(itemFor('c'));
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');
    expect(itemFor('c').getAttribute('aria-pressed')).toBe('true');
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'c']);
    await user.click(itemFor('a'));
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('false');
    expect(onValueChange).toHaveBeenLastCalledWith(['c']);
  });

  it('arrow keys move focus ONLY -- they do not toggle', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup onValueChange={onValueChange} />);
    itemFor('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(itemFor('b'));
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('false');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('Space and Enter toggle the focused item', async () => {
    const user = userEvent.setup();
    render(<TestGroup type="multiple" />);
    itemFor('b').focus();
    await user.keyboard(' ');
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('true');
    itemFor('c').focus();
    await user.keyboard('{Enter}');
    expect(itemFor('c').getAttribute('aria-pressed')).toBe('true');
  });

  it('controlled single: state follows the prop, callback reports the value to set', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestGroup value="a" onValueChange={onValueChange} />);
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');

    // A controlled group's effective value does not move on click, but the
    // callback still reports what to set.
    await user.click(itemFor('b'));
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('false');

    rerender(<TestGroup value="b" onValueChange={onValueChange} />);
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('true');
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('controlled multiple: callback reports the new array, effective value stays shadowed', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <TestGroup type="multiple" value={['a']} onValueChange={onValueChange} />,
    );
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');

    await user.click(itemFor('b'));
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
    // Effective value is shadowed by the prop until the parent updates it.
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('false');

    rerender(<TestGroup type="multiple" value={['a', 'b']} onValueChange={onValueChange} />);
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');
    expect(itemFor('b').getAttribute('aria-pressed')).toBe('true');
  });

  it('a disabled group gates toggling', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup disabled onValueChange={onValueChange} />);
    expect(partElement(body(), 'root')?.getAttribute('data-disabled')).toBe('true');
    await user.click(itemFor('a'));
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('false');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('roving skips a disabled item', async () => {
    const user = userEvent.setup();
    render(<TestGroup disabledItems={['b']} />);
    expect(itemFor('b').hasAttribute('disabled')).toBe(true);
    itemFor('a').focus();
    await user.keyboard('{ArrowRight}');
    // b is disabled, so focus jumps to c.
    expect(document.activeElement).toBe(itemFor('c'));
  });
});
