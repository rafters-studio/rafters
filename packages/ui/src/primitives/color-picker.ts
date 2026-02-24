/**
 * Color Picker composition primitive
 * Owns OKLCH color state via nanostores atoms and wires five leaf primitives
 * (color-area, hue-bar, color-input, color-swatch, oklch-gamut) together
 * with zero glue code.
 *
 * Composition primitives orchestrate multiple leaf primitives through shared
 * reactive state. Only composition primitives may import nanostores.
 *
 * Framework-agnostic, SSR-safe. All mutations are synchronous.
 *
 * @example
 * ```typescript
 * const picker = createColorPicker({
 *   initialColor: { l: 0.7, c: 0.15, h: 250 },
 *   onChange: (color) => console.log(color),
 * });
 *
 * // Read reactive state
 * picker.$color.get(); // { l: 0.7, c: 0.15, h: 250, alpha: 1 }
 * picker.$cssColor.get(); // "oklch(0.7 0.15 250)"
 * picker.$inGamut.get(); // true
 *
 * // Update individual channels
 * picker.setHue(180);
 * picker.setLightness(0.5);
 *
 * // Wire to leaf primitives
 * const areaCleanup = picker.connectColorArea(canvas, { maxChroma: 0.4 });
 * const hueCleanup = picker.connectHueBar(canvas, { orientation: 'horizontal' });
 *
 * // Teardown
 * picker.destroy();
 * ```
 */

import { hexToOKLCH, toNearestGamut } from '@rafters/color-utils';
import { atom, computed } from 'nanostores';
import type { ColorAreaOptions } from './color-area';
import { createColorArea, updateColorArea } from './color-area';
import type { ColorInputField, ColorInputOptions } from './color-input';
import { createColorInput, updateColorInput } from './color-input';
import type { SwatchOptions } from './color-swatch';
import { createSwatch, updateSwatch } from './color-swatch';
import type { HueBarOptions } from './hue-bar';
import { createHueBar, updateHueBar } from './hue-bar';
import { inP3, inSrgb } from './oklch-gamut';
import type { CleanupFunction, GamutTier, OklchColorAlpha } from './types';

// ---------------------------------------------------------------------------
// Channel clamping
// ---------------------------------------------------------------------------

