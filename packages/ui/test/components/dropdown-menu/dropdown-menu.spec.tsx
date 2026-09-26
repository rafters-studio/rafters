/**
 * React performance of the dropdown-menu score, driven end to end. State moves
 * only through dispatched actions; roving focus, typeahead, and outside
 * dismissal are composed directly from primitives by startDropdownMenuEffects.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../src/components/dropdown-menu/dropdown-menu';
import {
  dropdownMenu,
  type DropdownMenuConfig,
  type DropdownMenuPart,
  type DropdownMenuState,
} from '../../../src/components/dropdown-menu/dropdown-menu.behavior';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEdit?: () => void;
}

function TestMenu({ onEdit, ...props }: SetupProps) {
  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger aria-label="Options">Options</DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Options">
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const body = () => document.body;
const trigger = () => body().querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => body().querySelector<HTMLElement>('[data-part="content"]')!;
const item = (label: string) =>
  Array.from(body().querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent === label,
  )!;

/** The element carrying data-part="<part>" (the root itself counts). */
function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: HTMLElement, parts: readonly DropdownMenuPart[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

/** Every declared part present (with its declared role) and the rendered
 *  ARIA equal to the score's projection -- including absence: a projected
 *  `undefined` means the attribute must not be rendered. */
function assertAriaContract(
  root: HTMLElement,
  state: DropdownMenuState,
  config: DropdownMenuConfig,
  expectedParts: readonly DropdownMenuPart[],
): void {
  for (const part of expectedParts) {
    const element = partElement(root, part);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
    const decl = dropdownMenu.parts[part];
    if (decl.role) {
      expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
    }
  }

  const allParts = Object.keys(dropdownMenu.parts) as DropdownMenuPart[];
  const ids = domPartIds(root, allParts);
  const projection = dropdownMenu.aria(state, config, ids);

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

afterEach(() => {
  cleanup();
});

describe('dropdown-menu [react]', () => {
  it('closed: menu hidden, trigger is a collapsed menu button', async () => {
    render(
      <main>
        <TestMenu />
      </main>,
    );
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);

    const config: DropdownMenuConfig = {};
    const state: DropdownMenuState = dropdownMenu.initialState(config);
    assertAriaContract(partElement(body(), 'root')!, state, config, ['root', 'trigger', 'content']);
  });

  it('trigger and menu are wired by real ids', () => {
    render(<TestMenu defaultOpen />);
    expect(trigger().getAttribute('aria-controls')).toBe(content().id);
    expect(content().getAttribute('aria-labelledby')).toBe(trigger().id);
    expect(content().getAttribute('role')).toBe('menu');
    expect(content().getAttribute('aria-orientation')).toBe('vertical');
  });

  it('click opens and lands focus on the first item; aria clean while open', async () => {
    const user = userEvent.setup();
    render(
      <main>
        <TestMenu />
      </main>,
    );
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item('Edit'));
  });

  it('clicking an item runs its action, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<TestMenu onEdit={onEdit} />);
    await user.click(trigger());
    await user.click(item('Edit'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('Enter on a focused item activates it (div-as-button), closes, refocuses trigger', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<TestMenu onEdit={onEdit} />);
    await user.click(trigger());
    expect(document.activeElement).toBe(item('Edit'));
    await user.keyboard('{Enter}');
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('arrows rove the items, skipping the disabled one', async () => {
    const user = userEvent.setup();
    render(<TestMenu defaultOpen />);
    item('Edit').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Duplicate'));
    await user.keyboard('{ArrowDown}');
    // Archive is disabled -> roving skips it.
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('ArrowDown on the closed trigger opens the menu', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(content().hidden).toBe(false);
  });

  it('typeahead jumps focus to the first matching item', async () => {
    const user = userEvent.setup();
    render(<TestMenu defaultOpen />);
    item('Edit').focus();
    await user.keyboard('d');
    expect(document.activeElement).toBe(item('Duplicate'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<TestMenu defaultOpen />);
    item('Edit').focus();
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestMenu />
      </div>,
    );
    await user.click(trigger());
    expect(content().hidden).toBe(false);
    await user.click(body().querySelector('button') as HTMLElement);
    expect(content().hidden).toBe(true);
  });

  it('controlled open: onOpenChange fires and state follows the prop', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<TestMenu open={false} onOpenChange={onOpenChange} />);
    await user.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(content().hidden).toBe(true);

    rerender(<TestMenu open onOpenChange={onOpenChange} />);
    expect(content().hidden).toBe(false);
  });
});
