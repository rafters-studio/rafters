/**
 * The input-otp score, driven purely -- no DOM. Everything here is a total
 * function of (state, config): the pattern filter, the active-slot rule, the
 * slot projection, the keymap claim and the reducers.
 */
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  activeForKey,
  activeSlot,
  DEFAULT_OTP_PATTERN,
  effectiveOtpValue,
  filterAndTruncate,
  inputOtpBehavior,
  isComplete,
  isSlotActive,
  otpPattern,
  otpSlotAttrs,
  slotState,
  type InputOtpConfig,
  type InputOtpState,
} from '../../../src/components/input-otp/input-otp.behavior';

const config = (overrides: Partial<InputOtpConfig> = {}): InputOtpConfig => ({
  maxLength: 6,
  ...overrides,
});

const stateOf = (value: string, activeIndex = value.length): InputOtpState => ({
  value,
  activeIndex,
});

describe('input-otp behavior: the pattern filter', () => {
  it('defaults to digits only, one character at a time', () => {
    expect(otpPattern(config()).source).toBe(DEFAULT_OTP_PATTERN);
    expect(filterAndTruncate('12a3', config())).toBe('123');
  });

  it('drops separators so a pasted "12-34-56" fills every slot', () => {
    expect(filterAndTruncate('12-34-56', config())).toBe('123456');
  });

  it('truncates at maxLength AFTER filtering', () => {
    expect(filterAndTruncate('1234567890', config({ maxLength: 4 }))).toBe('1234');
    expect(filterAndTruncate('1-2-3-4-5', config({ maxLength: 4 }))).toBe('1234');
  });

  it('honours a custom pattern source', () => {
    expect(filterAndTruncate('a1B2', config({ pattern: '^[a-z]$' }))).toBe('a');
  });

  it('falls back to digits when the pattern source is malformed', () => {
    expect(otpPattern(config({ pattern: '[' })).source).toBe(DEFAULT_OTP_PATTERN);
    expect(filterAndTruncate('1a2', config({ pattern: '[' }))).toBe('12');
  });

  it('an empty input filters to an empty value', () => {
    expect(filterAndTruncate('', config())).toBe('');
  });
});

describe('input-otp behavior: the active slot', () => {
  it('clamps into the rendered slot range, so shrinking maxLength cannot strand it', () => {
    expect(activeSlot(stateOf('123456', 6), config({ maxLength: 6 }))).toBe(5);
    expect(activeSlot({ value: '12', activeIndex: 99 }, config({ maxLength: 4 }))).toBe(3);
    expect(activeSlot({ value: '', activeIndex: -3 }, config())).toBe(0);
  });

  it('lights the slot the caret sits in', () => {
    const state = stateOf('12');
    expect(isSlotActive(2, state, config())).toBe(true);
    expect(isSlotActive(1, state, config())).toBe(false);
  });

  it('keeps the LAST slot lit while the code is complete, even after ArrowLeft', () => {
    // The oracle's OR predicate, preserved: a full code shows both the walked-to
    // slot and the final slot as active.
    const state = { value: '123456', activeIndex: 2 };
    expect(isSlotActive(2, state, config())).toBe(true);
    expect(isSlotActive(5, state, config())).toBe(true);
    expect(isSlotActive(3, state, config())).toBe(false);
  });
});

describe('input-otp behavior: the slot projection', () => {
  it('reports char, filled, active and the fake caret', () => {
    const state = stateOf('12');
    expect(slotState(0, state, config())).toEqual({
      char: '1',
      filled: true,
      active: false,
      caret: false,
    });
    expect(slotState(2, state, config())).toEqual({
      char: '',
      filled: false,
      active: true,
      caret: true,
    });
  });

  it('never paints a caret on a filled slot', () => {
    const state = { value: '123456', activeIndex: 5 };
    expect(slotState(5, state, config()).caret).toBe(false);
  });

  it('projects only present state as data attributes', () => {
    const state = stateOf('1');
    expect(otpSlotAttrs('0', state, config())).toEqual({
      'data-index': '0',
      'data-active': undefined,
      'data-filled': 'true',
    });
    expect(otpSlotAttrs('1', state, config())).toEqual({
      'data-index': '1',
      'data-active': 'true',
      'data-filled': undefined,
    });
  });

  it('ignores a non-numeric instance key rather than projecting nonsense', () => {
    expect(otpSlotAttrs('x', stateOf('1'), config())).toEqual({});
  });
});

