import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';

const base: ButtonConfig = { variant: 'default', size: 'default' };
const ids = { root: 'r', label: 'r-label', spinner: 'r-spinner' };

function ariaFor(config: Partial<ButtonConfig>) {
  const full = { ...base, ...config };
  return button.aria(button.initialState(full), full, ids);
}

describe('button aria projection', () => {
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

  it('hard disabled: NO aria-disabled duplication', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });

  it('toggle: aria-pressed tracks pressed state', () => {
    expect(ariaFor({ toggle: true }).root?.['aria-pressed']).toBe('false');
  });

  it('non-toggle: no aria-pressed', () => {
    expect(ariaFor({}).root?.['aria-pressed']).toBeUndefined();
  });
});

describe('button suppression (canDispatch reads config)', () => {
  const cases: Array<[Partial<ButtonConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
    [{ softDisabled: true }, false],
    [{ loading: true }, false],
    [{ disabled: true, loading: true }, false],
  ];
  for (const [overrides, expected] of cases) {
    const config = { ...base, ...overrides };
    it(`press with ${JSON.stringify(overrides)} -> ${expected}`, () => {
      const state = button.initialState(config);
      expect(button.canDispatch(state, 'press', config)).toBe(expected);
    });
  }
});

describe('button actions', () => {
  it('press flips pressed in toggle mode', () => {
    const config = { ...base, toggle: true };
    const { memory, dispatch } = createBehavior(button, config);
    expect(dispatch('press', config)).toBe(true);
    expect(memory.get().pressed).toBe(true);
    expect(dispatch('press', config)).toBe(true);
    expect(memory.get().pressed).toBe(false);
  });

  it('press is a no-op on pressed in non-toggle mode', () => {
    const { memory, dispatch } = createBehavior(button, base);
    dispatch('press', base);
    expect(memory.get().pressed).toBeUndefined();
  });

  it('defaultPressed seeds the initial toggle state', () => {
    const config = { ...base, toggle: true, defaultPressed: true };
    const { memory } = createBehavior(button, config);
    expect(memory.get().pressed).toBe(true);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const mountConfig = { ...base, toggle: true };
    const { memory, dispatch } = createBehavior(button, mountConfig);
    const laterConfig = { ...mountConfig, loading: true };
    expect(dispatch('press', laterConfig)).toBe(false);
    expect(memory.get().pressed).toBe(false);
  });
});

describe('button keymap', () => {
  const state = button.initialState(base);
  it('Enter and Space on root map to press', () => {
    expect(button.keymap({ key: 'Enter' }, state, 'root')).toBe('press');
    expect(button.keymap({ key: ' ' }, state, 'root')).toBe('press');
  });
  it('other keys and other parts are not claimed', () => {
    expect(button.keymap({ key: 'Escape' }, state, 'root')).toBeNull();
    expect(button.keymap({ key: 'Enter' }, state, 'label')).toBeNull();
  });
});

describe('button effects', () => {
  it('loading config requests a polite announcement', () => {
    const config = { ...base, loading: true, loadingAnnouncement: 'Saving' };
    expect(button.effects(button.initialState(config), config)).toEqual([
      { type: 'announce', message: 'Saving', politeness: 'polite' },
    ]);
  });

  it('defaults the loading message', () => {
    const config = { ...base, loading: true };
    expect(button.effects(button.initialState(config), config)).toEqual([
      { type: 'announce', message: 'Loading', politeness: 'polite' },
    ]);
  });

  it('no effects when not loading', () => {
    expect(button.effects(button.initialState(base), base)).toEqual([]);
  });
});
