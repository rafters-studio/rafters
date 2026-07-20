import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  clampToStep,
  effectiveValues,
  nearestThumbIndex,
  percentFor,
  sliderBehavior,
  sliderFormValue,
  sliderThumbAria,
  stepForKey,
  valueFromPoint,
  type SliderConfig,
  type SliderState,
} from '../../../src/components/slider/slider.behavior';

const base: SliderConfig = {
  variant: 'default',
  size: 'default',
  min: 0,
  max: 100,
  step: 1,
  orientation: 'horizontal',
};

const ids = { root: 'r', track: 'r-track', range: 'r-range', thumb: 'r-thumb' };

function ariaFor(config: Partial<SliderConfig>) {
  const full = { ...base, ...config };
  return sliderBehavior.aria(sliderBehavior.initialState(full), full, ids);
}

describe('slider value math (component-internal pure state)', () => {
  it('clampToStep snaps to the grid and clamps into range', () => {
    expect(clampToStep(51.4, base)).toBe(51);
    expect(clampToStep(-10, base)).toBe(0);
    expect(clampToStep(9999, base)).toBe(100);
    expect(clampToStep(14, { ...base, min: 10, max: 20, step: 2 })).toBe(14);
    expect(clampToStep(15, { ...base, min: 10, max: 20, step: 2 })).toBe(16);
  });

  it('percentFor maps a value to a 0-100 position', () => {
    expect(percentFor(0, base)).toBe(0);
    expect(percentFor(50, base)).toBe(50);
    expect(percentFor(100, base)).toBe(100);
    expect(percentFor(15, { ...base, min: 10, max: 20 })).toBe(50);
  });

  it('valueFromPoint reads horizontal left, vertical inverts (top = max)', () => {
    expect(valueFromPoint({ left: 0.5, top: 0 }, base)).toBe(50);
    expect(valueFromPoint({ left: 0, top: 0 }, base)).toBe(0);
    // Vertical: top 0 = max end, top 1 = min end.
    expect(valueFromPoint({ left: 0, top: 0 }, { ...base, orientation: 'vertical' })).toBe(100);
    expect(valueFromPoint({ left: 0, top: 1 }, { ...base, orientation: 'vertical' })).toBe(0);
  });

  it('nearestThumbIndex picks the closest thumb to a value', () => {
    expect(nearestThumbIndex([25, 75], 30)).toBe(0);
    expect(nearestThumbIndex([25, 75], 60)).toBe(1);
    expect(nearestThumbIndex([50], 90)).toBe(0);
  });

  it('stepForKey moves by step, ten steps, or to the ends', () => {
    expect(stepForKey('ArrowRight', 50, base)).toBe(51);
    expect(stepForKey('ArrowUp', 50, base)).toBe(51);
    expect(stepForKey('ArrowLeft', 50, base)).toBe(49);
    expect(stepForKey('ArrowDown', 50, base)).toBe(49);
    expect(stepForKey('PageUp', 50, base)).toBe(60);
    expect(stepForKey('PageDown', 50, base)).toBe(40);
    expect(stepForKey('Home', 50, base)).toBe(0);
    expect(stepForKey('End', 50, base)).toBe(100);
    expect(stepForKey('Enter', 50, base)).toBeNull();
  });

  it('stepForKey clamps at the boundaries', () => {
    expect(stepForKey('ArrowLeft', 0, base)).toBe(0);
    expect(stepForKey('ArrowRight', 100, base)).toBe(100);
    expect(stepForKey('PageUp', 95, base)).toBe(100);
  });
});

describe('slider aria projection', () => {
  it('root carries data-orientation and (only when disabled) data-disabled', () => {
    expect(ariaFor({}).root).toEqual({
      'data-orientation': 'horizontal',
      'data-disabled': undefined,
    });
    expect(ariaFor({ disabled: true }).root?.['data-disabled']).toBe('true');
    expect(ariaFor({ orientation: 'vertical' }).root?.['data-orientation']).toBe('vertical');
  });

  it('track and range are decorative (aria-hidden), thumb is projected per-instance', () => {
    const projection = ariaFor({});
    expect(projection.track?.['aria-hidden']).toBe('true');
    expect(projection.range?.['aria-hidden']).toBe('true');
    // aria() never projects the many-part thumb (instanceAria owns it).
    expect(projection.thumb).toBeUndefined();
  });

  it('instanceAria projects a thumbs valuemin/max/now and orientation', () => {
    const state = sliderBehavior.initialState(base);
    const attrs = sliderBehavior.instanceAria?.('thumb', '25', state, base, {});
    expect(attrs).toEqual({
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '25',
      'aria-orientation': 'horizontal',
      'aria-disabled': undefined,
    });
  });

  it('sliderThumbAria advertises aria-disabled only when disabled', () => {
    const state = sliderBehavior.initialState(base);
    expect(sliderThumbAria('10', state, base)['aria-disabled']).toBeUndefined();
    expect(sliderThumbAria('10', state, { ...base, disabled: true })['aria-disabled']).toBe('true');
  });

  it('thumb declares role=slider as a many-part', () => {
    expect(sliderBehavior.parts.thumb.role).toBe('slider');
    expect(sliderBehavior.parts.thumb.many).toBe(true);
  });
});

