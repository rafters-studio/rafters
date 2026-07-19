/**
 * Pure behavior test for the toggle-group score. No DOM: exercises reducers,
 * aria/keymap projections, canDispatch gates, and the per-instance toggleItemAria
 * projection directly.
 */
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  emitValue,
  selectedValues,
  toggleGroup,
  toggleItemAria,
  type ToggleGroupConfig,
  type ToggleGroupState,
} from '../../../src/components/toggle-group/toggle-group.behavior';

const single: ToggleGroupConfig = { type: 'single' };
const multiple: ToggleGroupConfig = { type: 'multiple' };
const ids = { root: 'tg', item: 'tg-item' };

describe('toggle-group initialState', () => {
  it('single seeds from a string defaultValue', () => {
    expect(toggleGroup.initialState({ type: 'single', defaultValue: 'b' })).toEqual({
      value: ['b'],
      multiple: false,
    });
  });

  it('multiple seeds from an array defaultValue', () => {
    expect(toggleGroup.initialState({ type: 'multiple', defaultValue: ['a', 'c'] })).toEqual({
      value: ['a', 'c'],
      multiple: true,
    });
  });

  it('single clamps a multi-value seed to the first', () => {
    expect(toggleGroup.initialState({ type: 'single', defaultValue: ['a', 'b'] })).toEqual({
      value: ['a'],
      multiple: false,
    });
  });

  it("treats '' and undefined as nothing selected", () => {
    expect(toggleGroup.initialState({ defaultValue: '' })).toEqual({ value: [], multiple: false });
    expect(toggleGroup.initialState({})).toEqual({ value: [], multiple: false });
  });

  it('seeds from a controlled value', () => {
    expect(toggleGroup.initialState({ type: 'multiple', value: ['x'] })).toEqual({
      value: ['x'],
      multiple: true,
    });
  });
});

describe('toggle-group selectedValues (controlled shadows intrinsic)', () => {
  it('reads intrinsic state when uncontrolled', () => {
    expect(selectedValues({ value: ['x'], multiple: false }, single)).toEqual(['x']);
  });

  it('a controlled value shadows the intrinsic state', () => {
    expect(
      selectedValues({ value: ['x'], multiple: false }, { type: 'single', value: 'y' }),
    ).toEqual(['y']);
  });

  it('a controlled multiple value is read as an array', () => {
    expect(
      selectedValues({ value: [], multiple: true }, { type: 'multiple', value: ['a', 'b'] }),
    ).toEqual(['a', 'b']);
  });

  it('a controlled single value is clamped to the first', () => {
    expect(
      selectedValues({ value: [], multiple: false }, { type: 'single', value: ['a', 'b'] }),
    ).toEqual(['a']);
  });
});

describe('toggle-group toggle action -- single (collapsible)', () => {
  it('selects a value', () => {
    const { memory, dispatch } = createBehavior(toggleGroup, single);
    expect(dispatch('toggle', single, 'a')).toBe(true);
    expect(memory.get().value).toEqual(['a']);
  });

  it('re-toggling the selected value clears it (collapsible)', () => {
    const config: ToggleGroupConfig = { type: 'single', defaultValue: 'a' };
    const { memory, dispatch } = createBehavior(toggleGroup, config);
    dispatch('toggle', config, 'a');
    expect(memory.get().value).toEqual([]);
  });

  it('selecting a different value replaces the selection', () => {
    const config: ToggleGroupConfig = { type: 'single', defaultValue: 'a' };
    const { memory, dispatch } = createBehavior(toggleGroup, config);
    dispatch('toggle', config, 'b');
    expect(memory.get().value).toEqual(['b']);
  });
});

describe('toggle-group toggle action -- multiple (additive)', () => {
  it('adds values to the set', () => {
    const { memory, dispatch } = createBehavior(toggleGroup, multiple);
    dispatch('toggle', multiple, 'a');
    dispatch('toggle', multiple, 'b');
    expect(memory.get().value).toEqual(['a', 'b']);
  });

  it('re-toggling removes a value from the set', () => {
    const config: ToggleGroupConfig = { type: 'multiple', defaultValue: ['a', 'b'] };
    const { memory, dispatch } = createBehavior(toggleGroup, config);
    dispatch('toggle', config, 'a');
    expect(memory.get().value).toEqual(['b']);
  });
});

