import { describe, expect, it } from 'vitest';
import { createBehavior, type PartIds } from '../../../src/lib/contract';
import {
  effectiveValue,
  inputBehavior,
  wrapInputIcons,
  type InputConfig,
  type InputPart,
} from '../../../src/components/input/input.behavior';

const ids: PartIds<InputPart> = { input: 'i', error: 'e', startIcon: 's', endIcon: 'n' };

function ariaAt(config: InputConfig, partIds: PartIds<InputPart> = ids) {
  return inputBehavior.aria(inputBehavior.initialState(config), config, partIds);
}

describe('input parts', () => {
  it('declares the input control and an optional error target', () => {
    expect(Object.keys(inputBehavior.parts).sort()).toEqual([
      'endIcon',
      'error',
      'input',
      'startIcon',
    ]);
    expect(inputBehavior.parts.error.optional).toBe(true);
    expect(inputBehavior.parts.input.optional).toBeUndefined();
  });
});

describe('input icon parts', () => {
  it('declares startIcon and endIcon as optional parts that project aria-hidden', () => {
    expect(inputBehavior.parts.startIcon).toEqual({ optional: true });
    expect(inputBehavior.parts.endIcon).toEqual({ optional: true });
    const aria = ariaAt({});
    expect(aria.startIcon).toEqual({ 'aria-hidden': 'true' });
    expect(aria.endIcon).toEqual({ 'aria-hidden': 'true' });
  });
});

describe('wrapInputIcons', () => {
  function host(children: string): HTMLElement {
    document.body.innerHTML = `<rafters-input>${children}<input data-part="input" id="i" aria-label="Q" /></rafters-input>`;
    return document.querySelector('rafters-input') as HTMLElement;
  }

  it('seats slotted children in hidden wrappers inside addon parts, in reading order', () => {
    const h = host('<svg slot="end-icon"></svg><svg slot="start-icon"></svg>');
    wrapInputIcons(h);
    const row = h.querySelector('[data-part="row"]') as HTMLElement;
    expect([...row.children].map((el) => el.getAttribute('data-part'))).toEqual([
      'addonStart',
      'input',
      'addonEnd',
    ]);
    const start = row.querySelector('[data-part="addonStart"] > [data-part="startIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    const end = row.querySelector('[data-part="addonEnd"] > [data-part="endIcon"]');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    expect(start?.querySelector('svg')?.hasAttribute('slot')).toBe(false);
  });

  it('adds no row without a slotted child, and is idempotent', () => {
    const bare = host('');
    wrapInputIcons(bare);
    expect(bare.querySelector('[data-part="row"]')).toBeNull();
    const h = host('<svg slot="start-icon"></svg>');
    wrapInputIcons(h);
    wrapInputIcons(h);
    expect(h.querySelectorAll('[data-part="row"]').length).toBe(1);
    expect(h.querySelectorAll('[data-part="startIcon"]').length).toBe(1);
    expect(h.querySelector('[data-part="endIcon"]')).toBeNull();
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
