import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  effectiveChecked,
  switchBehavior,
  switchFormValue,
  type SwitchConfig,
  type SwitchState,
} from '../../../src/components/switch/switch.behavior';

const base: SwitchConfig = { variant: 'default', size: 'default' };
const ids = { root: 'r', thumb: 'r-thumb' };

function ariaFor(config: Partial<SwitchConfig>) {
  const full = { ...base, ...config };
  return switchBehavior.aria(switchBehavior.initialState(full), full, ids);
}

describe('switch aria projection', () => {
  it('unchecked: aria-checked false, data-state unchecked, no aria-required', () => {
    expect(ariaFor({}).root).toEqual({
      'aria-checked': 'false',
      'aria-required': undefined,
      'data-state': 'unchecked',
    });
  });

  it('checked (defaultChecked): aria-checked true, data-state checked', () => {
    const root = ariaFor({ defaultChecked: true }).root;
    expect(root?.['aria-checked']).toBe('true');
    expect(root?.['data-state']).toBe('checked');
  });

  it('controlled checked shadows the intrinsic seed', () => {
    // config.checked overrides even a false defaultChecked.
    const root = ariaFor({ checked: true, defaultChecked: false }).root;
    expect(root?.['aria-checked']).toBe('true');
  });

  it('required projects aria-required true', () => {
    expect(ariaFor({ required: true }).root?.['aria-required']).toBe('true');
  });

  it('thumb is aria-hidden and mirrors the data-state', () => {
    expect(ariaFor({}).thumb).toEqual({ 'aria-hidden': 'true', 'data-state': 'unchecked' });
    expect(ariaFor({ defaultChecked: true }).thumb?.['data-state']).toBe('checked');
  });

  it('never projects aria-disabled (disabled is native only)', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });
});

describe('switch role declaration', () => {
  it('declares role=switch on the root part', () => {
    expect(switchBehavior.parts.root.role).toBe('switch');
  });
});

describe('switch suppression (canDispatch reads config)', () => {
  const cases: Array<[Partial<SwitchConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
  ];
  for (const [overrides, expected] of cases) {
    const config = { ...base, ...overrides };
    it(`toggle with ${JSON.stringify(overrides)} -> ${expected}`, () => {
      const state = switchBehavior.initialState(config);
      expect(switchBehavior.canDispatch(state, 'toggle', config)).toBe(expected);
    });
  }
});

describe('switch actions', () => {
  it('toggle flips checked', () => {
    const { memory, dispatch } = createBehavior(switchBehavior, base);
    expect(memory.get().checked).toBe(false);
    expect(dispatch('toggle', base)).toBe(true);
    expect(memory.get().checked).toBe(true);
    expect(dispatch('toggle', base)).toBe(true);
    expect(memory.get().checked).toBe(false);
  });

  it('defaultChecked seeds the initial state', () => {
    const config = { ...base, defaultChecked: true };
    expect(createBehavior(switchBehavior, config).memory.get().checked).toBe(true);
  });

  it('disabled rejects toggle and leaves state unmoved', () => {
    const config = { ...base, disabled: true };
    const { memory, dispatch } = createBehavior(switchBehavior, config);
    expect(dispatch('toggle', config)).toBe(false);
    expect(memory.get().checked).toBe(false);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(switchBehavior, base);
    const laterConfig = { ...base, disabled: true };
    expect(dispatch('toggle', laterConfig)).toBe(false);
    expect(memory.get().checked).toBe(false);
  });
});

describe('switch keymap', () => {
  const state = switchBehavior.initialState(base);
  it('Space and Enter on root map to toggle', () => {
    expect(switchBehavior.keymap({ key: ' ' }, state, 'root', base)).toBe('toggle');
    expect(switchBehavior.keymap({ key: 'Spacebar' }, state, 'root', base)).toBe('toggle');
    expect(switchBehavior.keymap({ key: 'Enter' }, state, 'root', base)).toBe('toggle');
  });
  it('other keys and other parts are not claimed', () => {
    expect(switchBehavior.keymap({ key: 'Escape' }, state, 'root', base)).toBeNull();
    expect(switchBehavior.keymap({ key: ' ' }, state, 'thumb', base)).toBeNull();
  });
});

describe('switch effects', () => {
  it('never requests effects', () => {
    expect(switchBehavior.effects(switchBehavior.initialState(base), base)).toEqual([]);
    expect(
      switchBehavior.effects(switchBehavior.initialState({ ...base, defaultChecked: true }), {
        ...base,
        defaultChecked: true,
      }),
    ).toEqual([]);
  });
});

describe('effectiveChecked', () => {
  const unchecked: SwitchState = { checked: false };
  const intrinsicChecked: SwitchState = { checked: true };
  it('returns the intrinsic state when uncontrolled', () => {
    expect(effectiveChecked(intrinsicChecked, base)).toBe(true);
    expect(effectiveChecked(unchecked, base)).toBe(false);
  });
  it('a controlled value shadows the intrinsic state', () => {
    expect(effectiveChecked(intrinsicChecked, { ...base, checked: false })).toBe(false);
    expect(effectiveChecked(unchecked, { ...base, checked: true })).toBe(true);
  });
});

describe('switchFormValue (form-value axis)', () => {
  it('unchecked omits the field (null) and is valid when not required', () => {
    const fv = switchFormValue({ checked: false }, base);
    expect(fv.value).toBeNull();
    expect(fv.validity.valueMissing).toBe(false);
  });

  it('checked submits "on" by default', () => {
    expect(switchFormValue({ checked: true }, base).value).toBe('on');
  });

  it('checked submits a custom value when provided', () => {
    expect(switchFormValue({ checked: true }, { ...base, value: 'pro' }).value).toBe('pro');
  });

  it('required + unchecked reports valueMissing', () => {
    expect(
      switchFormValue({ checked: false }, { ...base, required: true }).validity.valueMissing,
    ).toBe(true);
  });

  it('required + checked clears valueMissing', () => {
    expect(
      switchFormValue({ checked: true }, { ...base, required: true }).validity.valueMissing,
    ).toBe(false);
  });

  it('reads the effective (controlled) checked value', () => {
    // Intrinsic false, but controlled checked=true -> submits.
    expect(switchFormValue({ checked: false }, { ...base, checked: true }).value).toBe('on');
  });
});
