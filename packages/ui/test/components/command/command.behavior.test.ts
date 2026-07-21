import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  command,
  commandItemAria,
  isEmptyShown,
  matchesQuery,
  moveHighlight,
  queryValue,
  type CommandConfig,
  type CommandPart,
  type CommandState,
} from '../../../src/components/command/command.behavior';

const ids: PartIds<CommandPart> = { root: 'r', input: 'i', list: 'l', item: '', empty: 'e' };

function ariaAt(config: CommandConfig, state: CommandState = command.initialState(config)) {
  return command.aria(state, config, ids);
}

describe('command parts', () => {
  it('declares root, the combobox input, the listbox list, the many-instance item, and the empty state', () => {
    expect(Object.keys(command.parts).sort()).toEqual(['empty', 'input', 'item', 'list', 'root']);
    expect(command.parts.item.many).toBe(true);
    expect(command.parts.input.role).toBe('combobox');
    expect(command.parts.list.role).toBe('listbox');
    expect(command.parts.item.role).toBe('option');
    expect(command.parts.empty.optional).toBe(true);
  });
});

describe('command state: controlled vs intrinsic', () => {
  it('seeds intrinsic query from value or defaultValue and leaves nothing highlighted', () => {
    expect(command.initialState({ value: 'cal' }).query).toBe('cal');
    expect(command.initialState({ defaultValue: 'set' }).query).toBe('set');
    expect(command.initialState({}).query).toBe('');
    expect(command.initialState({}).highlighted).toBeUndefined();
  });

  it('controlled config shadows intrinsic query', () => {
    expect(queryValue({ query: 'a', highlighted: undefined }, { value: 'b' })).toBe('b');
    expect(queryValue({ query: 'a', highlighted: undefined }, {})).toBe('a');
  });
});

describe('command fuzzy matching', () => {
  it('an empty query matches every option', () => {
    expect(matchesQuery('Calendar', '')).toBe(true);
  });

  it('a substring or fuzzy subsequence matches; an absent character does not', () => {
    expect(matchesQuery('Calendar', 'cal')).toBe(true);
    expect(matchesQuery('Calendar', 'cldr')).toBe(true);
    expect(matchesQuery('Calendar', 'xyz')).toBe(false);
  });
});

describe('command moveHighlight (clamp, never wrap)', () => {
  const visible = ['a', 'b', 'c'];

  it('an undefined current lands on the first option for next and prev', () => {
    expect(moveHighlight(visible, undefined, 'next')).toBe('a');
    expect(moveHighlight(visible, undefined, 'prev')).toBe('a');
  });

  it('next clamps at the last option instead of wrapping to the first', () => {
    expect(moveHighlight(visible, 'b', 'next')).toBe('c');
    expect(moveHighlight(visible, 'c', 'next')).toBe('c');
  });

  it('prev clamps at the first option instead of wrapping to the last', () => {
    expect(moveHighlight(visible, 'b', 'prev')).toBe('a');
    expect(moveHighlight(visible, 'a', 'prev')).toBe('a');
  });

  it('first and last jump to the ends; an empty set clears the highlight', () => {
    expect(moveHighlight(visible, 'b', 'first')).toBe('a');
    expect(moveHighlight(visible, 'b', 'last')).toBe('c');
    expect(moveHighlight([], 'b', 'next')).toBeUndefined();
  });
});

describe('command actions', () => {
  it('setQuery replaces the query and resets the highlight', () => {
    const { memory, dispatch } = createBehavior(command, {});
    dispatch('highlight', {}, 'calendar');
    expect(memory.get().highlighted).toBe('calendar');
    dispatch('setQuery', {}, 'set');
    expect(memory.get().query).toBe('set');
    expect(memory.get().highlighted).toBeUndefined();
  });

  it('highlight moves only the highlight; the nav actions step over the visible payload', () => {
    const { memory, dispatch } = createBehavior(command, {});
    dispatch('highlight', {}, 'a');
    expect(memory.get().highlighted).toBe('a');
    dispatch('highlightNext', {}, ['a', 'b', 'c']);
    expect(memory.get().highlighted).toBe('b');
    dispatch('highlightLast', {}, ['a', 'b', 'c']);
    expect(memory.get().highlighted).toBe('c');
    dispatch('highlightFirst', {}, ['a', 'b', 'c']);
    expect(memory.get().highlighted).toBe('a');
  });

  it('select settles the highlight on the committed option', () => {
    const { memory, dispatch } = createBehavior(command, {});
    expect(dispatch('select', {}, 'search')).toBe(true);
    expect(memory.get().highlighted).toBe('search');
  });
});

describe('command aria projection', () => {
  it('the input is an always-expanded combobox wired to the listbox by id', () => {
    expect(ariaAt({}).input).toEqual({
      role: 'combobox',
      'aria-autocomplete': 'list',
      'aria-expanded': 'true',
      'aria-controls': 'l',
    });
  });

  it('the listbox names itself from the label config, defaulting to Suggestions', () => {
    expect(ariaAt({}).list).toEqual({ role: 'listbox', 'aria-label': 'Suggestions' });
    expect(ariaAt({ label: 'Actions' }).list?.['aria-label']).toBe('Actions');
  });

  it('an empty list id projects an absent aria-controls, never a dangling one', () => {
    const aria = command.aria(command.initialState({}), {}, { ...ids, list: '' });
    expect(aria.input?.['aria-controls']).toBeUndefined();
  });
});

describe('command item instance projection', () => {
  it('hides options that do not match and marks the highlighted one active', () => {
    const state: CommandState = { query: 'cal', highlighted: 'calendar' };
    expect(commandItemAria('calendar', state, {})).toEqual({
      'aria-selected': 'true',
      'data-selected': '',
      'data-highlighted': '',
      hidden: undefined,
    });
    expect(commandItemAria('settings', state, {})).toEqual({
      'aria-selected': 'false',
      'data-selected': undefined,
      'data-highlighted': undefined,
      hidden: true,
    });
  });

  it('reads the CONTROLLED query when deciding visibility', () => {
    const state: CommandState = { query: '', highlighted: undefined };
    expect(commandItemAria('calendar', state, { value: 'zzz' }).hidden).toBe(true);
  });
});

describe('command empty state rule', () => {
  it('shows only when the user has typed and nothing matches', () => {
    expect(isEmptyShown(0, 'zzz')).toBe(true);
    expect(isEmptyShown(2, 'zzz')).toBe(false);
    expect(isEmptyShown(0, '')).toBe(false);
  });
});

describe('command keymap', () => {
  const state = command.initialState({});

  it('maps the input navigation and commit keys', () => {
    expect(command.keymap({ key: 'ArrowDown' }, state, 'input', {})).toBe('highlightNext');
    expect(command.keymap({ key: 'ArrowUp' }, state, 'input', {})).toBe('highlightPrev');
    expect(command.keymap({ key: 'Home' }, state, 'input', {})).toBe('highlightFirst');
    expect(command.keymap({ key: 'End' }, state, 'input', {})).toBe('highlightLast');
    expect(command.keymap({ key: 'Enter' }, state, 'input', {})).toBe('select');
    expect(command.keymap({ key: 'a' }, state, 'input', {})).toBeNull();
  });

  it('claims no keys off the input', () => {
    expect(command.keymap({ key: 'ArrowDown' }, state, 'item', {})).toBeNull();
    expect(command.keymap({ key: 'Enter' }, state, 'list', {})).toBeNull();
  });
});
