import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  isOpen,
  select,
  selectItemAria,
  selectedValue,
  type SelectConfig,
  type SelectPart,
  type SelectState,
} from '../../../src/components/select/select.behavior';

const ids: PartIds<SelectPart> = { root: 'r', trigger: 't', content: 'c', item: '' };

const closed: SelectConfig = {};
const openSeed: SelectConfig = { defaultOpen: true };

function ariaAt(config: SelectConfig, state: SelectState = select.initialState(config)) {
  return select.aria(state, config, ids);
}

describe('select parts', () => {
  it('declares root, trigger, the listbox content, and the many-instance item', () => {
    expect(Object.keys(select.parts).sort()).toEqual(['content', 'item', 'root', 'trigger']);
    expect(select.parts.item.many).toBe(true);
    expect(select.parts.content.optional).toBe(true);
    expect(select.parts.trigger.optional).toBeUndefined();
  });
});

describe('select state: controlled vs intrinsic', () => {
  it('seeds intrinsic open and value from defaults', () => {
    expect(select.initialState({ defaultOpen: true }).open).toBe(true);
    expect(select.initialState({ defaultValue: 'apple' }).value).toBe('apple');
    expect(select.initialState({}).value).toBe('');
    expect(select.initialState({}).highlighted).toBeUndefined();
  });

  it('controlled config shadows intrinsic state on both axes', () => {
    const state = select.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ open: true, value: '', highlighted: undefined }, { open: false })).toBe(false);
    expect(selectedValue({ open: false, value: 'a', highlighted: undefined }, { value: 'b' })).toBe(
      'b',
    );
    expect(selectedValue({ open: false, value: 'a', highlighted: undefined }, {})).toBe('a');
  });
});

describe('select canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = select.initialState(closed);
    expect(select.canDispatch(state, 'open', closed)).toBe(true);
    expect(select.canDispatch(state, 'close', closed)).toBe(false);
    const openState: SelectState = { open: true, value: '', highlighted: undefined };
    expect(select.canDispatch(openState, 'open', closed)).toBe(false);
    expect(select.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('select and highlight are always allowed', () => {
    const state = select.initialState(closed);
    expect(select.canDispatch(state, 'select', closed)).toBe(true);
    expect(select.canDispatch(state, 'highlight', closed)).toBe(true);
  });

  it('gates on the CONTROLLED value when present', () => {
    const drifted: SelectState = { open: false, value: '', highlighted: undefined };
    expect(select.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(select.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('select actions', () => {
  it('open and close move intrinsic open; close clears the highlight', () => {
    const { memory, dispatch } = createBehavior(select, openSeed);
    dispatch('highlight', openSeed, 'cherry');
    expect(memory.get().highlighted).toBe('cherry');
    expect(dispatch('close', openSeed)).toBe(true);
    expect(memory.get().open).toBe(false);
    // Ported handleOpenChange reset: closing clears the keyboard highlight.
    expect(memory.get().highlighted).toBeUndefined();
    expect(dispatch('open', openSeed)).toBe(true);
    expect(memory.get().open).toBe(true);
  });

  it('select replaces value, closes, and clears highlight (single-select)', () => {
    const { memory, dispatch } = createBehavior(select, {});
    dispatch('open', {});
    dispatch('highlight', {}, 'banana');
    expect(dispatch('select', {}, 'banana')).toBe(true);
    expect(memory.get().value).toBe('banana');
    expect(memory.get().open).toBe(false);
    expect(memory.get().highlighted).toBeUndefined();
    // Reselect replaces, not accumulates.
    dispatch('select', {}, 'apple');
    expect(memory.get().value).toBe('apple');
  });

  it('highlight moves only the highlight, never value or open', () => {
    const { memory, dispatch } = createBehavior(select, openSeed);
    dispatch('highlight', openSeed, 'cherry');
    expect(memory.get()).toEqual({ open: true, value: '', highlighted: 'cherry' });
  });
});

describe('select aria projection', () => {
  it('closed: trigger is a collapsed combobox with no dangling aria-controls', () => {
    expect(ariaAt(closed).trigger).toEqual({
      role: 'combobox',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'aria-disabled': undefined,
      'data-state': 'closed',
      'data-disabled': undefined,
    });
  });

  it('open: trigger expands and wires to the listbox by id', () => {
    const aria = ariaAt(openSeed);
    expect(aria.trigger?.['aria-expanded']).toBe('true');
    expect(aria.trigger?.['aria-controls']).toBe('c');
    expect(aria.trigger?.['data-state']).toBe('open');
  });

  it('content is a listbox named by its trigger', () => {
    expect(ariaAt(openSeed).content).toEqual({
      role: 'listbox',
      'aria-labelledby': 't',
      'data-state': 'open',
    });
  });

  it('disabled surfaces on root and trigger', () => {
    const aria = ariaAt({ disabled: true });
    expect(aria.root?.['data-disabled']).toBe('');
    expect(aria.trigger?.['aria-disabled']).toBe('true');
    expect(aria.trigger?.['data-disabled']).toBe('');
  });

  it('empty content id projects an absent aria-controls, never a dangling one', () => {
    const aria = select.aria(select.initialState(openSeed), openSeed, { ...ids, content: '' });
    expect(aria.trigger?.['aria-controls']).toBeUndefined();
  });
});

describe('select item instance projection', () => {
  const state: SelectState = { open: true, value: 'apple', highlighted: 'banana' };
  it('marks the selected option checked and the highlighted option active', () => {
    expect(selectItemAria('apple', state, {})).toEqual({
      'aria-selected': 'true',
      'data-state': 'checked',
      'data-highlighted': undefined,
    });
    expect(selectItemAria('banana', state, {})).toEqual({
      'aria-selected': 'false',
      'data-state': 'unchecked',
      'data-highlighted': '',
    });
  });

  it('reads the CONTROLLED value', () => {
    expect(selectItemAria('cherry', state, { value: 'cherry' })['aria-selected']).toBe('true');
  });
});

describe('select keymap', () => {
  const state = select.initialState(closed);
  it('trigger opens on ArrowDown/ArrowUp/Enter/Space', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ']) {
      expect(select.keymap({ key }, state, 'trigger', closed)).toBe('open');
    }
    expect(select.keymap({ key: 'a' }, state, 'trigger', closed)).toBeNull();
  });

  it('an option commits on Enter/Space and the listbox closes on Escape', () => {
    expect(select.keymap({ key: 'Enter' }, state, 'item', closed)).toBe('select');
    expect(select.keymap({ key: ' ' }, state, 'item', closed)).toBe('select');
    expect(select.keymap({ key: 'Escape' }, state, 'item', closed)).toBe('close');
    expect(select.keymap({ key: 'Escape' }, state, 'content', closed)).toBe('close');
  });
});

describe('select effects', () => {
  it('closed: no effects', () => {
    expect(select.effects(select.initialState(closed), closed)).toEqual([]);
  });

  it('open: roving focus, typeahead, and outside dismissal sparing the trigger', () => {
    expect(select.effects(select.initialState(openSeed), openSeed)).toEqual([
      { type: 'roving-focus', part: 'content', orientation: 'vertical' },
      { type: 'typeahead', part: 'content' },
      { type: 'dismiss-on-outside', part: 'content', action: 'close', exceptParts: ['trigger'] },
    ]);
  });

  it('controlled open drives effects without touching intrinsic state', () => {
    const config: SelectConfig = { open: true };
    expect(select.effects({ open: false, value: '', highlighted: undefined }, config)).toHaveLength(
      3,
    );
  });
});
