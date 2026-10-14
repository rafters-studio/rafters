/**
 * React performance of the toggle-group score, driven end to end. Selection
 * moves only through dispatched actions; roving focus is a declarative effect;
 * arrow keys move focus ONLY (selection does NOT follow focus -- the toolbar
 * pattern). Activation is Space/Enter/click, fulfilled by the native <button>.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
import { ToggleGroup, ToggleGroupItem } from '../../../src/components/toggle-group/toggle-group';
import {
  toggleGroup,
  toggleItemAria,
  type ToggleGroupConfig,
} from '../../../src/components/toggle-group/toggle-group.behavior';

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

function partElement(part: string): HTMLElement | null {
  return body().querySelector<HTMLElement>(`[data-part="${part}"]`);
}

afterEach(() => {
  cleanup();
});

describe('toggle-group [react]', () => {
  it('renders a role=group with toggle items', async () => {
    render(
      <main>
        <TestGroup defaultValue="a" />
      </main>,
    );
    const root = partElement('root');
    expect(root?.getAttribute('role')).toBe('group');
    expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    expect(itemFor('a').getAttribute('aria-pressed')).toBe('true');
  });

  it('contract: root + item projections equal the rendered DOM', () => {
    const config: ToggleGroupConfig = {
      type: 'single',
      defaultValue: 'b',
      orientation: 'horizontal',
    };
    render(<TestGroup defaultValue="b" />);
    const root = partElement('root');
    if (!root) throw new Error('no root');
    const state = toggleGroup.initialState(config);

    // structure + aria: the declared root part is rendered with its declared
    // role, and the score's root projection equals the DOM (including
    // absence -- a projected undefined means the attribute is not rendered).
    expect(root, 'declared part "root" must be rendered').not.toBeNull();
    expect(root.getAttribute('role'), 'part "root" role').toBe(toggleGroup.parts.root.role);
    const rootProjection = toggleGroup.aria(state, config, {
      root: root.id,
      item: '',
      startIcon: '',
      endIcon: '',
    });
    for (const [attr, value] of Object.entries(rootProjection.root ?? {})) {
      if (value === undefined) {
        expect(root.hasAttribute(attr), `part "root" must NOT render ${attr}`).toBe(false);
      } else {
        expect(root.getAttribute(attr), `part "root" ${attr}`).toBe(String(value));
      }
    }

    // aria (many part): every rendered item's projection equals the score's
    // per-instance projection, including instance count.
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]'));
    expect(items, 'many part "item": rendered instances must match supplied keys').toHaveLength(3);
    for (const [i, value] of ['a', 'b', 'c'].entries()) {
      const projected = toggleItemAria(value, state, config);
      for (const [attr, expectedValue] of Object.entries(projected)) {
        if (expectedValue === undefined) {
          expect(items[i]?.hasAttribute(attr), `instance "${value}" ${attr} absent`).toBe(false);
        } else {
          expect(items[i]?.getAttribute(attr), `instance "${value}" ${attr}`).toBe(
            String(expectedValue),
          );
        }
      }
    }
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
    expect(partElement('root')?.getAttribute('data-disabled')).toBe('true');
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

describe('toggle-group icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;

  function renderItem(props: { startIcon?: React.ReactNode; endIcon?: React.ReactNode }) {
    render(
      <ToggleGroup aria-label="Text formatting">
        <ToggleGroupItem value="a" {...props}>
          Alpha
        </ToggleGroupItem>
      </ToggleGroup>,
    );
    return itemFor('a');
  }

  it('start, end and both render beside the label on one line', () => {
    for (const [name, props] of [
      ['start', { startIcon: svg(ICON_SVG_16) }],
      ['end', { endIcon: svg(ICON_SVG_16) }],
      ['both', { startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_16) }],
    ] as const) {
      const r = rectsOf(renderItem(props));
      if (name !== 'end') {
        expect(r.start, name).not.toBeNull();
        expect(r.start?.right as number).toBeLessThanOrEqual(r.label.left + 0.5);
        expect(Math.abs((r.start?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      if (name !== 'start') {
        expect(r.end, name).not.toBeNull();
        expect(r.end?.left as number).toBeGreaterThanOrEqual(r.label.right - 0.5);
        expect(Math.abs((r.end?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      cleanup();
    }
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const r = rectsOf(renderItem({ startIcon: svg(ICON_SVG_16) }));
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', () => {
    const r = rectsOf(renderItem({ startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_20) }));
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('each wrapper is aria-hidden and absent when no icon is given', () => {
    const el = renderItem({ startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_16) });
    for (const part of ['startIcon', 'endIcon']) {
      expect(el.querySelector(`[data-part="${part}"]`)?.getAttribute('aria-hidden')).toBe('true');
    }
    expect(el.querySelector('[data-part="startIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-start',
    );
    expect(el.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe('inline-end');
    cleanup();
    const bare = renderItem({});
    expect(bare.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(bare.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the accessible name is the label alone even when the svg has a title', () => {
    const el = renderItem({
      startIcon: (
        <svg viewBox="0 0 24 24" width="16" height="16">
          <title>Mail icon</title>
        </svg>
      ),
    });
    const clone = el.cloneNode(true) as HTMLElement;
    for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    expect(clone.textContent?.trim()).toBe('Alpha');
  });
});
