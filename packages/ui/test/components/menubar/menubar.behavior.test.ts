import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import { dropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';
import {
  activeMenu,
  menubar,
  menubarInstanceAria,
  stepMenu,
  type MenubarConfig,
  type MenubarState,
  type MenubarStep,
} from '../../../src/components/menubar/menubar.behavior';

const closed: MenubarConfig = {};
const fileOpen: MenubarConfig = { defaultValue: 'file' };
const row = (from: string | null, loop = true): MenubarStep => ({
  values: ['file', 'edit', 'view'],
  from,
  loop,
});
const instance = { trigger: 't-file', content: 'c-file' };

describe('menubar parts', () => {
  it('declares the bar root, and trigger/content/item as many-instance parts', () => {
    expect(Object.keys(menubar.parts).sort()).toEqual(['content', 'item', 'root', 'trigger']);
    expect(menubar.parts.root.role).toBe('menubar');
    expect(menubar.parts.trigger).toEqual({ many: true, role: 'menuitem' });
    expect(menubar.parts.content.many).toBe(true);
    expect(menubar.parts.item.many).toBe(true);
  });

  it('does NOT force a role on the item part (checkbox/radio items vary the role)', () => {
    expect(menubar.parts.item.role).toBeUndefined();
  });

  it('declares instanceAria on the contract', () => {
    expect(menubar.instanceAria).toBe(menubarInstanceAria);
  });
});

describe('menubar state: which menu is open', () => {
  it('seeds the open menu from the default, empty meaning none', () => {
    expect(menubar.initialState(fileOpen)).toEqual({ active: 'file', pointerOpened: false });
    expect(menubar.initialState({ defaultValue: '' }).active).toBeNull();
    expect(menubar.initialState(closed).active).toBeNull();
  });

  it('controlled value shadows intrinsic state', () => {
    expect(activeMenu({ active: 'file', pointerOpened: false }, { value: 'edit' })).toBe('edit');
    expect(activeMenu({ active: 'file', pointerOpened: false }, { value: '' })).toBeNull();
    expect(activeMenu({ active: 'file', pointerOpened: false }, {})).toBe('file');
  });
});

describe('menubar actions', () => {
  it('open switches the one open menu; close closes it', () => {
    const { memory, dispatch } = createBehavior(menubar, closed);
    expect(dispatch('open', closed, 'file')).toBe(true);
    expect(memory.get().active).toBe('file');
    expect(dispatch('open', closed, 'edit')).toBe(true);
    expect(memory.get().active).toBe('edit');
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().active).toBeNull();
  });

  it('close, next and prev are refused while every menu is closed', () => {
    const state = menubar.initialState(closed);
    expect(menubar.canDispatch(state, 'close', closed)).toBe(false);
    expect(menubar.canDispatch(state, 'next', closed)).toBe(false);
    expect(menubar.canDispatch(state, 'prev', closed)).toBe(false);
    expect(menubar.canDispatch(state, 'open', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted: MenubarState = { active: null, pointerOpened: false };
    expect(menubar.canDispatch(drifted, 'close', { value: 'file' })).toBe(true);
    expect(
      menubar.canDispatch({ active: 'file', pointerOpened: false }, 'close', { value: '' }),
    ).toBe(false);
  });

  it('toggle opens a closed menu, switches from another, and closes the open one', () => {
    const { memory, dispatch } = createBehavior(menubar, closed);
    dispatch('toggle', closed, { value: 'file', from: null });
    expect(memory.get().active).toBe('file');
    dispatch('toggle', closed, { value: 'edit', from: 'file' });
    expect(memory.get().active).toBe('edit');
    dispatch('toggle', closed, { value: 'edit', from: 'edit' });
    expect(memory.get().active).toBeNull();
  });

  it('follow switches the open menu and absorbs exactly one click on that trigger', () => {
    const { memory, dispatch } = createBehavior(menubar, fileOpen);
    expect(dispatch('follow', fileOpen, { value: 'edit', from: 'file' })).toBe(true);
    expect(memory.get()).toEqual({ active: 'edit', pointerOpened: true });
    // The click of the same gesture keeps the menu the crossing just opened...
    dispatch('toggle', fileOpen, { value: 'edit', from: 'edit' });
    expect(memory.get()).toEqual({ active: 'edit', pointerOpened: false });
    // ...and the next click on it closes, as a menubar title click does.
    dispatch('toggle', fileOpen, { value: 'edit', from: 'edit' });
    expect(memory.get().active).toBeNull();
  });

  it('crossing onto the open menu trigger never arms the absorption', () => {
    const { memory, dispatch } = createBehavior(menubar, fileOpen);
    dispatch('follow', fileOpen, { value: 'file', from: 'file' });
    expect(memory.get().pointerOpened).toBe(false);
  });

  it('follow is refused while every menu is closed (hover opens nothing)', () => {
    const state = menubar.initialState(closed);
    expect(menubar.canDispatch(state, 'follow', closed)).toBe(false);
    expect(menubar.canDispatch(state, 'toggle', closed)).toBe(true);
  });

  it('toggle decides from the EFFECTIVE open menu, so a controlled menubar can close', () => {
    const controlled: MenubarConfig = { value: 'file' };
    const { memory, dispatch } = createBehavior(menubar, {});
    dispatch('toggle', controlled, { value: 'file', from: 'file' });
    expect(memory.get().active).toBeNull();
  });

  it('next and prev move the open menu to the neighbouring trigger, wrapping', () => {
    const { memory, dispatch } = createBehavior(menubar, fileOpen);
    expect(dispatch('next', fileOpen, row('file'))).toBe(true);
    expect(memory.get().active).toBe('edit');
    expect(dispatch('prev', fileOpen, row('edit'))).toBe(true);
    expect(memory.get().active).toBe('file');
    expect(dispatch('prev', fileOpen, row('file'))).toBe(true);
    expect(memory.get().active).toBe('view');
  });
});

describe('menubar stepMenu (pure)', () => {
  it('wraps at both ends when looping', () => {
    expect(stepMenu(row('view'), 1)).toBe('file');
    expect(stepMenu(row('file'), -1)).toBe('view');
  });

  it('clamps at both ends when not looping', () => {
    expect(stepMenu(row('view', false), 1)).toBe('view');
    expect(stepMenu(row('file', false), -1)).toBe('file');
  });

  it('starts from an end when the current menu is not in the row', () => {
    expect(stepMenu(row(null), 1)).toBe('file');
    expect(stepMenu(row('gone'), -1)).toBe('view');
  });

  it('an empty row has no neighbour', () => {
    expect(stepMenu({ values: [], from: 'file', loop: true }, 1)).toBeNull();
  });
});

describe('menubar aria projection', () => {
  it('root is a horizontal menubar carrying the open data-state', () => {
    const ids = { root: 'r', trigger: '', content: '', item: '' };
    expect(menubar.aria(menubar.initialState(closed), closed, ids).root).toEqual({
      role: 'menubar',
      'aria-orientation': 'horizontal',
      'data-state': 'closed',
    });
    expect(menubar.aria(menubar.initialState(fileOpen), fileOpen, ids).root?.['data-state']).toBe(
      'open',
    );
  });

  it("each trigger is dropdown-menu's menu button, as a menuitem of the bar", () => {
    const state = menubar.initialState(fileOpen);
    const menu = dropdownMenu.aria(
      { open: true },
      {},
      {
        root: '',
        trigger: 't-file',
        content: 'c-file',
        item: '',
      },
    );
    expect(menubarInstanceAria('trigger', 'file', state, fileOpen, instance)).toEqual({
      ...menu.trigger,
      role: 'menuitem',
    });
    expect(menubarInstanceAria('trigger', 'file', state, fileOpen, instance)).toEqual({
      role: 'menuitem',
      'aria-haspopup': 'menu',
      'aria-expanded': 'true',
      'aria-controls': 'c-file',
      'data-state': 'open',
    });
  });

  it("each menu is dropdown-menu's vertical menu, named by its trigger", () => {
    const state = menubar.initialState(fileOpen);
    expect(menubarInstanceAria('content', 'file', state, fileOpen, instance)).toEqual({
      role: 'menu',
      'aria-orientation': 'vertical',
      'aria-labelledby': 't-file',
      'data-state': 'open',
    });
  });

  it('only the open menu projects open; the others are collapsed with no aria-controls', () => {
    const state = menubar.initialState(fileOpen);
    const edit = { trigger: 't-edit', content: 'c-edit' };
    const trigger = menubarInstanceAria('trigger', 'edit', state, fileOpen, edit);
    expect(trigger['aria-expanded']).toBe('false');
    expect(trigger['aria-controls']).toBeUndefined();
    expect(menubarInstanceAria('content', 'edit', state, fileOpen, edit)['data-state']).toBe(
      'closed',
    );
  });

  it('empty ids project absence, never a dangling reference', () => {
    const state = menubar.initialState(fileOpen);
    const bare = { trigger: '', content: '' };
    expect(menubarInstanceAria('trigger', 'file', state, fileOpen, bare)['aria-controls']).toBe(
      undefined,
    );
    expect(menubarInstanceAria('content', 'file', state, fileOpen, bare)['aria-labelledby']).toBe(
      undefined,
    );
  });

  it('parts without an instance projection project nothing', () => {
    const state = menubar.initialState(fileOpen);
    expect(menubarInstanceAria('item', 'file', state, fileOpen, instance)).toEqual({});
    expect(menubarInstanceAria('root', 'file', state, fileOpen, instance)).toEqual({});
  });
});

describe('menubar keymap', () => {
  const state = menubar.initialState(fileOpen);

  it("the trigger opens on dropdown-menu's keys: ArrowDown/ArrowUp/Enter/Space", () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      expect(menubar.keymap({ key }, state, 'trigger', fileOpen)).toBe('open');
    }
  });

  it('ArrowLeft/Right on a trigger are the rove, not a score action', () => {
    expect(menubar.keymap({ key: 'ArrowRight' }, state, 'trigger', fileOpen)).toBeNull();
    expect(menubar.keymap({ key: 'ArrowLeft' }, state, 'trigger', fileOpen)).toBeNull();
  });

  it('Escape closes from inside a menu', () => {
    expect(menubar.keymap({ key: 'Escape' }, state, 'content', fileOpen)).toBe('close');
    expect(menubar.keymap({ key: 'Escape' }, state, 'item', fileOpen)).toBe('close');
  });

  it('ArrowRight/ArrowLeft inside a menu move to the neighbouring menu', () => {
    expect(menubar.keymap({ key: 'ArrowRight' }, state, 'item', fileOpen)).toBe('next');
    expect(menubar.keymap({ key: 'ArrowLeft' }, state, 'item', fileOpen)).toBe('prev');
    expect(menubar.keymap({ key: 'ArrowRight' }, state, 'content', fileOpen)).toBe('next');
  });

  it('Enter/Space on an item are NOT score keymap actions (div-as-button click path)', () => {
    expect(menubar.keymap({ key: 'Enter' }, state, 'item', fileOpen)).toBeNull();
    expect(menubar.keymap({ key: ' ' }, state, 'item', fileOpen)).toBeNull();
  });

  it('keys on the root claim nothing', () => {
    expect(menubar.keymap({ key: 'Escape' }, state, 'root', fileOpen)).toBeNull();
  });
});
