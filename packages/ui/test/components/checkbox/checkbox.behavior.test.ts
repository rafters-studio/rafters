import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  checkbox,
  checkboxSubmitValue,
  effectiveChecked,
  isCheckboxChecked,
  type CheckboxConfig,
  type CheckboxState,
} from '../../../src/components/checkbox/checkbox.behavior';

const ids = { root: 'r' };

function ariaFor(config: CheckboxConfig, state: CheckboxState = checkbox.initialState(config)) {
  return checkbox.aria(state, config, ids);
}

describe('checkbox parts', () => {
  it('declares a single root part (the native button carries role=checkbox)', () => {
    expect(Object.keys(checkbox.parts)).toEqual(['root']);
  });
});

describe('checkbox state: controlled vs intrinsic', () => {
  it('seeds intrinsic checked from defaultChecked, else false', () => {
    expect(checkbox.initialState({}).checked).toBe(false);
    expect(checkbox.initialState({ defaultChecked: true }).checked).toBe(true);
    expect(checkbox.initialState({ defaultChecked: 'indeterminate' }).checked).toBe(
      'indeterminate',
    );
  });

  it('controlled checked shadows intrinsic state', () => {
    const state: CheckboxState = { checked: false };
    expect(effectiveChecked(state, { checked: true })).toBe(true);
    expect(effectiveChecked(state, { checked: 'indeterminate' })).toBe('indeterminate');
    expect(effectiveChecked({ checked: true }, {})).toBe(true);
  });

  it('isCheckboxChecked is true only for the checked=true axis', () => {
    expect(isCheckboxChecked({ checked: true }, {})).toBe(true);
    expect(isCheckboxChecked({ checked: false }, {})).toBe(false);
    expect(isCheckboxChecked({ checked: 'indeterminate' }, {})).toBe(false);
    expect(isCheckboxChecked({ checked: false }, { checked: true })).toBe(true);
  });
});

describe('checkbox toggle reducer (tri-state)', () => {
  it('unchecked -> checked', () => {
    const { memory, dispatch } = createBehavior(checkbox, {});
    expect(dispatch('toggle', {})).toBe(true);
    expect(memory.get().checked).toBe(true);
  });

  it('checked -> unchecked', () => {
    const { memory, dispatch } = createBehavior(checkbox, { defaultChecked: true });
    expect(dispatch('toggle', {})).toBe(true);
    expect(memory.get().checked).toBe(false);
  });

  it('indeterminate -> checked (never back to mixed)', () => {
    const { memory, dispatch } = createBehavior(checkbox, { defaultChecked: 'indeterminate' });
    expect(dispatch('toggle', {})).toBe(true);
    expect(memory.get().checked).toBe(true);
  });
});

describe('checkbox canDispatch (disabled gate)', () => {
  it('toggle allowed when enabled, suppressed when disabled', () => {
    const state = checkbox.initialState({});
    expect(checkbox.canDispatch(state, 'toggle', {})).toBe(true);
    expect(checkbox.canDispatch(state, 'toggle', { disabled: true })).toBe(false);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(checkbox, {});
    expect(dispatch('toggle', { disabled: true })).toBe(false);
    expect(memory.get().checked).toBe(false);
  });
});

describe('checkbox aria projection', () => {
  it('unchecked: aria-checked false, data-state unchecked, no required/disabled', () => {
    expect(ariaFor({}).root).toEqual({
      role: 'checkbox',
      'aria-checked': 'false',
      'aria-required': undefined,
      'data-state': 'unchecked',
      'data-disabled': undefined,
    });
  });

  it('checked: aria-checked true, data-state checked', () => {
    const aria = ariaFor({ defaultChecked: true });
    expect(aria.root?.['aria-checked']).toBe('true');
    expect(aria.root?.['data-state']).toBe('checked');
  });

  it('indeterminate: aria-checked mixed, data-state indeterminate', () => {
    const aria = ariaFor({ defaultChecked: 'indeterminate' });
    expect(aria.root?.['aria-checked']).toBe('mixed');
    expect(aria.root?.['data-state']).toBe('indeterminate');
  });

  it('required surfaces aria-required; disabled surfaces data-disabled but no aria-disabled', () => {
    const required = ariaFor({ required: true });
    expect(required.root?.['aria-required']).toBe('true');
    const disabled = ariaFor({ disabled: true });
    expect(disabled.root?.['data-disabled']).toBe('');
    expect(disabled.root?.['aria-disabled']).toBeUndefined();
  });

  it('controlled checked drives the projection without touching intrinsic state', () => {
    const aria = checkbox.aria({ checked: false }, { checked: 'indeterminate' }, ids);
    expect(aria.root?.['aria-checked']).toBe('mixed');
  });
});

describe('checkbox keymap', () => {
  const state = checkbox.initialState({});
  it('Space on root toggles', () => {
    expect(checkbox.keymap({ key: ' ' }, state, 'root', {})).toBe('toggle');
  });

  it('Enter is not claimed (it toggles via the native button click instead)', () => {
    expect(checkbox.keymap({ key: 'Enter' }, state, 'root', {})).toBeNull();
  });

  it('other keys are not claimed', () => {
    expect(checkbox.keymap({ key: 'a' }, state, 'root', {})).toBeNull();
  });
});

describe('checkbox form value', () => {
  it('submit value defaults to "on", overridable by value', () => {
    expect(checkboxSubmitValue({})).toBe('on');
    expect(checkboxSubmitValue({ value: 'yes' })).toBe('yes');
  });
});
