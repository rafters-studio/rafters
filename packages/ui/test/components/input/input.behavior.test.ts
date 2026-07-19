import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  effectiveValue,
  inputBehavior,
  type InputConfig,
  type InputPart,
} from '../../../src/components/input/input.behavior';

const ids: PartIds<InputPart> = { input: 'i', error: 'e' };

function ariaAt(config: InputConfig, partIds: PartIds<InputPart> = ids) {
  return inputBehavior.aria(inputBehavior.initialState(config), config, partIds);
}

describe('input parts', () => {
  it('declares the input control and an optional error target', () => {
    expect(Object.keys(inputBehavior.parts).sort()).toEqual(['error', 'input']);
    expect(inputBehavior.parts.error.optional).toBe(true);
    expect(inputBehavior.parts.input.optional).toBeUndefined();
  });
});

describe('input state: controlled vs intrinsic', () => {
  it('seeds intrinsic value from defaultValue', () => {
    expect(inputBehavior.initialState({ defaultValue: 'seed' }).value).toBe('seed');
    expect(inputBehavior.initialState({}).value).toBe('');
  });

  it('controlled value shadows intrinsic state', () => {
    expect(effectiveValue({ value: 'intrinsic' }, { value: 'controlled' })).toBe('controlled');
    expect(effectiveValue({ value: 'intrinsic' }, {})).toBe('intrinsic');
    // Empty controlled string still shadows -- it is present, not undefined.
    expect(effectiveValue({ value: 'intrinsic' }, { value: '' })).toBe('');
  });
});

describe('input canDispatch (edit gate)', () => {
  it('setValue is refused while disabled or read-only', () => {
    const state = inputBehavior.initialState({});
    expect(inputBehavior.canDispatch(state, 'setValue', {})).toBe(true);
    expect(inputBehavior.canDispatch(state, 'setValue', { disabled: true })).toBe(false);
    expect(inputBehavior.canDispatch(state, 'setValue', { readonly: true })).toBe(false);
  });
});

describe('input actions', () => {
  it('setValue moves intrinsic state through dispatch', () => {
    const { memory, dispatch } = createBehavior(inputBehavior, {});
    expect(dispatch('setValue', {}, 'hello')).toBe(true);
    expect(memory.get().value).toBe('hello');
  });

  it('setValue is rejected by the gate without touching state', () => {
    const config: InputConfig = { disabled: true };
    const { memory, dispatch } = createBehavior(inputBehavior, config);
    expect(dispatch('setValue', config, 'nope')).toBe(false);
    expect(memory.get().value).toBe('');
  });

  it('a controlled reducer still moves intrinsic state (effective stays pinned)', () => {
    const config: InputConfig = { value: 'pinned' };
    const { memory, dispatch } = createBehavior(inputBehavior, config);
    expect(dispatch('setValue', config, 'typed')).toBe(true);
    // Intrinsic moved -- that is the value the callback should report...
    expect(memory.get().value).toBe('typed');
    // ...but the effective value never leaves the controlled prop.
    expect(effectiveValue(memory.get(), config)).toBe('pinned');
  });
});

describe('input aria projection', () => {
  it('valid: aria-invalid is the literal string false, no describedby', () => {
    const aria = ariaAt({});
    expect(aria.input).toEqual({
      'aria-invalid': 'false',
      'aria-required': undefined,
      'aria-describedby': undefined,
      'data-state': 'default',
    });
  });

  it('invalid: aria-invalid true, wired to the error id, data-state invalid', () => {
    const aria = ariaAt({ invalid: true });
    expect(aria.input?.['aria-invalid']).toBe('true');
    expect(aria.input?.['aria-describedby']).toBe('e');
    expect(aria.input?.['data-state']).toBe('invalid');
  });

  it('required projects aria-required', () => {
    expect(ariaAt({ required: true }).input?.['aria-required']).toBe('true');
  });

  it('invalid without a real error id projects NO dangling describedby', () => {
    const aria = ariaAt({ invalid: true }, { ...ids, error: '' });
    expect(aria.input?.['aria-describedby']).toBeUndefined();
  });

  it('describedby is guarded on validity: a valid field never references the error', () => {
    expect(ariaAt({ invalid: false }).input?.['aria-describedby']).toBeUndefined();
  });
});

describe('input keymap (the simplest bind shape)', () => {
  it('claims no keys -- the native input owns editing', () => {
    expect(inputBehavior.keymap({ key: 'a' }, { value: '' }, 'input', {})).toBeNull();
    expect(inputBehavior.keymap({ key: 'Enter' }, { value: '' }, 'input', {})).toBeNull();
  });
});
