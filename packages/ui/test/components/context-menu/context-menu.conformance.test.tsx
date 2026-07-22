/**
 * React performance of the context-menu score, driven end to end. Replaces the
 * oracle's imperative effects: state moves only through dispatched actions;
 * roving focus, typeahead, positioning, and dismissal are composed from the
 * primitives on the open transition.
 *
 * The tree renders inside a <main> landmark and the menu portals into it, so
 * axe's best-practice region rule is satisfied for the portaled popup (the same
 * containment a real page's landmarks provide).
 */
import * as React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../../src/components/context-menu/context-menu';
import { contextMenu } from '../../../src/components/context-menu/context-menu.behavior';
import { assertAxeClean, assertContractFulfillment } from '../../harness/conformance';

interface SetupProps {
  onSelectEdit?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  container?: HTMLElement | null;
  extraOutside?: boolean;
}

function TestMenu({ onSelectEdit, onOpenChange, open, container, extraOutside }: SetupProps) {
  return (
    <>
      {extraOutside ? <button type="button">Elsewhere</button> : null}
      <ContextMenu onOpenChange={onOpenChange} open={open}>
        <ContextMenuTrigger>
          <span>Right-click surface</span>
        </ContextMenuTrigger>
        <ContextMenuContent aria-label="Actions" container={container}>
          <ContextMenuItem onSelect={() => onSelectEdit?.()}>Edit</ContextMenuItem>
          <ContextMenuItem>Duplicate</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled>Archive</ContextMenuItem>
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

const body = () => document.body;
const menu = () => body().querySelector<HTMLElement>('[data-part="content"]');
const trigger = () => body().querySelector<HTMLElement>('[data-part="trigger"]') as HTMLElement;
const itemByText = (text: string): HTMLElement => {
  const match = Array.from(body().querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (element) => element.textContent === text,
  );
  if (!match) throw new Error(`no item ${text}`);
  return match;
};

let region: HTMLElement;

function setup(props: SetupProps = {}): void {
  region = document.createElement('main');
  document.body.appendChild(region);
  render(<TestMenu {...props} container={region} />, { container: region });
}

function openMenu(x = 40, y = 60): void {
  fireEvent.contextMenu(trigger(), { clientX: x, clientY: y });
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('context-menu conformance [react]', () => {
  it('closed: the menu is not in the DOM', async () => {
    setup();
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('data-state')).toBe('closed');
    await assertAxeClean(body());
  });

  it('right-click opens the menu at the pointer point, focus lands on the first item', async () => {
    setup();
    openMenu();
    const content = menu();
    expect(content).not.toBeNull();
    expect(content?.getAttribute('role')).toBe('menu');
    expect(content?.getAttribute('aria-orientation')).toBe('vertical');
    expect(content?.getAttribute('data-state')).toBe('open');
    expect(content?.style.position).toBe('fixed');
    expect(content?.style.left).toBe('40px');
    expect(content?.style.top).toBe('60px');
    expect(document.activeElement).toBe(itemByText('Edit'));
    await assertAxeClean(body());
  });

  it('the rendered ARIA equals the score projection when open', () => {
    setup();
    openMenu();
    assertContractFulfillment(
      contextMenu,
      body(),
      { open: true, x: 40, y: 60 },
      { loop: true, avoidCollisions: true },
      ['trigger', 'content'],
    );
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    setup();
    openMenu();
    expect(menu()).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('pointerdown outside closes', async () => {
    setup({ extraOutside: true });
    openMenu();
    expect(menu()).not.toBeNull();
    fireEvent.pointerDown(region.querySelector('button') as HTMLElement);
    expect(menu()).toBeNull();
  });

  it('selecting an item runs onSelect and closes', async () => {
    const user = userEvent.setup();
    const onSelectEdit = vi.fn();
    setup({ onSelectEdit });
    openMenu();
    await user.click(itemByText('Edit'));
    expect(onSelectEdit).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('arrow keys rove focus down the enabled items, skipping the disabled one', async () => {
    const user = userEvent.setup();
    setup();
    openMenu();
    expect(document.activeElement).toBe(itemByText('Edit'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(itemByText('Duplicate'));
    await user.keyboard('{ArrowDown}');
    // Archive is disabled -- roving skips it and lands on Delete.
    expect(document.activeElement).toBe(itemByText('Delete'));
  });

  it('typeahead focuses the item whose label starts with the typed key', async () => {
    const user = userEvent.setup();
    setup();
    openMenu();
    await user.keyboard('d');
    expect(document.activeElement).toBe(itemByText('Duplicate'));
  });

  it('uncontrolled onOpenChange fires true on open and false on close', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    setup({ onOpenChange });
    openMenu();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('checkbox and radio items toggle their state and close the menu', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const onValueChange = vi.fn();
    region = document.createElement('main');
    document.body.appendChild(region);
    function Menu() {
      return (
        <ContextMenu>
          <ContextMenuTrigger>
            <span>Surface</span>
          </ContextMenuTrigger>
          <ContextMenuContent aria-label="Options" container={region}>
            <ContextMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
              Bold
            </ContextMenuCheckboxItem>
            <ContextMenuRadioGroup value="a" onValueChange={onValueChange}>
              <ContextMenuRadioItem value="a">A</ContextMenuRadioItem>
              <ContextMenuRadioItem value="b">B</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>
      );
    }
    render(<Menu />, { container: region });
    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const bold = body().querySelector<HTMLElement>('[role="menuitemcheckbox"]') as HTMLElement;
    await user.click(bold);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(menu()).toBeNull();

    fireEvent.contextMenu(trigger(), { clientX: 10, clientY: 10 });
    const optionB = Array.from(body().querySelectorAll<HTMLElement>('[role="menuitemradio"]')).find(
      (element) => element.textContent === 'B',
    ) as HTMLElement;
    await user.click(optionB);
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('controlled open renders the menu without a right-click', () => {
    setup({ open: true });
    expect(menu()).not.toBeNull();
    expect(menu()?.getAttribute('data-state')).toBe('open');
  });
});

const subContent = () => document.body.querySelector<HTMLElement>('[data-part="sub-content"]');
const subTrigger = () =>
  document.body.querySelector<HTMLElement>('[data-part="sub-trigger"]') as HTMLElement;

function setupWithSub(onSelectDeep?: () => void): void {
  region = document.createElement('main');
  document.body.appendChild(region);
  function Menu() {
    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Surface</span>
        </ContextMenuTrigger>
        <ContextMenuContent aria-label="Actions" container={region}>
          <ContextMenuItem>Edit</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>More</ContextMenuSubTrigger>
            <ContextMenuSubContent aria-label="More actions" container={region}>
              <ContextMenuItem onSelect={() => onSelectDeep?.()}>Deep</ContextMenuItem>
              <ContextMenuItem>Deeper</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
  render(<Menu />, { container: region });
}

describe('context-menu submenu [react]', () => {
  it('the sub-trigger is a menuitem with a collapsed haspopup', () => {
    setupWithSub();
    openMenu();
    expect(subTrigger().getAttribute('role')).toBe('menuitem');
    expect(subTrigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(subTrigger().getAttribute('aria-expanded')).toBe('false');
    expect(subContent()).toBeNull();
  });

  it('ArrowRight on the sub-trigger opens the submenu and focuses its first item', async () => {
    const user = userEvent.setup();
    setupWithSub();
    openMenu();
    await user.keyboard('{ArrowDown}'); // Edit -> More
    expect(document.activeElement).toBe(subTrigger());
    await user.keyboard('{ArrowRight}');
    expect(subContent()).not.toBeNull();
    expect(subTrigger().getAttribute('aria-expanded')).toBe('true');
    expect(subTrigger().getAttribute('aria-controls')).toBe(subContent()?.id);
    expect(document.activeElement?.textContent).toBe('Deep');
    await assertAxeClean(body());
  });

  it('ArrowLeft closes the submenu and restores focus to the sub-trigger', async () => {
    const user = userEvent.setup();
    setupWithSub();
    openMenu();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(subContent()).not.toBeNull();
    await user.keyboard('{ArrowLeft}');
    expect(subContent()).toBeNull();
    expect(document.activeElement).toBe(subTrigger());
  });

  it('selecting a submenu item runs its onSelect and collapses the whole menu', async () => {
    const user = userEvent.setup();
    const onSelectDeep = vi.fn();
    setupWithSub(onSelectDeep);
    openMenu();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    await user.click(
      Array.from(body().querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
        (element) => element.textContent === 'Deep',
      ) as HTMLElement,
    );
    expect(onSelectDeep).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(subContent()).toBeNull();
  });
});
