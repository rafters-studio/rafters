import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';

const base: ToggleConfig = { variant: 'default', size: 'default', toggle: true };
const ids = { root: 'r', label: 'r-label', spinner: 'r-spinner' };

function ariaFor(config: Partial<ToggleConfig>) {
  const full = { ...base, ...config };
  return toggle.aria(toggle.initialState(full), full, ids);
}

describe('toggle aria projection', () => {
  it('off: aria-pressed false, data-state off, no busy/disabled aria', () => {
    expect(ariaFor({}).root).toEqual({
      'aria-busy': undefined,
      'aria-disabled': undefined,
      'aria-pressed': 'false',
      'data-state': 'off',
    });
  });

  it('on: defaultPressed seeds aria-pressed true and data-state on', () => {
    const aria = ariaFor({ defaultPressed: true });
    expect(aria.root?.['aria-pressed']).toBe('true');
    expect(aria.root?.['data-state']).toBe('on');
  });

  it('aria-pressed is ALWAYS projected (a toggle is always in toggle mode)', () => {
    expect(ariaFor({}).root?.['aria-pressed']).toBe('false');
    expect(ariaFor({ defaultPressed: true }).root?.['aria-pressed']).toBe('true');
  });

  it('data-state overrides the pressable idle/soft-disabled axis with on/off', () => {
    // Even a hard-disabled toggle reports its pressed axis as on/off, not idle.
    expect(ariaFor({ disabled: true }).root?.['data-state']).toBe('off');
    expect(ariaFor({ disabled: true, defaultPressed: true }).root?.['data-state']).toBe('on');
  });

  it('hard disabled: NO aria-disabled duplication', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });
});

describe('toggle suppression (canDispatch reads config)', () => {
  const cases: Array<[Partial<ToggleConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
    [{ defaultPressed: true }, true],
  ];
  for (const [overrides, expected] of cases) {
    const config = { ...base, ...overrides };
    it(`press with ${JSON.stringify(overrides)} -> ${expected}`, () => {
      const state = toggle.initialState(config);
      expect(toggle.canDispatch(state, 'press', config)).toBe(expected);
    });
  }
});

describe('toggle actions', () => {
  it('press flips pressed off -> on -> off', () => {
    const { memory, dispatch } = createBehavior(toggle, base);
    expect(memory.get().pressed).toBe(false);
    expect(dispatch('press', base)).toBe(true);
    expect(memory.get().pressed).toBe(true);
    expect(dispatch('press', base)).toBe(true);
    expect(memory.get().pressed).toBe(false);
  });

  it('defaultPressed seeds the initial pressed state', () => {
    const config = { ...base, defaultPressed: true };
    const { memory } = createBehavior(toggle, config);
    expect(memory.get().pressed).toBe(true);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(toggle, base);
    const disabledConfig = { ...base, disabled: true };
    expect(dispatch('press', disabledConfig)).toBe(false);
    expect(memory.get().pressed).toBe(false);
  });
});

describe('toggle keymap', () => {
  const state = toggle.initialState(base);
  it('Enter and Space on root map to press', () => {
    expect(toggle.keymap({ key: 'Enter' }, state, 'root')).toBe('press');
    expect(toggle.keymap({ key: ' ' }, state, 'root')).toBe('press');
  });
  it('other keys and other parts are not claimed', () => {
    expect(toggle.keymap({ key: 'Escape' }, state, 'root')).toBeNull();
    expect(toggle.keymap({ key: 'Enter' }, state, 'label')).toBeNull();
  });
});

// A toggle is an instant state swap, never loading -- it composes no effect
// primitive at either boundary. The WC/Astro bind and the React controller both
// wire click -> press only; there is no runner and nothing to drive. So there is
// no effects data to assert here.
