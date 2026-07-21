import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  combobox,
  comboboxItemAria,
  isOpen,
  matchesQuery,
  nextHighlight,
  selectedValue,
  type ComboboxConfig,
  type ComboboxPart,
  type ComboboxState,
} from '../../../src/components/combobox/combobox.behavior';

const ids: PartIds<ComboboxPart> = {
  root: 'r',
  input: 'i',
  trigger: 'tg',
  content: 'c',
  item: '',
  empty: 'e',
};

const closed: ComboboxConfig = {};
const openSeed: ComboboxConfig = { defaultOpen: true };

function ariaAt(config: ComboboxConfig, state: ComboboxState = combobox.initialState(config)) {
  return combobox.aria(state, config, ids);
}

describe('combobox parts', () => {
  it('declares the input, the toggle, the listbox content, the many-instance item, and the empty state', () => {
    expect(Object.keys(combobox.parts).sort()).toEqual([
      'content',
      'empty',
      'input',
      'item',
      'root',
      'trigger',
    ]);
    expect(combobox.parts.item.many).toBe(true);
    expect(combobox.parts.content.optional).toBe(true);
    expect(combobox.parts.trigger.optional).toBe(true);
    expect(combobox.parts.empty.optional).toBe(true);
    expect(combobox.parts.input.optional).toBeUndefined();
  });
});

describe('combobox state: controlled vs intrinsic', () => {
  it('seeds open, value, empty query, and no highlight from defaults', () => {
    expect(combobox.initialState({ defaultOpen: true }).open).toBe(true);
    expect(combobox.initialState({ defaultValue: 'react' }).value).toBe('react');
    expect(combobox.initialState({}).value).toBe('');
    expect(combobox.initialState({}).query).toBe('');
    expect(combobox.initialState({}).highlighted).toBeUndefined();
  });

  it('controlled config shadows intrinsic state on both axes', () => {
    const state = combobox.initialState({});
    expect(isOpen(state, { open: true })).toBe(true);
    expect(isOpen({ ...state, open: true }, { open: false })).toBe(false);
    expect(selectedValue({ ...state, value: 'a' }, { value: 'b' })).toBe('b');
    expect(selectedValue({ ...state, value: 'a' }, {})).toBe('a');
  });
});

describe('combobox canDispatch (idempotence gate)', () => {
  it('open only when effectively closed, close only when effectively open', () => {
    const state = combobox.initialState(closed);
    expect(combobox.canDispatch(state, 'open', closed)).toBe(true);
    expect(combobox.canDispatch(state, 'close', closed)).toBe(false);
    const openState: ComboboxState = { ...state, open: true };
    expect(combobox.canDispatch(openState, 'open', closed)).toBe(false);
    expect(combobox.canDispatch(openState, 'close', closed)).toBe(true);
  });

  it('setQuery, highlight, navigation, and select are always allowed', () => {
    const state = combobox.initialState(closed);
    for (const action of [
      'setQuery',
      'highlight',
      'highlightNext',
      'highlightPrev',
      'select',
    ] as const) {
      expect(combobox.canDispatch(state, action, closed)).toBe(true);
    }
  });

  it('gates on the CONTROLLED open when present', () => {
    const drifted: ComboboxState = { ...combobox.initialState(closed), open: false };
    expect(combobox.canDispatch(drifted, 'close', { open: true })).toBe(true);
    expect(combobox.canDispatch(drifted, 'open', { open: true })).toBe(false);
  });
});