describe('input-otp behavior: keyboard claims', () => {
  it('claims only the arrows, and only on the input part', () => {
    const state = stateOf('12');
    const cfg = config();
    expect(inputOtpBehavior.keymap({ key: 'ArrowLeft' }, state, 'input', cfg)).toBe('setActive');
    expect(inputOtpBehavior.keymap({ key: 'ArrowRight' }, state, 'input', cfg)).toBe('setActive');
    // Backspace belongs to the native field: it deletes, and the resulting
    // input event carries the change back through setValue.
    expect(inputOtpBehavior.keymap({ key: 'Backspace' }, state, 'input', cfg)).toBeNull();
    expect(inputOtpBehavior.keymap({ key: 'ArrowLeft' }, state, 'slot', cfg)).toBeNull();
  });

  it('ArrowLeft walks back one slot and stops at the first', () => {
    expect(activeForKey('ArrowLeft', stateOf('12'), config())).toBe(1);
    expect(activeForKey('ArrowLeft', { value: '', activeIndex: 0 }, config())).toBeNull();
  });

  it('ArrowRight lands on the first empty slot, never past the last', () => {
    expect(activeForKey('ArrowRight', { value: '123', activeIndex: 0 }, config())).toBe(3);
    expect(activeForKey('ArrowRight', { value: '123456', activeIndex: 2 }, config())).toBe(5);
    expect(activeForKey('ArrowRight', stateOf('12'), config())).toBeNull();
  });

  it('returns null for keys that do not move the caret', () => {
    expect(activeForKey('Enter', stateOf('12'), config())).toBeNull();
  });
});

describe('input-otp behavior: state', () => {
  it('seeds the value through the filter and parks the caret after it', () => {
    expect(inputOtpBehavior.initialState(config({ defaultValue: '12-34' }))).toEqual({
      value: '1234',
      activeIndex: 4,
    });
  });

  it('a controlled value shadows the intrinsic state', () => {
    expect(effectiveOtpValue(stateOf('11'), config({ value: '99' }))).toBe('99');
    expect(effectiveOtpValue(stateOf('11'), config())).toBe('11');
  });

  it('setValue re-seats the caret at the first empty slot -- that is auto-advance', () => {
    const { memory, dispatch } = createBehavior(inputOtpBehavior, config());
    expect(dispatch('setValue', config(), '12')).toBe(true);
    expect(memory.get()).toEqual({ value: '12', activeIndex: 2 });
  });

  it('setActive moves the caret without touching the value', () => {
    const cfg = config();
    const { memory, dispatch } = createBehavior(inputOtpBehavior, cfg);
    dispatch('setValue', cfg, '123');
    dispatch('setActive', cfg, 1);
    expect(memory.get()).toEqual({ value: '123', activeIndex: 1 });
  });

  it('disabled refuses BOTH edits and caret movement', () => {
    const cfg = config({ disabled: true, defaultValue: '12' });
    const { memory, dispatch } = createBehavior(inputOtpBehavior, cfg);
    expect(dispatch('setValue', cfg, '123')).toBe(false);
    expect(dispatch('setActive', cfg, 0)).toBe(false);
    expect(memory.get()).toEqual({ value: '12', activeIndex: 2 });
  });

  it('completion is the full-slot condition, read off the effective value', () => {
    expect(isComplete(stateOf('12345'), config())).toBe(false);
    expect(isComplete(stateOf('123456'), config())).toBe(true);
    expect(isComplete(stateOf(''), config({ value: '123456' }))).toBe(true);
  });
});

describe('input-otp behavior: the aria projection', () => {
  it('names the field by its slot count when the consumer gives no label', () => {
    const cfg = config({ maxLength: 4 });
    const aria = inputOtpBehavior.aria(inputOtpBehavior.initialState(cfg), cfg, {
      root: '',
      input: '',
      group: '',
      slot: '',
      separator: '',
    });
    expect(aria.input?.['aria-label']).toBe('Enter 4 character code');
    expect(aria.input?.['aria-required']).toBeUndefined();
    expect(aria.root?.['data-disabled']).toBeUndefined();
    expect(aria.root?.['data-complete']).toBeUndefined();
  });

  it('a consumer label wins, and required/disabled/complete all project', () => {
    const cfg = config({ label: 'Verification code', required: true, disabled: true });
    const aria = inputOtpBehavior.aria(stateOf('123456'), cfg, {
      root: '',
      input: '',
      group: '',
      slot: '',
      separator: '',
    });
    expect(aria.input?.['aria-label']).toBe('Verification code');
    expect(aria.input?.['aria-required']).toBe('true');
    expect(aria.input?.['aria-disabled']).toBe('true');
    expect(aria.root?.['data-disabled']).toBe('true');
    expect(aria.root?.['data-complete']).toBe('true');
  });

  it('declares the slot as a many part and projects it per instance', () => {
    expect(inputOtpBehavior.parts.slot.many).toBe(true);
    expect(inputOtpBehavior.instanceAria?.('slot', '0', stateOf('9'), config(), {})).toEqual({
      'data-index': '0',
      'data-active': undefined,
      'data-filled': 'true',
    });
    expect(inputOtpBehavior.instanceAria?.('root', '0', stateOf('9'), config(), {})).toEqual({});
  });
});