describe('toggle-group canDispatch (group-disabled gate)', () => {
  it('allows toggle when enabled', () => {
    const state: ToggleGroupState = { value: [], multiple: false };
    expect(toggleGroup.canDispatch(state, 'toggle', single)).toBe(true);
  });

  it('rejects toggle when the group is disabled', () => {
    const state: ToggleGroupState = { value: [], multiple: false };
    expect(toggleGroup.canDispatch(state, 'toggle', { disabled: true })).toBe(false);
  });

  it('dispatch is gated by the config it is CALLED with', () => {
    const { memory, dispatch } = createBehavior(toggleGroup, single);
    expect(dispatch('toggle', { type: 'single', disabled: true }, 'a')).toBe(false);
    expect(memory.get().value).toEqual([]);
  });
});

describe('toggle-group group aria projection', () => {
  function rootAria(config: ToggleGroupConfig) {
    return toggleGroup.aria(toggleGroup.initialState(config), config, ids).root;
  }

  it('projects the default horizontal orientation, no disabled', () => {
    expect(rootAria({})).toEqual({
      'data-orientation': 'horizontal',
      'data-disabled': undefined,
    });
  });

  it('reflects vertical orientation', () => {
    expect(rootAria({ orientation: 'vertical' })?.['data-orientation']).toBe('vertical');
  });

  it('projects data-disabled when the group is disabled', () => {
    expect(rootAria({ disabled: true })?.['data-disabled']).toBe('true');
  });

  it('never projects aria-orientation/aria-disabled/aria-required (invalid on role=group)', () => {
    const aria = rootAria({ orientation: 'vertical', disabled: true, required: true });
    expect(aria).not.toHaveProperty('aria-orientation');
    expect(aria).not.toHaveProperty('aria-disabled');
    expect(aria).not.toHaveProperty('aria-required');
  });
});

describe('toggle-group item projection (toggleItemAria)', () => {
  it('the selected item is pressed; others are unpressed', () => {
    const config: ToggleGroupConfig = { type: 'single', defaultValue: 'a' };
    const state = toggleGroup.initialState(config);
    expect(toggleItemAria('a', state, config)).toEqual({
      'aria-pressed': 'true',
      'data-state': 'on',
    });
    expect(toggleItemAria('b', state, config)).toEqual({
      'aria-pressed': 'false',
      'data-state': 'off',
    });
  });

  it('multiple mode presses every selected value', () => {
    const config: ToggleGroupConfig = { type: 'multiple', defaultValue: ['a', 'c'] };
    const state = toggleGroup.initialState(config);
    expect(toggleItemAria('a', state, config)['aria-pressed']).toBe('true');
    expect(toggleItemAria('c', state, config)['aria-pressed']).toBe('true');
    expect(toggleItemAria('b', state, config)['aria-pressed']).toBe('false');
  });

  it('carries no tabindex (roving owns it as ephemeral DOM state)', () => {
    expect(toggleItemAria('a', { value: ['a'], multiple: false }, single)).not.toHaveProperty(
      'tabindex',
    );
  });

  it('a controlled value drives the pressed instance', () => {
    expect(
      toggleItemAria('b', { value: ['a'], multiple: false }, { type: 'single', value: 'b' })[
        'aria-pressed'
      ],
    ).toBe('true');
  });
});

describe('toggle-group keymap', () => {
  const state: ToggleGroupState = { value: [], multiple: false };
  it('Enter and Space on an item map to toggle', () => {
    expect(toggleGroup.keymap({ key: 'Enter' }, state, 'item', single)).toBe('toggle');
    expect(toggleGroup.keymap({ key: ' ' }, state, 'item', single)).toBe('toggle');
  });

  it('does not claim activation on the root, and does not claim arrows (roving owns them)', () => {
    expect(toggleGroup.keymap({ key: 'Enter' }, state, 'root', single)).toBeNull();
    expect(toggleGroup.keymap({ key: 'ArrowRight' }, state, 'item', single)).toBeNull();
  });
});

describe('toggle-group emitValue (change-callback shape)', () => {
  it('single reports a string (empty when cleared)', () => {
    expect(emitValue(['a'], single)).toBe('a');
    expect(emitValue([], single)).toBe('');
  });

  it('multiple reports the array', () => {
    expect(emitValue(['a', 'b'], multiple)).toEqual(['a', 'b']);
  });
});
