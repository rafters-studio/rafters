import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  dropdownMenu,
  isOpen,
  type DropdownMenuConfig,
  type DropdownMenuPart,
  type DropdownMenuState,
} from '../../../src/components/dropdown-menu/dropdown-menu.behavior';

const ids: PartIds<DropdownMenuPart> = { root: 'r', trigger: 't', content: 'c', item: '' };

const closed: DropdownMenuConfig = {};
const openSeed: DropdownMenuConfig = { defaultOpen: true };

function ariaAt(
  config: DropdownMenuConfig,
  state: DropdownMenuState = dropdownMenu.initialState(config),
) {
  return dropdownMenu.aria(state, config, ids);
}

describe('dropdown-menu parts', () => {
  it('declares root, trigger, the menu content, and the many-instance item', () => {
    expect(Object.keys(dropdownMenu.parts).sort()).toEqual(['content', 'item', 'root', 'trigger']);
    expect(dropdownMenu.parts.item.many).toBe(true);
    expect(dropdownMenu.parts.content.optional).toBe(true);
    expect(dropdownMenu.parts.trigger.optional).toBeUndefined();
  });

  it('does NOT force a role on the item part (checkbox/radio items vary the role)', () => {
    expect(dropdownMenu.parts.item.role).toBeUndefined();
  });
});

describe('dropdown-menu state: controlled vs intrinsic', () => {
  it('seeds intrinsic open from the default', () => {
    expect(dropdownMenu.initialState({ defaultOpen: true }).open).toBe(true);
    expect(dropdownMenu.initialState({}).open).toBe(false);
  });

  it('controlled config shadows intrinsic state', () => {
    expect(isOpen({ open: false }, { open: true })).toBe(true);
    expect(isOpen({ open: true }, { open: false })).toBe(false);
    expect(isOpen({ open: true }, {})).toBe(true);
  });
});

describe('dropdown-menu canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = dropdownMenu.initialState(closed);
    expect(dropdownMenu.canDispatch(state, 'open', closed)).toBe(true);
    expect(dropdownMenu.canDispatch(state, 'close', closed)).toBe(false);
    const openState: DropdownMenuState = { open: true };
    expect(dropdownMenu.canDispatch(openState, 'open', closed)).toBe(false);
    expect(dropdownMenu.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted: DropdownMenuState = { open: false };
    expect(dropdownMenu.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(dropdownMenu.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('dropdown-menu actions', () => {
  it('open and close move intrinsic open once per real transition', () => {
    const { memory, dispatch } = createBehavior(dropdownMenu, closed);
    expect(dispatch('open', closed)).toBe(true);
    expect(memory.get().open).toBe(true);
    // Idempotent: opening the open is rejected.
    expect(dispatch('open', closed)).toBe(false);
    expect(dispatch('close', closed)).toBe(true);
    expect(memory.get().open).toBe(false);
    expect(dispatch('close', closed)).toBe(false);
  });
});

describe('dropdown-menu aria projection', () => {
  it('closed: trigger is a collapsed menu button with no dangling aria-controls', () => {
    expect(ariaAt(closed).trigger).toEqual({
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'data-state': 'closed',
    });
  });

  it('open: trigger expands and wires to the menu by id', () => {
    const aria = ariaAt(openSeed);
    expect(aria.trigger?.['aria-expanded']).toBe('true');
    expect(aria.trigger?.['aria-controls']).toBe('c');
    expect(aria.trigger?.['data-state']).toBe('open');
    expect(aria.trigger?.['aria-haspopup']).toBe('menu');
  });

  it('content is a vertical menu named by its trigger', () => {
    expect(ariaAt(openSeed).content).toEqual({
      role: 'menu',
      'aria-orientation': 'vertical',
      'aria-labelledby': 't',
      'data-state': 'open',
    });
  });

  it('root carries the open data-state', () => {
    expect(ariaAt(closed).root).toEqual({ 'data-state': 'closed' });
    expect(ariaAt(openSeed).root).toEqual({ 'data-state': 'open' });
  });

  it('empty trigger id projects an absent aria-labelledby, never a dangling one', () => {
    const aria = dropdownMenu.aria(dropdownMenu.initialState(openSeed), openSeed, {
      ...ids,
      trigger: '',
    });
    expect(aria.content?.['aria-labelledby']).toBeUndefined();
  });

  it('empty content id projects an absent aria-controls, never a dangling one', () => {
    const aria = dropdownMenu.aria(dropdownMenu.initialState(openSeed), openSeed, {
      ...ids,
      content: '',
    });
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
  });
});

describe('dropdown-menu keymap', () => {
  const state = dropdownMenu.initialState(closed);

  it('trigger opens on ArrowDown/ArrowUp/Enter/Space', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      expect(dropdownMenu.keymap({ key }, state, 'trigger', closed)).toBe('open');
    }
    expect(dropdownMenu.keymap({ key: 'a' }, state, 'trigger', closed)).toBeNull();
  });

  it('the menu closes on Escape from the content or an item', () => {
    expect(dropdownMenu.keymap({ key: 'Escape' }, state, 'content', closed)).toBe('close');
    expect(dropdownMenu.keymap({ key: 'Escape' }, state, 'item', closed)).toBe('close');
  });

  it('Enter/Space on an item is NOT a score keymap action (div-as-button click path)', () => {
    expect(dropdownMenu.keymap({ key: 'Enter' }, state, 'item', closed)).toBeNull();
    expect(dropdownMenu.keymap({ key: ' ' }, state, 'item', closed)).toBeNull();
  });
});

// The open-menu effect trio (roving focus, typeahead, trigger-spared outside
// dismissal) is not a declarative effect-spec on the score; the bindings compose
// the primitives directly via startDropdownMenuEffects. The BEHAVIOR is asserted
// end to end in the conformance suites (dropdown-menu.conformance.test.tsx /
// .astro. / .element.): arrows rove the items, a keystroke jumps focus to the
// matching item, activating an item closes, and a pointerdown outside dismisses.
