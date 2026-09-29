/**
 * React performance of the menubar score, driven end to end. State moves only
 * through dispatched actions; the bar rove and each open menu's roving,
 * typeahead and outside dismissal are composed directly from primitives.
 */
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '../../../src/components/menubar/menubar';
import {
  menubar,
  menubarInstanceAria,
  type MenubarConfig,
  type MenubarPart,
  type MenubarState,
} from '../../../src/components/menubar/menubar.behavior';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onNew?: () => void;
}

function TestMenubar({ onNew, ...props }: SetupProps) {
  return (
    <Menubar {...props}>
      <MenubarMenu value="file">
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={onNew}>New</MenubarItem>
          <MenubarItem>Open</MenubarItem>
          <MenubarSeparator />
          <MenubarItem disabled>Share</MenubarItem>
          <MenubarItem>Print</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="edit">
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="view">
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Zoom</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

const body = () => document.body;
const root = () => body().querySelector<HTMLElement>('[data-part="root"]')!;
const trigger = (value: string) =>
  body().querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  body().querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;
const item = (label: string) =>
  Array.from(body().querySelectorAll<HTMLElement>('[data-part="item"]')).find(
    (el) => el.textContent === label,
  )!;

/** The rendered ARIA equals the score's projection -- including absence: a
 *  projected `undefined` means the attribute must not be rendered. Ids are the
 *  ones the binding actually rendered (behaviors never generate ids). */
function assertAriaContract(state: MenubarState, config: MenubarConfig, values: string[]): void {
  const bar = root();
  expect(bar.getAttribute('role')).toBe(menubar.parts.root.role);
  const rootIds = { root: bar.id, trigger: '', content: '', item: '' };
  const expectAttrs = (el: HTMLElement, attrs: Record<string, unknown>, label: string) => {
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `${label} must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr), `${label} ${attr}`).toBe(String(value));
      }
    }
  };
  expectAttrs(bar, menubar.aria(state, config, rootIds).root ?? {}, 'root');
  for (const value of values) {
    const ids = { trigger: trigger(value).id, content: content(value).id };
    for (const part of ['trigger', 'content'] as MenubarPart[]) {
      const el = part === 'trigger' ? trigger(value) : content(value);
      expectAttrs(el, menubarInstanceAria(part, value, state, config, ids), `${part}[${value}]`);
    }
    expect(trigger(value).getAttribute('role')).toBe(menubar.parts.trigger.role);
  }
}

afterEach(() => {
  cleanup();
});

describe('menubar [react]', () => {
  it('closed: every menu inert, triggers are collapsed menuitem menu buttons', () => {
    render(<TestMenubar />);
    for (const value of ['file', 'edit', 'view']) {
      expect(content(value).inert).toBe(true);
      expect(content(value).hidden).toBe(false);
      expect(content(value).dataset['state']).toBe('closed');
      // classy() passes the extent pair through (parens, not brackets).
      expect(content(value).className).toContain('extent-pop');
      expect(content(value).className).toContain('scale-(--rafters-consumed-extent)');
      expect(trigger(value).getAttribute('aria-expanded')).toBe('false');
      expect(trigger(value).hasAttribute('aria-controls')).toBe(false);
    }
    const config: MenubarConfig = {};
    assertAriaContract(menubar.initialState(config), config, ['file', 'edit', 'view']);
  });

  it('the menus live outside the bar, so the bar holds only its triggers', () => {
    render(<TestMenubar />);
    expect(root().contains(content('file'))).toBe(false);
    expect(root().querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it('click opens a menu, wires it by real ids, and lands focus on its first item', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    expect(content('file').inert).toBe(false);
    expect(trigger('file').getAttribute('aria-controls')).toBe(content('file').id);
    expect(content('file').getAttribute('aria-labelledby')).toBe(trigger('file').id);
    expect(document.activeElement).toBe(item('New'));
    assertAriaContract({ active: 'file', pointerOpened: false }, {}, ['file', 'edit', 'view']);
  });

  it('one menu open at a time: clicking another trigger switches', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.click(trigger('edit'));
    expect(content('file').inert).toBe(true);
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it("clicking the open menu's trigger closes it", async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.click(trigger('file'));
    expect(content('file').inert).toBe(true);
  });

  it('ArrowRight/ArrowLeft rove the triggers while closed, without opening', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    trigger('file').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(trigger('edit'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toBe(trigger('view'));
    expect(content('view').inert).toBe(true);
  });

  it('ArrowDown on a trigger opens its menu', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    trigger('edit').focus();
    await user.keyboard('{ArrowDown}');
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
  });

  it('arrows rove the items, skipping the disabled one', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Open'));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Print'));
  });

  it('typeahead jumps focus to the first matching item', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.keyboard('p');
    expect(document.activeElement).toBe(item('Print'));
  });

  it('ArrowRight/ArrowLeft inside a menu move to the neighbouring menu, wrapping', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.keyboard('{ArrowRight}');
    expect(content('file').inert).toBe(true);
    expect(content('edit').inert).toBe(false);
    expect(document.activeElement).toBe(item('Undo'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(content('view').inert).toBe(false);
    expect(document.activeElement).toBe(item('Zoom'));
  });

  it('the pointer crossing to another trigger switches the open menu', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.hover(trigger('view'));
    expect(content('view').inert).toBe(false);
    expect(content('file').inert).toBe(true);
  });

  it('hovering a trigger opens nothing while every menu is closed', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.hover(trigger('view'));
    expect(content('view').inert).toBe(true);
  });

  it('clicking an item runs its action, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<TestMenubar onNew={onNew} />);
    await user.click(trigger('file'));
    await user.click(item('New'));
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(content('file').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('Enter on a focused item activates it, closes, and refocuses the trigger', async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<TestMenubar onNew={onNew} />);
    await user.click(trigger('file'));
    await user.keyboard('{Enter}');
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(content('file').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('file'));
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('edit'));
    await user.keyboard('{Escape}');
    expect(content('edit').inert).toBe(true);
    expect(document.activeElement).toBe(trigger('edit'));
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestMenubar />
      </div>,
    );
    await user.click(trigger('file'));
    await user.click(body().querySelector('button') as HTMLElement);
    expect(content('file').inert).toBe(true);
  });

  it("a pointerdown on the bar's blank space dismisses", async () => {
    const user = userEvent.setup();
    render(<TestMenubar />);
    await user.click(trigger('file'));
    await user.click(root());
    expect(content('file').inert).toBe(true);
  });

  it('menus render in place, hidden, until the host mounts, then leave the bar', () => {
    const { container } = render(<TestMenubar defaultValue="file" />);
    // After mount every menu sits in the host after the bar, not in the bar.
    expect(root().querySelector('[data-part="content"]')).toBeNull();
    expect(container.querySelectorAll('[data-part="content"]')).toHaveLength(3);
    expect(content('file').inert).toBe(false);
  });

  it('controlled value: onValueChange reports the next menu and state follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestMenubar value="" onValueChange={onValueChange} />);
    await user.click(trigger('edit'));
    expect(onValueChange).toHaveBeenLastCalledWith('edit');
    expect(content('edit').inert).toBe(true);

    rerender(<TestMenubar value="edit" onValueChange={onValueChange} />);
    expect(content('edit').inert).toBe(false);
  });

  it('uncontrolled callback fires once per real change', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestMenubar onValueChange={onValueChange} />);
    await user.click(trigger('file'));
    await user.hover(trigger('file'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('file');
    await user.keyboard('{Escape}');
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('a part used outside its provider fails loudly', () => {
    expect(() => render(<MenubarTrigger>File</MenubarTrigger>)).toThrow(
      /must be used within <Menubar>/,
    );
  });

  it('the shadcn namespaced surface renders the same parts', async () => {
    const user = userEvent.setup();
    render(
      <Menubar>
        <Menubar.Menu>
          <Menubar.Trigger>File</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content>
              <Menubar.Label>Document</Menubar.Label>
              <Menubar.Group>
                <Menubar.Item>
                  New Tab <Menubar.Shortcut>Cmd+T</Menubar.Shortcut>
                </Menubar.Item>
              </Menubar.Group>
              <Menubar.Separator />
              <Menubar.CheckboxItem checked>Show ruler</Menubar.CheckboxItem>
              <Menubar.RadioGroup value="a">
                <Menubar.RadioItem value="a">Left</Menubar.RadioItem>
              </Menubar.RadioGroup>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar>,
    );
    const fileTrigger = body().querySelector<HTMLElement>('[data-part="trigger"]')!;
    const menu = body().querySelector<HTMLElement>('[data-part="content"]')!;
    expect(fileTrigger.getAttribute('role')).toBe('menuitem');
    expect(fileTrigger.getAttribute('aria-haspopup')).toBe('menu');
    await user.click(fileTrigger);
    expect(menu.hidden).toBe(false);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(menu.querySelector('[role="menuitemradio"]')?.getAttribute('aria-checked')).toBe('true');
    expect(MenubarShortcut).toBe(Menubar.Shortcut);
  });
});
