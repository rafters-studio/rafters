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
  type DropdownMenuState,
} from '../../../src/components/dropdown-menu/dropdown-menu.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

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

afterEach(() => {
  cleanup();
});

describe('dropdown-menu conformance [react]', () => {
  it('closed: menu hidden, trigger is a collapsed menu button, aria clean', async () => {
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
    assertContractFulfillment(dropdownMenu, partElement(body(), 'root')!, state, config, [
      'root',
      'trigger',
      'content',
    ]);
    await assertAxeClean(body());
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
    await assertAxeClean(body());
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
