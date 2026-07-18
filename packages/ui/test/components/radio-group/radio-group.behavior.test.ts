/**
 * Pure behavior test for the radio-group score. No DOM: exercises reducers,
 * aria/keymap projections, canDispatch gates, effects-as-data, and the
 * per-instance radioItemAria projection directly.
 */
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  radioGroup,
  radioItemAria,
  selectedValue,
  type RadioGroupConfig,
  type RadioGroupState,
} from '../../../src/components/radio-group/radio-group.behavior';

const base: RadioGroupConfig = {};
const ids = { root: 'r', item: 'r-item' };

describe('radio-group initialState', () => {
  it('seeds from defaultValue', () => {
    expect(radioGroup.initialState({ defaultValue: 'b' })).toEqual({ value: 'b' });
  });

  it('seeds from a controlled value', () => {
    expect(radioGroup.initialState({ value: 'a' })).toEqual({ value: 'a' });
  });

  it("treats '' as nothing selected", () => {
    expect(radioGroup.initialState({ defaultValue: '' })).toEqual({ value: null });
    expect(radioGroup.initialState({})).toEqual({ value: null });
  });
});

describe('radio-group selectedValue (controlled shadows intrinsic)', () => {
  it('reads intrinsic state when uncontrolled', () => {
    expect(selectedValue({ value: 'x' }, {})).toBe('x');
  });

  it('a controlled value shadows the intrinsic state', () => {
    expect(selectedValue({ value: 'x' }, { value: 'y' })).toBe('y');
  });

  it("a controlled '' reads as none", () => {
    expect(selectedValue({ value: 'x' }, { value: '' })).toBeNull();
  });
});

describe('radio-group select action', () => {
  it('select switches the active value', () => {
    const { memory, dispatch } = createBehavior(radioGroup, base);
    expect(dispatch('select', base, 'y')).toBe(true);
    expect(memory.get().value).toBe('y');
  });

  it('re-selecting a value keeps the same state ref (no deselect, no notify)', () => {
    const config: RadioGroupConfig = { defaultValue: 'x' };
    const { memory, dispatch } = createBehavior(radioGroup, config);
    const before = memory.get();
    dispatch('select', config, 'x');
    expect(memory.get()).toBe(before); // same reference -> memory does not notify
    expect(memory.get().value).toBe('x');
  });
});

describe('radio-group canDispatch (group-disabled gate)', () => {
  it('allows select when enabled', () => {
    const state: RadioGroupState = { value: null };
    expect(radioGroup.canDispatch(state, 'select', {})).toBe(true);
  });

  it('rejects select when the group is disabled', () => {
    const state: RadioGroupState = { value: null };
    expect(radioGroup.canDispatch(state, 'select', { disabled: true })).toBe(false);
  });

  it('dispatch is gated by the config it is CALLED with', () => {
    const { memory, dispatch } = createBehavior(radioGroup, base);
    expect(dispatch('select', { disabled: true }, 'y')).toBe(false);
    expect(memory.get().value).toBeNull();
  });
});

describe('radio-group group aria projection', () => {
  function rootAria(config: RadioGroupConfig) {
    const full = { ...base, ...config };
    return radioGroup.aria(radioGroup.initialState(full), full, ids).root;
  }

  it('projects the default vertical orientation, no required, no disabled', () => {
    expect(rootAria({})).toEqual({
      'aria-orientation': 'vertical',
      'aria-required': undefined,
      'aria-disabled': undefined,
    });
  });

  it('reflects horizontal orientation', () => {
    expect(rootAria({ orientation: 'horizontal' })?.['aria-orientation']).toBe('horizontal');
  });

  it('projects aria-required and aria-disabled when set', () => {
    const aria = rootAria({ required: true, disabled: true });
    expect(aria?.['aria-required']).toBe('true');
    expect(aria?.['aria-disabled']).toBe('true');
  });
});

describe('radio-group item projection (radioItemAria)', () => {
  it('the selected item is checked; others are unchecked', () => {
    const config: RadioGroupConfig = { defaultValue: 'a' };
    const state = radioGroup.initialState(config);
    expect(radioItemAria('a', state, config)).toEqual({
      'aria-checked': 'true',
      'data-state': 'checked',
    });
    expect(radioItemAria('b', state, config)).toEqual({
      'aria-checked': 'false',
      'data-state': 'unchecked',
    });
  });

  it('carries no tabindex (roving owns it as ephemeral DOM state)', () => {
    expect(radioItemAria('a', { value: 'a' }, {})).not.toHaveProperty('tabindex');
  });

  it('a controlled value drives the checked instance', () => {
    expect(radioItemAria('b', { value: 'a' }, { value: 'b' })['aria-checked']).toBe('true');
  });
});

describe('radio-group keymap', () => {
  const state: RadioGroupState = { value: null };
  it('Enter and Space on an item map to select', () => {
    expect(radioGroup.keymap({ key: 'Enter' }, state, 'item', base)).toBe('select');
    expect(radioGroup.keymap({ key: ' ' }, state, 'item', base)).toBe('select');
  });

  it('does not claim activation on the root, and does not claim arrows (roving owns them)', () => {
    expect(radioGroup.keymap({ key: 'Enter' }, state, 'root', base)).toBeNull();
    expect(radioGroup.keymap({ key: 'ArrowDown' }, state, 'item', base)).toBeNull();
  });
});

describe('radio-group effects', () => {
  it('always requests roving-focus on the root at the configured orientation', () => {
    expect(radioGroup.effects({ value: null }, { orientation: 'horizontal' })).toEqual([
      { type: 'roving-focus', part: 'root', orientation: 'horizontal' },
    ]);
    expect(radioGroup.effects({ value: null }, {})).toEqual([
      { type: 'roving-focus', part: 'root', orientation: 'vertical' },
    ]);
  });
});
