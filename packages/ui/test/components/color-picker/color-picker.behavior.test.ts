import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  colorPickerBehavior,
  DEFAULT_COLOR,
  DEFAULT_MAX_CHROMA,
  effectiveColor,
  gamutLabel,
  getGamutTier,
  type ColorPickerConfig,
  type ColorPickerState,
} from '../../../src/components/color-picker/color-picker.behavior';

const base: ColorPickerConfig = {
  maxChroma: DEFAULT_MAX_CHROMA,
  disabled: false,
};

const ids = { root: 'r', area: 'r-area', hue: 'r-hue', preview: 'r-preview' };

function ariaFor(config: Partial<ColorPickerConfig>) {
  const full: ColorPickerConfig = { ...base, ...config };
  return colorPickerBehavior.aria(colorPickerBehavior.initialState(full), full, ids);
}

describe('color picker aria projection', () => {
  it('root carries role=group, aria-label, and aria-disabled only when disabled', () => {
    const projection = ariaFor({});
    expect(projection.root).toEqual({
      role: 'group',
      'aria-label': 'Color picker',
      'aria-disabled': undefined,
    });
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBe('true');
  });

  it('area carries aria-label', () => {
    expect(ariaFor({}).area).toEqual({
      'aria-label': 'Lightness and chroma',
    });
  });

  it('hue carries aria-label and value range from the color', () => {
    const projection = ariaFor({ defaultValue: { l: 0.5, c: 0.1, h: 180 } });
    expect(projection.hue).toEqual({
      'aria-label': 'Hue',
      'aria-valuemin': '0',
      'aria-valuemax': '360',
      'aria-valuenow': '180',
    });
  });

  it('hue aria-valuenow rounds to nearest integer', () => {
    const projection = ariaFor({ defaultValue: { l: 0.5, c: 0.1, h: 123.7 } });
    expect(projection.hue?.['aria-valuenow']).toBe('124');
  });

  it('preview carries data-gamut-tier', () => {
    const srgbProjection = ariaFor({ defaultValue: { l: 0.5, c: 0.1, h: 250 } });
    expect(srgbProjection.preview?.['data-gamut-tier']).toBe('srgb');
  });

  it('parts declare root as group, no many parts', () => {
    expect(colorPickerBehavior.parts.root.role).toBe('group');
    expect(colorPickerBehavior.parts.area.many).toBeUndefined();
    expect(colorPickerBehavior.parts.hue.many).toBeUndefined();
    expect(colorPickerBehavior.parts.preview.many).toBeUndefined();
  });
});

describe('color picker state (initialState + setColor reducer)', () => {
  it('seeds from defaultValue, or DEFAULT_COLOR by default', () => {
    expect(colorPickerBehavior.initialState(base).color).toEqual(DEFAULT_COLOR);
    const custom = { l: 0.3, c: 0.2, h: 90 };
    expect(colorPickerBehavior.initialState({ ...base, defaultValue: custom }).color).toEqual(
      custom,
    );
  });

  it('controlled value takes precedence over defaultValue in initialState', () => {
    const controlled = { l: 0.9, c: 0.05, h: 30 };
    const config: ColorPickerConfig = {
      ...base,
      value: controlled,
      defaultValue: DEFAULT_COLOR,
    };
    expect(colorPickerBehavior.initialState(config).color).toEqual(controlled);
  });

  it('setColor replaces the color', () => {
    const { memory, dispatch } = createBehavior(colorPickerBehavior, base);
    const newColor = { l: 0.4, c: 0.3, h: 120 };
    dispatch('setColor', base, { color: newColor });
    expect(memory.get().color).toEqual(newColor);
  });

  it('disabled rejects setColor and leaves state unmoved', () => {
    const config: ColorPickerConfig = {
      ...base,
      disabled: true,
      defaultValue: { l: 0.5, c: 0.1, h: 200 },
    };
    const { memory, dispatch } = createBehavior(colorPickerBehavior, config);
    const result = dispatch('setColor', config, { color: { l: 0.9, c: 0.3, h: 50 } });
    expect(result).toBe(false);
    expect(memory.get().color).toEqual({ l: 0.5, c: 0.1, h: 200 });
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(colorPickerBehavior, base);
    const result = dispatch(
      'setColor',
      { ...base, disabled: true },
      {
        color: { l: 0.1, c: 0.1, h: 10 },
      },
    );
    expect(result).toBe(false);
    expect(memory.get().color).toEqual(DEFAULT_COLOR);
  });
});

describe('effectiveColor', () => {
  const intrinsic: ColorPickerState = { color: { l: 0.5, c: 0.1, h: 200 } };

  it('returns intrinsic color when uncontrolled', () => {
    expect(effectiveColor(intrinsic, base)).toEqual({ l: 0.5, c: 0.1, h: 200 });
  });

  it('a controlled value shadows the intrinsic state', () => {
    const controlled = { l: 0.9, c: 0.05, h: 30 };
    expect(effectiveColor(intrinsic, { ...base, value: controlled })).toEqual(controlled);
  });
});

describe('getGamutTier', () => {
  it('classifies sRGB colors as srgb', () => {
    expect(getGamutTier(0.5, 0.05, 250)).toBe('srgb');
  });

  it('classifies high-chroma colors outside sRGB', () => {
    const tier = getGamutTier(0.7, 0.3, 150);
    expect(['p3', 'out']).toContain(tier);
  });
});

describe('gamutLabel', () => {
  it('maps tiers to display strings', () => {
    expect(gamutLabel('srgb')).toBe('sRGB');
    expect(gamutLabel('p3')).toBe('P3');
    expect(gamutLabel('out')).toBe('Out of gamut');
  });
});

describe('color picker keymap', () => {
  const state = colorPickerBehavior.initialState(base);

  it('returns null for all keys (keyboard delegated to interactive primitive)', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Enter', ' ']) {
      expect(colorPickerBehavior.keymap({ key }, state, 'root', base)).toBeNull();
      expect(colorPickerBehavior.keymap({ key }, state, 'area', base)).toBeNull();
      expect(colorPickerBehavior.keymap({ key }, state, 'hue', base)).toBeNull();
    }
  });
});