describe('combobox actions', () => {
  it('open and close move intrinsic open and clear the highlight', () => {
    const { memory, dispatch } = createBehavior(combobox, openSeed);
    dispatch('highlight', openSeed, 'vue');
    expect(memory.get().highlighted).toBe('vue');
    expect(dispatch('close', openSeed)).toBe(true);
    expect(memory.get().open).toBe(false);
    expect(memory.get().highlighted).toBeUndefined();
    expect(dispatch('open', openSeed)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(memory.get().highlighted).toBeUndefined();
  });

  it('setQuery writes the text, opens the list, and clears the highlight', () => {
    const { memory, dispatch } = createBehavior(combobox, {});
    dispatch('highlight', {}, 'react');
    expect(dispatch('setQuery', {}, 'vu')).toBe(true);
    expect(memory.get().query).toBe('vu');
    expect(memory.get().open).toBe(true);
    expect(memory.get().highlighted).toBeUndefined();
  });

  it('select persists the value, fills the query with the label, closes, and clears the highlight', () => {
    const { memory, dispatch } = createBehavior(combobox, {});
    dispatch('open', {});
    dispatch('highlight', {}, 'vue');
    expect(dispatch('select', {}, { value: 'vue', label: 'Vue' })).toBe(true);
    expect(memory.get().value).toBe('vue');
    expect(memory.get().query).toBe('Vue');
    expect(memory.get().open).toBe(false);
    expect(memory.get().highlighted).toBeUndefined();
  });

  it('highlightNext opens and steps forward, clamped at the last option', () => {
    const { memory, dispatch } = createBehavior(combobox, {});
    const values = ['react', 'vue', 'angular'];
    expect(dispatch('highlightNext', {}, values)).toBe(true);
    expect(memory.get().open).toBe(true);
    expect(memory.get().highlighted).toBe('react');
    dispatch('highlightNext', {}, values);
    expect(memory.get().highlighted).toBe('vue');
    dispatch('highlightNext', {}, values);
    dispatch('highlightNext', {}, values);
    expect(memory.get().highlighted).toBe('angular');
  });

  it('highlightPrev steps backward, clamped at the first option', () => {
    const { memory, dispatch } = createBehavior(combobox, openSeed);
    const values = ['react', 'vue', 'angular'];
    dispatch('highlight', openSeed, 'angular');
    dispatch('highlightPrev', openSeed, values);
    expect(memory.get().highlighted).toBe('vue');
    dispatch('highlightPrev', openSeed, values);
    dispatch('highlightPrev', openSeed, values);
    expect(memory.get().highlighted).toBe('react');
  });
});

describe('combobox pure helpers', () => {
  it('matchesQuery matches on label OR value, case-insensitively, and empty matches all', () => {
    expect(matchesQuery('React', 'react', '')).toBe(true);
    expect(matchesQuery('React', 'react', 'ac')).toBe(true);
    expect(matchesQuery('React', 'react', 'REA')).toBe(true);
    // Value carries the match even when the label does not.
    expect(matchesQuery('Framework one', 'react', 'rea')).toBe(true);
    expect(matchesQuery('React', 'react', 'zzz')).toBe(false);
  });

  it('nextHighlight clamps at both ends and lands on the first from no highlight', () => {
    const values = ['a', 'b', 'c'];
    expect(nextHighlight(values, undefined, 1)).toBe('a');
    expect(nextHighlight(values, undefined, -1)).toBe('a');
    expect(nextHighlight(values, 'a', 1)).toBe('b');
    expect(nextHighlight(values, 'c', 1)).toBe('c');
    expect(nextHighlight(values, 'a', -1)).toBe('a');
    expect(nextHighlight([], undefined, 1)).toBeUndefined();
  });
});

describe('combobox aria projection', () => {
  it('closed: input is a collapsed combobox with no dangling controls or activedescendant', () => {
    expect(ariaAt(closed).input).toEqual({
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': undefined,
      'aria-activedescendant': undefined,
      'aria-disabled': undefined,
      'data-state': 'closed',
    });
  });

  it('open: input expands and wires to the listbox by id', () => {
    const aria = ariaAt(openSeed);
    expect(aria.input?.['aria-expanded']).toBe('true');
    expect(aria.input?.['aria-controls']).toBe('c');
    expect(aria.input?.['data-state']).toBe('open');
    // No highlight yet -> no activedescendant.
    expect(aria.input?.['aria-activedescendant']).toBeUndefined();
  });

  it('open with a highlight: activedescendant points at the highlighted option id', () => {
    const state: ComboboxState = { ...combobox.initialState(openSeed), highlighted: 'vue' };
    expect(ariaAt(openSeed, state).input?.['aria-activedescendant']).toBe('c-option-vue');
  });

  it('content is a listbox named by its input', () => {
    expect(ariaAt(openSeed).content).toEqual({
      role: 'listbox',
      'aria-labelledby': 'i',
      'data-state': 'open',
    });
  });

  it("the toggle's accessible name tracks the gesture: Open when closed, Close when open", () => {
    expect(ariaAt(closed).trigger).toEqual({ 'aria-label': 'Open' });
    expect(ariaAt(openSeed).trigger).toEqual({ 'aria-label': 'Close' });
  });

  it('disabled surfaces on root and input', () => {
    const aria = ariaAt({ disabled: true });
    expect(aria.root?.['data-disabled']).toBe('');
    expect(aria.input?.['aria-disabled']).toBe('true');
  });

  it('empty content id projects an absent activedescendant, never a dangling one', () => {
    const state: ComboboxState = { ...combobox.initialState(openSeed), highlighted: 'vue' };
    const aria = combobox.aria(state, openSeed, { ...ids, content: '' });
    expect(aria.input?.['aria-activedescendant']).toBeUndefined();
    expect(aria.input?.['aria-controls']).toBeUndefined();
  });
});

describe('combobox item instance projection', () => {
  const state: ComboboxState = { open: true, query: '', value: 'react', highlighted: 'vue' };
  it('marks the selected option checked and the highlighted option active', () => {
    expect(comboboxItemAria('react', state, {})).toEqual({
      'aria-selected': 'true',
      'data-state': 'checked',
      'data-highlighted': undefined,
    });
    expect(comboboxItemAria('vue', state, {})).toEqual({
      'aria-selected': 'false',
      'data-state': 'unchecked',
      'data-highlighted': '',
    });
  });

  it('reads the CONTROLLED value', () => {
    expect(comboboxItemAria('angular', state, { value: 'angular' })['aria-selected']).toBe('true');
  });
});

describe('combobox keymap (all keys ride the input)', () => {
  const openState: ComboboxState = { open: true, query: '', value: '', highlighted: 'vue' };
  const closedState = combobox.initialState(closed);

  it('ArrowDown steps the highlight and opens a closed list', () => {
    expect(combobox.keymap({ key: 'ArrowDown' }, closedState, 'input', closed)).toBe(
      'highlightNext',
    );
    expect(combobox.keymap({ key: 'ArrowDown' }, openState, 'input', closed)).toBe('highlightNext');
  });

  it('ArrowUp steps only while open', () => {
    expect(combobox.keymap({ key: 'ArrowUp' }, openState, 'input', closed)).toBe('highlightPrev');
    expect(combobox.keymap({ key: 'ArrowUp' }, closedState, 'input', closed)).toBeNull();
  });

  it('Enter commits only an open list with a highlight', () => {
    expect(combobox.keymap({ key: 'Enter' }, openState, 'input', closed)).toBe('select');
    const noHighlight: ComboboxState = { ...openState, highlighted: undefined };
    expect(combobox.keymap({ key: 'Enter' }, noHighlight, 'input', closed)).toBeNull();
  });

  it('Escape and Tab close only an open list', () => {
    expect(combobox.keymap({ key: 'Escape' }, openState, 'input', closed)).toBe('close');
    expect(combobox.keymap({ key: 'Tab' }, openState, 'input', closed)).toBe('close');
    expect(combobox.keymap({ key: 'Escape' }, closedState, 'input', closed)).toBeNull();
  });

  it('claims no keys off the input and ignores plain typing keys', () => {
    expect(combobox.keymap({ key: 'ArrowDown' }, openState, 'content', closed)).toBeNull();
    expect(combobox.keymap({ key: 'a' }, openState, 'input', closed)).toBeNull();
  });
});
