import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  effectiveValue,
  textareaBehavior,
  type TextareaConfig,
  type TextareaPart,
} from '../../../src/components/textarea/textarea.behavior';

const ids: PartIds<TextareaPart> = { textarea: 't', error: 'e' };

function ariaAt(config: TextareaConfig, partIds: PartIds<TextareaPart> = ids) {
  return textareaBehavior.aria(textareaBehavior.initialState(config), config, partIds);
}

describe('textarea parts', () => {
  it('declares the textarea control and an optional error target', () => {
    expect(Object.keys(textareaBehavior.parts).sort()).toEqual(['error', 'textarea']);
    expect(textareaBehavior.parts.error.optional).toBe(true);
    expect(textareaBehavior.parts.textarea.optional).toBeUndefined();
  });
});

describe('textarea state: controlled vs intrinsic', () => {
  it('seeds intrinsic value from defaultValue', () => {
    expect(textareaBehavior.initialState({ defaultValue: 'seed' }).value).toBe('seed');
    expect(textareaBehavior.initialState({}).value).toBe('');
  });

  it('controlled value shadows intrinsic state', () => {
    expect(effectiveValue({ value: 'intrinsic' }, { value: 'controlled' })).toBe('controlled');
    expect(effectiveValue({ value: 'intrinsic' }, {})).toBe('intrinsic');
    // Empty controlled string still shadows -- it is present, not undefined.
    expect(effectiveValue({ value: 'intrinsic' }, { value: '' })).toBe('');
  });
});

describe('textarea canDispatch (edit gate)', () => {
  it('setValue is refused while disabled or read-only', () => {
    const state = textareaBehavior.initialState({});
    expect(textareaBehavior.canDispatch(state, 'setValue', {})).toBe(true);
    expect(textareaBehavior.canDispatch(state, 'setValue', { disabled: true })).toBe(false);
    expect(textareaBehavior.canDispatch(state, 'setValue', { readonly: true })).toBe(false);
  });
});

describe('textarea actions', () => {
  it('setValue moves intrinsic state through dispatch, including multi-line text', () => {
    const { memory, dispatch } = createBehavior(textareaBehavior, {});
    expect(dispatch('setValue', {}, 'line one\nline two')).toBe(true);
    expect(memory.get().value).toBe('line one\nline two');
  });

  it('setValue is rejected by the gate without touching state', () => {
    const config: TextareaConfig = { disabled: true };
    const { memory, dispatch } = createBehavior(textareaBehavior, config);
    expect(dispatch('setValue', config, 'nope')).toBe(false);
    expect(memory.get().value).toBe('');
  });

  it('a controlled reducer still moves intrinsic state (effective stays pinned)', () => {
    const config: TextareaConfig = { value: 'pinned' };
    const { memory, dispatch } = createBehavior(textareaBehavior, config);
    expect(dispatch('setValue', config, 'typed')).toBe(true);
    // Intrinsic moved -- that is the value the callback should report...
    expect(memory.get().value).toBe('typed');
    // ...but the effective value never leaves the controlled prop.
    expect(effectiveValue(memory.get(), config)).toBe('pinned');
  });
});

describe('textarea aria projection', () => {
  it('valid: aria-invalid is the literal string false, no describedby', () => {
    const aria = ariaAt({});
    expect(aria.textarea).toEqual({
      'aria-invalid': 'false',
      'aria-required': undefined,
      'aria-describedby': undefined,
      'data-state': 'default',
    });
  });

  it('invalid: aria-invalid true, wired to the error id, data-state invalid', () => {
    const aria = ariaAt({ invalid: true });
    expect(aria.textarea?.['aria-invalid']).toBe('true');
    expect(aria.textarea?.['aria-describedby']).toBe('e');
    expect(aria.textarea?.['data-state']).toBe('invalid');
  });

  it('required projects aria-required', () => {
    expect(ariaAt({ required: true }).textarea?.['aria-required']).toBe('true');
  });

  it('invalid without a real error id projects NO dangling describedby', () => {
    const aria = ariaAt({ invalid: true }, { ...ids, error: '' });
    expect(aria.textarea?.['aria-describedby']).toBeUndefined();
  });

  it('describedby is guarded on validity: a valid field never references the error', () => {
    expect(ariaAt({ invalid: false }).textarea?.['aria-describedby']).toBeUndefined();
  });
});

describe('textarea keymap and effects (the simplest bind shape)', () => {
  it('claims no keys -- the native textarea owns editing', () => {
    expect(textareaBehavior.keymap({ key: 'a' }, { value: '' }, 'textarea', {})).toBeNull();
    expect(textareaBehavior.keymap({ key: 'Enter' }, { value: '' }, 'textarea', {})).toBeNull();
  });

  it('describes no effects in any state', () => {
    expect(textareaBehavior.effects({ value: '' }, {})).toEqual([]);
    expect(textareaBehavior.effects({ value: 'x' }, { invalid: true, disabled: true })).toEqual([]);
  });
});