const CHANNEL_BOUNDS = {
  l: { min: 0, max: 1 },
  c: { min: 0, max: 0.4 },
  h: { min: 0, max: 360 },
  alpha: { min: 0, max: 1 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeHue(h: number): number {
  if (Number.isNaN(h)) return 0;
  return ((h % 360) + 360) % 360;
}

function clampChannel(channel: keyof typeof CHANNEL_BOUNDS, value: number): number {
  if (Number.isNaN(value)) {
    return channel === 'h' ? 0 : CHANNEL_BOUNDS[channel].min;
  }
  if (channel === 'h') {
    return normalizeHue(value);
  }
  const { min, max } = CHANNEL_BOUNDS[channel];
  return clamp(value, min, max);
}

// ---------------------------------------------------------------------------
// Default color
// ---------------------------------------------------------------------------

const DEFAULT_COLOR: OklchColorAlpha = { l: 0.7, c: 0.15, h: 250, alpha: 1 };

// ---------------------------------------------------------------------------
// CSS color parsing (delegates to @rafters/color-utils via colorjs.io)
// ---------------------------------------------------------------------------

/**
 * Parse any CSS color string (hex, rgb(), hsl(), oklch(), named colors, etc.)
 * into an OklchColorAlpha value.
 *
 * Throws a descriptive error for unparseable input.
 */
function parseCssColor(css: string): OklchColorAlpha {
  try {
    // hexToOKLCH uses colorjs.io's Color constructor which accepts
    // all CSS color syntaxes, not just hex
    const oklch = hexToOKLCH(css);
    // clampChannel handles NaN for l/c/h (falls back to 0).
    // Alpha needs explicit NaN guard because NaN should default to 1, not 0.
    return {
      l: clampChannel('l', oklch.l),
      c: clampChannel('c', oklch.c),
      h: clampChannel('h', oklch.h),
      alpha: clampChannel('alpha', Number.isNaN(oklch.alpha) ? 1 : (oklch.alpha ?? 1)),
    };
  } catch (error) {
    throw new Error(`Invalid CSS color: '${css}'`, { cause: error });
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ColorPickerOptions {
  /** Starting color. Defaults to oklch(0.7 0.15 250 / 1). */
  initialColor?: OklchColorAlpha;

  /**
   * When true, setColor/setFromCss/channel setters automatically snap
   * out-of-gamut values to the nearest sRGB-safe color.
   * @default false
   */
  gamutMapping?: boolean;

  /** Fires synchronously on every color change. */
  onChange?: (color: OklchColorAlpha) => void;
}

export interface ColorPickerInstance {
  // -- Reactive state -------------------------------------------------------

  /** Writable atom holding the current OKLCH color. */
  $color: ReturnType<typeof atom<OklchColorAlpha>>;

  /** Computed CSS oklch() string, recomputes on any channel change. */
  $cssColor: ReturnType<typeof computed>;

  /** Computed boolean: true when the current color is within the sRGB gamut. */
  $inGamut: ReturnType<typeof computed>;

  // -- Setters --------------------------------------------------------------

  /** Replace the entire color. Throws if required fields are missing. */
  setColor: (color: OklchColorAlpha) => void;

  /** Set lightness (0-1). Out-of-range values are clamped. */
  setLightness: (l: number) => void;

  /** Set chroma (0-0.4). Out-of-range values are clamped. */
  setChroma: (c: number) => void;

  /** Set hue (0-360). Out-of-range values are clamped. */
  setHue: (h: number) => void;

  /** Set alpha (0-1). Out-of-range values are clamped. */
  setAlpha: (a: number) => void;

  /**
   * Parse a CSS color string and set it as the current color.
   * Accepts hex, rgb(), hsl(), oklch(), named colors.
   * Throws with "Invalid CSS color: '{value}'" for unparseable input.
   */
  setFromCss: (css: string) => void;

  // -- Leaf primitive connectors --------------------------------------------

  /**
   * Return options object shaped for createColorArea().
   * The returned object reflects the current hue from $color.
   */
  getColorAreaOptions: () => ColorAreaOptions;

  /**
   * Return options object shaped for createHueBar().
   * The returned object reflects the current lightness and chroma from $color.
   */
  getHueBarOptions: () => HueBarOptions;

  /**
   * Return options object shaped for createColorInput().
   * The onChange callback updates the picker's internal state.
   */
  getColorInputOptions: () => ColorInputOptions;

  /**
   * Return options object shaped for createSwatch().
   * The returned object reflects the current OKLCH channels from $color.
   */
  getSwatchOptions: () => SwatchOptions;

  /**
   * Return the gamut tier for the current color.
   * Uses the inline oklch-gamut primitive for sRGB checks and
   * delegates to @rafters/color-utils for full tier classification.
   */
  getGamutTier: () => GamutTier;

  // -- DOM connectors -------------------------------------------------------

  /**
   * Connect a canvas element as a color area. Subscribes to hue changes
   * and auto-updates. Returns a cleanup function.
   */
  connectColorArea: (
    canvas: HTMLCanvasElement,
    overrides?: Partial<ColorAreaOptions>,
  ) => CleanupFunction;

  /**
   * Connect a canvas element as a hue bar. Subscribes to lightness/chroma
   * changes and auto-updates. Returns a cleanup function.
   */
  connectHueBar: (canvas: HTMLCanvasElement, overrides?: Partial<HueBarOptions>) => CleanupFunction;

  /**
   * Connect input fields for direct OKLCH entry. Subscribes to color
   * changes and auto-updates. Returns a cleanup function.
   */
  connectColorInput: (
    fields: ColorInputField[],
    overrides?: Partial<Pick<ColorInputOptions, 'precision' | 'onCommit'>>,
  ) => CleanupFunction;

  /**
   * Connect an element as a color swatch. Subscribes to color changes
   * and auto-updates. Returns a cleanup function.
   */
  connectSwatch: (element: HTMLElement, overrides?: Partial<SwatchOptions>) => CleanupFunction;

  // -- Lifecycle ------------------------------------------------------------

  /** Unsubscribe all internal store listeners. */
  destroy: () => void;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a color picker composition primitive.
 *
 * All state is held in nanostores atoms. Channel setters clamp values
 * to their valid ranges. The onChange callback fires synchronously
 * after every mutation.
 */
export function createColorPicker(options?: ColorPickerOptions): ColorPickerInstance {
  const initialColor: OklchColorAlpha = options?.initialColor
    ? {
        l: clampChannel('l', options.initialColor.l),
        c: clampChannel('c', options.initialColor.c),
        h: clampChannel('h', options.initialColor.h),
        alpha: clampChannel('alpha', options.initialColor.alpha ?? 1),
      }
    : { ...DEFAULT_COLOR };

  const gamutMapping = options?.gamutMapping ?? false;
  const onChange = options?.onChange;

  // -------------------------------------------------------------------------
  // Reactive stores
  // -------------------------------------------------------------------------

  const $color = atom<OklchColorAlpha>(initialColor);

  const $cssColor = computed($color, (color) => {
    const a = color.alpha ?? 1;
    const l = +color.l.toFixed(4);
    const c = +color.c.toFixed(4);
    const h = +color.h.toFixed(2);
    if (a < 1) {
      return `oklch(${l} ${c} ${h} / ${+a.toFixed(2)})`;
    }
    return `oklch(${l} ${c} ${h})`;
  });

  const $inGamut = computed($color, (color) => inSrgb(color.l, color.c, color.h));

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Apply gamut mapping if enabled, then set the atom and fire onChange. */
  function commitColor(color: OklchColorAlpha): void {
    let final = color;

    if (gamutMapping && !inSrgb(color.l, color.c, color.h)) {
      const mapped = toNearestGamut({
        l: color.l,
        c: color.c,
        h: color.h,
        alpha: color.alpha ?? 1,
      });
      final = {
        l: clampChannel('l', mapped.color.l),
        c: clampChannel('c', mapped.color.c),
        h: clampChannel('h', mapped.color.h),
        alpha: color.alpha ?? 1,
      };
    }

    $color.set(final);
    if (onChange) {
      try {
        onChange(final);
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }

  /** Build a new color with one channel replaced. */
  function withChannel(channel: 'l' | 'c' | 'h' | 'alpha', value: number): OklchColorAlpha {
    const current = $color.get();
    return { ...current, [channel]: value };
  }

  // -------------------------------------------------------------------------
  // Setters
  // -------------------------------------------------------------------------

  function setColor(color: OklchColorAlpha): void {
    if (
      color == null ||
      typeof color.l !== 'number' ||
      typeof color.c !== 'number' ||
      typeof color.h !== 'number'
    ) {
      throw new Error(
        'setColor requires an object with numeric l, c, h fields (alpha is optional)',
      );
    }

    commitColor({
      l: clampChannel('l', color.l),
      c: clampChannel('c', color.c),
      h: clampChannel('h', color.h),
      alpha: clampChannel('alpha', color.alpha ?? 1),
    });
  }

  function setLightness(l: number): void {
    commitColor(withChannel('l', clampChannel('l', l)));
  }

  function setChroma(c: number): void {
    commitColor(withChannel('c', clampChannel('c', c)));
  }

  function setHue(h: number): void {
    commitColor(withChannel('h', clampChannel('h', h)));
  }

  function setAlpha(a: number): void {
    commitColor(withChannel('alpha', clampChannel('alpha', a)));
  }

  function setFromCss(css: string): void {
    commitColor(parseCssColor(css));
  }

  // -------------------------------------------------------------------------
  // Leaf primitive option builders
  // -------------------------------------------------------------------------

  function getColorAreaOptions(): ColorAreaOptions {
    return { hue: $color.get().h };
  }

  function getHueBarOptions(): HueBarOptions {
    const { l, c } = $color.get();
    return { lightness: l, chroma: c };
  }

  function getColorInputOptions(): ColorInputOptions {
    return {
      value: $color.get(),
      onChange: setColor,
    };
  }

  function getSwatchOptions(): SwatchOptions {
    const { l, c, h, alpha = 1 } = $color.get();
    return { l, c, h, alpha, tier: getGamutTier() };
  }

  function getGamutTier(): GamutTier {
    const { l, c, h } = $color.get();
    if (inSrgb(l, c, h)) return 'gold';
    if (inP3(l, c, h)) return 'silver';
    return 'fail';
  }

  // -------------------------------------------------------------------------
  // DOM connectors (subscribe to store and auto-update leaf primitives)
  // -------------------------------------------------------------------------

  const unsubscribers: CleanupFunction[] = [];

  function connectColorArea(
    canvas: HTMLCanvasElement,
    overrides?: Partial<ColorAreaOptions>,
  ): CleanupFunction {
    const leafCleanup = createColorArea(canvas, { ...getColorAreaOptions(), ...overrides });

    const unsub = $color.subscribe((color) => {
      updateColorArea(canvas, { hue: color.h, ...overrides });
    });
    unsubscribers.push(unsub);

    return () => {
      leafCleanup();
      unsub();
    };
  }

  function connectHueBar(
    canvas: HTMLCanvasElement,
    overrides?: Partial<HueBarOptions>,
  ): CleanupFunction {
    const leafCleanup = createHueBar(canvas, { ...getHueBarOptions(), ...overrides });

    const unsub = $color.subscribe((color) => {
      updateHueBar(canvas, { lightness: color.l, chroma: color.c, ...overrides });
    });
    unsubscribers.push(unsub);

    return () => {
      leafCleanup();
      unsub();
    };
  }

  function connectColorInput(
    fields: ColorInputField[],
    overrides?: Partial<Pick<ColorInputOptions, 'precision' | 'onCommit'>>,
  ): CleanupFunction {
    const leafCleanup = createColorInput(fields, { ...getColorInputOptions(), ...overrides });

    const unsub = $color.subscribe((color) => {
      updateColorInput(fields, { value: color, onChange: setColor, ...overrides });
    });
    unsubscribers.push(unsub);

    return () => {
      leafCleanup();
      unsub();
    };
  }

  function connectSwatch(
    element: HTMLElement,
    overrides?: Partial<SwatchOptions>,
  ): CleanupFunction {
    const leafCleanup = createSwatch(element, { ...getSwatchOptions(), ...overrides });

    const unsub = $color.subscribe(() => {
      updateSwatch(element, { ...getSwatchOptions(), ...overrides });
    });
    unsubscribers.push(unsub);

    return () => {
      leafCleanup();
      unsub();
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  function destroy(): void {
    for (const unsub of unsubscribers) {
      unsub();
    }
    unsubscribers.length = 0;
  }

  // -------------------------------------------------------------------------
  // Public instance
  // -------------------------------------------------------------------------

  return {
    $color,
    $cssColor,
    $inGamut,

    setColor,
    setLightness,
    setChroma,
    setHue,
    setAlpha,
    setFromCss,

    getColorAreaOptions,
    getHueBarOptions,
    getColorInputOptions,
    getSwatchOptions,
    getGamutTier,

    connectColorArea,
    connectHueBar,
    connectColorInput,
    connectSwatch,

    destroy,
  };
}
