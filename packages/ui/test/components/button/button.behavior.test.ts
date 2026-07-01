/**
 * The button ARIA table, keymap, and suppression matrix -- proven ONCE as
 * pure functions (Spec 01: unit test the contract before anything renders).
 */
import { describe, expect, it } from 'vitest';
import {
  buttonBehavior,
  createButtonBehavior,
  type ButtonConfig,
} from '../../../src/components/button/button.behavior';

const base: ButtonConfig = { variant: 'default', size: 'default' };
const ids = { root: 'r', label: 'r-label', spinner: 'r-spinner' };

function ariaFor(config: Partial<ButtonConfig>) {
  const full = { ...base, ...config };
  return buttonBehavior.aria(buttonBehavior.initialState(full), full, ids);
}

describe('button aria projection (the auditable table)', () => {
  it('idle: no busy, no aria-disabled, no aria-pressed', () => {
    expect(ariaFor({}).root).toEqual({
      'aria-busy': undefined,
      'aria-disabled': undefined,
      'aria-pressed': undefined,
      'data-state': 'idle',
    });
  });

  it('loading: aria-busy, spinner hidden, state=loading', () => {
    const aria = ariaFor({ loading: true });
    expect(aria.root?.['aria-busy']).toBe('true');
    expect(aria.root?.['data-state']).toBe('loading');
    expect(aria.spinner).toEqual({ 'aria-hidden': 'true' });
  });

  it('soft-disabled: aria-disabled without native disabled', () => {
    const aria = ariaFor({ softDisabled: true });
    expect(aria.root?.['aria-disabled']).toBe('true');
    expect(aria.root?.['data-state']).toBe('soft-disabled');
  });

  it('hard disabled: NO aria-disabled duplication (native attribute is binding-level)', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });

  it('toggle: aria-pressed tracks pressed tri-state', () => {
    expect(ariaFor({ toggle: true }).root?.['aria-pressed']).toBe('false');
    expect(ariaFor({ toggle: true, pressed: true }).root?.['aria-pressed']).toBe('true');
    expect(ariaFor({}).root?.['aria-pressed']).toBeUndefined();
  });
});

describe('button suppression matrix (canDispatch)', () => {
  const cases: Array<[Partial<ButtonConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
    [{ softDisabled: true }, false],
    [{ loading: true }, false],
    [{ disabled: true, loading: true }, false],
  ];
  for (const [config, expected] of cases) {
    it(`press with ${JSON.stringify(config)} -> ${expected}`, () => {
      const state = buttonBehavior.initialState({ ...base, ...config });
      expect(buttonBehavior.canDispatch(state, 'press')).toBe(expected);
    });
  }

  it('set* actions are never suppressed (controlled-sync path)', () => {
    const state = buttonBehavior.initialState({ ...base, disabled: true, loading: true });
    expect(buttonBehavior.canDispatch(state, 'setLoading')).toBe(true);
    expect(buttonBehavior.canDispatch(state, 'setDisabled')).toBe(true);
  });
});

describe('button actions', () => {
  it('press flips pressed only in toggle mode', () => {
    const toggle = createButtonBehavior({ ...base, toggle: true });
    expect(toggle.dispatch('press')).toBe(true);
    expect(toggle.memory.get().pressed).toBe(true);
    expect(toggle.dispatch('press')).toBe(true);
    expect(toggle.memory.get().pressed).toBe(false);

    const plain = createButtonBehavior(base);
    expect(plain.dispatch('press')).toBe(true);
    expect(plain.memory.get().pressed).toBeUndefined();
  });

  it('press is suppressed while loading -- the double-submission guard', () => {
    const instance = createButtonBehavior(base);
    instance.dispatch('setLoading', true);
    expect(instance.dispatch('press')).toBe(false);
    instance.dispatch('setLoading', false);
    expect(instance.dispatch('press')).toBe(true);
  });

  it('setPressed is a no-op outside toggle mode', () => {
    const plain = createButtonBehavior(base);
    plain.dispatch('setPressed', true);
    expect(plain.memory.get().pressed).toBeUndefined();
  });
});

describe('button keymap', () => {
  const state = buttonBehavior.initialState(base);
  it('Enter and Space on root map to press', () => {
    expect(buttonBehavior.keymap({ key: 'Enter' }, state, 'root')).toBe('press');
    expect(buttonBehavior.keymap({ key: ' ' }, state, 'root')).toBe('press');
  });
  it('other keys and other parts are not claimed', () => {
    expect(buttonBehavior.keymap({ key: 'Escape' }, state, 'root')).toBeNull();
    expect(buttonBehavior.keymap({ key: 'Enter' }, state, 'label')).toBeNull();
  });
});

describe('button effects', () => {
  it('loading requests a polite announcement with the configured message', () => {
    const config = { ...base, loadingAnnouncement: 'Saving your changes' };
    const state = { ...buttonBehavior.initialState(config), loading: true };
    expect(buttonBehavior.effects(state, config)).toEqual([
      { type: 'announce', message: 'Saving your changes', politeness: 'polite' },
    ]);
  });

  it('defaults the loading message and omits the loaded message unless configured', () => {
    const loading = { ...buttonBehavior.initialState(base), loading: true };
    expect(buttonBehavior.effects(loading, base)).toEqual([
      { type: 'announce', message: 'Loading', politeness: 'polite' },
    ]);
    expect(buttonBehavior.effects(buttonBehavior.initialState(base), base)).toEqual([]);
  });

  it('a configured loaded message is requested when not loading', () => {
    const config = { ...base, loadedAnnouncement: 'Saved' };
    expect(buttonBehavior.effects(buttonBehavior.initialState(config), config)).toEqual([
      { type: 'announce', message: 'Saved', politeness: 'polite' },
    ]);
  });
});
