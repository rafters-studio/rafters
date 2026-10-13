/**
 * React performance of the select score, driven end to end. State moves only
 * through dispatched actions; roving focus, typeahead, and outside dismissal
 * are declarative effects run by the shared runner.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/select/select';
import {
  ICON_SVG_16,
  ICON_SVG_20,
  installIconLayout,
  itemRects,
  triggerRects,
} from './icon-layout';
import {
  select,
  selectItemAria,
  type SelectConfig,
  type SelectPart,
  type SelectState,
} from '../../../src/components/select/select.behavior';

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
const root = () => body().querySelector<HTMLElement>('[data-part="root"]')!;

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(rootEl: HTMLElement, parts: readonly SelectPart[]): Record<SelectPart, string> {
  const ids = {} as Record<SelectPart, string>;
  for (const part of parts) {
    const el =
      rootEl.getAttribute('data-part') === part
        ? rootEl
        : rootEl.querySelector<HTMLElement>(`[data-part="${part}"]`);
    ids[part] = el?.id ?? '';
  }
  return ids;
}

afterEach(() => {
  cleanup();
});

describe('select [react]', () => {
  it('closed: listbox hidden, trigger is a collapsed combobox, aria matches the projection', async () => {
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
    const expectedParts: SelectPart[] = ['root', 'trigger', 'content'];
    const ids = domPartIds(root(), Object.keys(select.parts) as SelectPart[]);
    const projection = select.aria(state, config, ids);

    for (const part of expectedParts) {
      const element =
        root().getAttribute('data-part') === part
          ? root()
          : root().querySelector<HTMLElement>(`[data-part="${part}"]`);
      expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
      const decl = select.parts[part];
      if (decl.role) {
        expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
      }
      const attrs = projection[part];
      if (!attrs) continue;
      for (const [attr, attrValue] of Object.entries(attrs)) {
        if (attrValue === undefined) {
          expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
        } else {
          expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(attrValue));
        }
      }
    }

    // many part "item": rendered instances must match the supplied keys --
    // a stray or missing option must fail loudly, not just the ones checked.
    expect(root().querySelectorAll('[data-part="item"]')).toHaveLength(3);
    for (const key of ['apple', 'banana', 'cherry']) {
      const item = option(key);
      for (const [attr, attrValue] of Object.entries(selectItemAria(key, state, config))) {
        if (attrValue === undefined) {
          expect(item.hasAttribute(attr), `option "${key}" must NOT render ${attr}`).toBe(false);
        } else {
          expect(item.getAttribute(attr), `option "${key}" ${attr}`).toBe(String(attrValue));
        }
      }
    }
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

describe('select icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;

  function IconSelect({
    start,
    end,
    itemStart,
    itemEnd,
  }: {
    start?: React.ReactNode;
    end?: React.ReactNode;
    itemStart?: React.ReactNode;
    itemEnd?: React.ReactNode;
  }) {
    return (
      <Select defaultOpen>
        <SelectTrigger aria-label="Fruit" startIcon={start} endIcon={end}>
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple" startIcon={itemStart} endIcon={itemEnd}>
            Apple
          </SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  it('trigger: start, end and both render beside the value', () => {
    for (const [name, start, end] of [
      ['start', svg(ICON_SVG_16), undefined],
      ['end', undefined, svg(ICON_SVG_16)],
      ['both', svg(ICON_SVG_16), svg(ICON_SVG_16)],
    ] as const) {
      const { unmount } = render(<IconSelect start={start} end={end} />);
      const r = triggerRects(root());
      if (name !== 'end') {
        expect(r.start, name).not.toBeNull();
        expect(r.start?.right as number).toBeLessThanOrEqual(r.label.left + 0.5);
      }
      if (name !== 'start') {
        expect(r.end, name).not.toBeNull();
        expect(r.end?.left as number).toBeGreaterThanOrEqual(r.label.right - 0.5);
      }
      unmount();
    }
  });

  it('item: start, end and both render beside the item text, and labels align across items', () => {
    for (const [name, start, end] of [
      ['start', svg(ICON_SVG_16), undefined],
      ['end', undefined, svg(ICON_SVG_16)],
      ['both', svg(ICON_SVG_16), svg(ICON_SVG_16)],
    ] as const) {
      const { unmount } = render(<IconSelect itemStart={start} itemEnd={end} />);
      const apple = itemRects(option('apple'));
      if (name !== 'end') {
        expect(apple.start, name).not.toBeNull();
        expect(apple.start?.right as number).toBeLessThanOrEqual(apple.label.left + 0.5);
      }
      if (name !== 'start') {
        expect(apple.end, name).not.toBeNull();
        expect(apple.end?.left as number).toBeGreaterThanOrEqual(apple.label.right - 0.5);
      }
      // Banana has no icon, yet its label starts where Apple's does (subgrid).
      expect(itemRects(option('banana')).label.left, name).toBe(apple.label.left);
      unmount();
    }
  });

  it('the option name is its label alone, whatever the icon svg titles say', async () => {
    const titled = (title: string) =>
      svg(`<svg width="16" height="16"><title>${title}</title></svg>`);
    render(<IconSelect itemStart={titled('Apple icon')} itemEnd={titled('Apple badge')} />);
    await expect
      .element(page.getByRole('option', { name: 'Apple', exact: true }))
      .toBeInTheDocument();
  });

  it('every wrapper is aria-hidden, and absent when no icon is given', () => {
    const { unmount } = render(
      <IconSelect
        start={svg(ICON_SVG_16)}
        end={svg(ICON_SVG_16)}
        itemStart={svg(ICON_SVG_16)}
        itemEnd={svg(ICON_SVG_16)}
      />,
    );
    const wrappers = body().querySelectorAll('[data-part="startIcon"], [data-part="endIcon"]');
    expect(wrappers.length).toBe(4);
    for (const w of wrappers) expect(w.getAttribute('aria-hidden')).toBe('true');
    unmount();
    render(<IconSelect />);
    expect(body().querySelector('[data-part="startIcon"]')).toBeNull();
    expect(body().querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the trigger value shows the item text alone, not an item icon title', async () => {
    const user = userEvent.setup();
    render(
      <IconSelect itemStart={svg('<svg width="16" height="16"><title>Apple icon</title></svg>')} />,
    );
    await user.click(option('apple'));
    expect(value().textContent).toBe('Apple');
  });

  it('on a dir="rtl" page the start icon renders on the right of the value and the item text', () => {
    document.documentElement.dir = 'rtl';
    render(<IconSelect start={svg(ICON_SVG_16)} itemStart={svg(ICON_SVG_16)} />);
    const t = triggerRects(root());
    expect((t.start as DOMRect).left).toBeGreaterThan(t.label.left);
    const i = itemRects(option('apple'));
    expect((i.start as DOMRect).left).toBeGreaterThan(i.label.left);
  });

  it('an icon keeps its own size', () => {
    render(
      <IconSelect start={svg(ICON_SVG_16)} end={svg(ICON_SVG_20)} itemStart={svg(ICON_SVG_20)} />,
    );
    const t = triggerRects(root());
    expect(t.start?.width).toBe(16);
    expect(t.end?.width).toBe(20);
    expect(itemRects(option('apple')).start?.width).toBe(20);
  });
});