describe('slider state (initialState + setThumb reducer)', () => {
  it('seeds from defaultValue, or a single min thumb by default', () => {
    expect(sliderBehavior.initialState(base).values).toEqual([0]);
    expect(sliderBehavior.initialState({ ...base, defaultValue: [30, 70] }).values).toEqual([
      30, 70,
    ]);
  });

  it('controlled value shadows the seed', () => {
    expect(sliderBehavior.initialState({ ...base, value: [42], defaultValue: [1] }).values).toEqual(
      [42],
    );
  });

  it('setThumb assigns one thumb and keeps a range sorted ascending', () => {
    const { memory, dispatch } = createBehavior(sliderBehavior, {
      ...base,
      defaultValue: [20, 80],
    });
    dispatch('setThumb', { ...base, defaultValue: [20, 80] }, { index: 0, value: 100 });
    expect(memory.get().values).toEqual([80, 100]);
  });

  it('setThumb ignores an out-of-range index', () => {
    const { memory, dispatch } = createBehavior(sliderBehavior, base);
    dispatch('setThumb', base, { index: 5, value: 50 });
    expect(memory.get().values).toEqual([0]);
  });

  it('disabled rejects setThumb and leaves state unmoved', () => {
    const config = { ...base, disabled: true, defaultValue: [40] };
    const { memory, dispatch } = createBehavior(sliderBehavior, config);
    expect(dispatch('setThumb', config, { index: 0, value: 60 })).toBe(false);
    expect(memory.get().values).toEqual([40]);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(sliderBehavior, base);
    expect(dispatch('setThumb', { ...base, disabled: true }, { index: 0, value: 5 })).toBe(false);
    expect(memory.get().values).toEqual([0]);
  });
});

describe('slider keymap (pure claim record)', () => {
  const state = sliderBehavior.initialState(base);
  it('claims the slider keys on a thumb', () => {
    for (const key of [
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]) {
      expect(sliderBehavior.keymap({ key }, state, 'thumb', base)).toBe('setThumb');
    }
  });
  it('does not claim other keys or other parts', () => {
    expect(sliderBehavior.keymap({ key: 'Enter' }, state, 'thumb', base)).toBeNull();
    expect(sliderBehavior.keymap({ key: 'ArrowRight' }, state, 'track', base)).toBeNull();
    expect(sliderBehavior.keymap({ key: 'ArrowRight' }, state, 'root', base)).toBeNull();
  });
});

describe('effectiveValues', () => {
  const intrinsic: SliderState = { values: [10] };
  it('returns intrinsic values when uncontrolled', () => {
    expect(effectiveValues(intrinsic, base)).toEqual([10]);
  });
  it('a controlled value shadows the intrinsic state', () => {
    expect(effectiveValues(intrinsic, { ...base, value: [90] })).toEqual([90]);
  });
});

describe('sliderFormValue (form-value axis)', () => {
  it('is empty without a name', () => {
    expect(sliderFormValue({ values: [50] }, base)).toEqual([]);
  });
  it('mirrors one hidden input per thumb under the name', () => {
    expect(sliderFormValue({ values: [25, 75] }, { ...base, name: 'vol' })).toEqual([
      { type: 'hidden', name: 'vol', value: '25' },
      { type: 'hidden', name: 'vol', value: '75' },
    ]);
  });
  it('reads the effective (controlled) values', () => {
    expect(sliderFormValue({ values: [1] }, { ...base, name: 'vol', value: [88] })).toEqual([
      { type: 'hidden', name: 'vol', value: '88' },
    ]);
  });
});
