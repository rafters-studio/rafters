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
    expect(dispatch('press')).toBe(true);
    expect(memory.get().pressed).toBe(true);
    expect(dispatch('press')).toBe(true);
    expect(memory.get().pressed).toBe(false);
  });

  it('press is a no-op on pressed in non-toggle mode', () => {
    const { memory, dispatch } = createBehavior(button, base);
    dispatch('press');
    expect(memory.get().pressed).toBeUndefined();
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

describe('button classes', () => {
  it('projects variant and size classes', () => {
    const config: ButtonConfig = { variant: 'destructive', size: 'lg' };
    const classes = button.classes(config, button.initialState(config));
    expect(classes.root).toContain('bg-destructive');
    expect(classes.root).toContain('h-12');
  });

  const cqSizes: Array<[ButtonConfig['size'], string, string]> = [
    ['default', 'h-11', '@md:h-10'],
    ['xs', 'h-11', '@md:h-6'],
    ['sm', 'h-11', '@md:h-8'],
    ['icon', 'h-11', '@md:h-10'],
    ['icon-xs', 'h-11', '@md:h-6'],
    ['icon-sm', 'h-11', '@md:h-8'],
  ];
  for (const [size, touchClass, desktopClass] of cqSizes) {
    it(`${size}: touch-first ${touchClass}, desktop ${desktopClass}`, () => {
      const config: ButtonConfig = { ...base, size };
      const classes = button.classes(config, button.initialState(config));
      expect(classes.root).toContain(touchClass);
      expect(classes.root).toContain(desktopClass);
    });
  }

  it('lg and icon-lg skip CQ override -- already above touch floor', () => {
    for (const size of ['lg', 'icon-lg'] as const) {
      const config: ButtonConfig = { ...base, size };
      const classes = button.classes(config, button.initialState(config));
      expect(classes.root).not.toContain('@md:h-');
    }
  });

  it('spinner scales with CQ', () => {
    const config: ButtonConfig = { ...base, loading: true };
    const classes = button.classes(config, button.initialState(config));
    expect(classes.spinner).toContain('h-5');
    expect(classes.spinner).toContain('@md:h-4');
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
