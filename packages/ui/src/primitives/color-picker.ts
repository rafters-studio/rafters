/**
 * Color picker composition primitive - orchestrates color-area, hue-bar,
 * color-input, color-swatch, interactive, and oklch-gamut into a unified
 * OKLCH color selection state machine
 *
 * Composition primitives use nanostores atoms to share reactive state between
 * multiple leaf primitives. The color picker wires 2D area selection, hue bar,
 * numeric inputs, and preview swatch into a single coherent reactive store.
 *
 * @registry-name color-picker
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/color-picker.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 6/10 - Multiple interaction surfaces unified by a single reactive atom
 * @attention-economics Spatial color: area for L/C, bar for hue, inputs for precision, preview for confirmation
 * @trust-building Immediate visual feedback via reactive state, gamut tier indicator, precise numeric entry
 * @accessibility Delegates to interactive primitive for keyboard navigation; screen reader support via ARIA on each surface
 * @semantic-meaning Composition = unified color selection; leaf primitives handle individual rendering concerns
 *
 * @dependencies nanostores@^0.11.0
 * @devDependencies
 * @internal-dependencies @rafters/color-utils
 *
 * @usage-patterns
 * DO: Use createColorPickerState to get a single reactive atom for the entire picker
 * DO: Subscribe to $color for live updates across all surfaces
 * DO: Call destroy() on cleanup to tear down all child primitives
 * NEVER: Manage color-area, hue-bar, and color-input state independently
 * NEVER: Bypass the reactive atom to set color values directly on DOM elements
 *
 * @example
 * ```ts
 * import { atom } from 'nanostores';
 *
 * const state = createColorPickerState({
 *   areaCanvas,
 *   areaContainer,
 *   hueCanvas,
 *   hueContainer,
 *   inputs: { l: lInput, c: cInput, h: hInput },
 *   preview: previewEl,
 *   initialColor: { l: 0.7, c: 0.15, h: 250 },
 * });
 *
 * state.$color.subscribe((color) => console.log(color));
 * state.destroy();
 * ```
 */
import { atom } from 'nanostores';
import { createColorArea, updateColorArea } from './color-area';
import type { ColorInputField } from './color-input';
import { createColorInput, updateColorInput } from './color-input';
import { createSwatch, updateSwatch } from './color-swatch';
import { createHueBar, updateHueBar } from './hue-bar';
import { createInteractive } from './interactive';
import { inP3, inSrgb } from './oklch-gamut';
import type {
  CleanupFunction,
  Direction,
  GamutTier,
  MoveDelta,
  NormalizedPoint,
  OklchColor,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface ColorPickerStateOptions {
  /** Canvas element for the 2D lightness/chroma area */
  areaCanvas: HTMLCanvasElement;
  /** Container element for area interaction (pointer/keyboard) */
  areaContainer: HTMLElement;
  /** Canvas element for the hue bar */
  hueCanvas: HTMLCanvasElement;
  /** Container element for hue bar interaction */
  hueContainer: HTMLElement;
  /** Numeric input elements mapped to OKLCH channels */
  inputs: { l: HTMLInputElement; c: HTMLInputElement; h: HTMLInputElement };
  /** Preview swatch element */
  preview: HTMLElement;
  /** Area thumb element for visual feedback */
  areaThumb?: HTMLElement;
  /** Hue thumb element for visual feedback */
  hueThumb?: HTMLElement;
  /** Initial OKLCH color */
  initialColor?: OklchColor;
  /** Maximum chroma for the area y-axis @default 0.4 */
  maxChroma?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Text direction for RTL support */
  dir?: Direction;
  /** Called on every color change */
  onColorChange?: (color: OklchColor) => void;
  /** Called when a change is committed (pointer up, input blur/Enter) */
  onColorCommit?: (color: OklchColor) => void;
}

export interface ColorPickerStateControls {
  /** Reactive atom with current OKLCH color */
  $color: {
    get(): OklchColor;
    /** Subscribe and fire immediately with current value */
    subscribe(cb: (value: OklchColor) => void): () => void;
    /** Listen for future changes only (no immediate call) */
    listen(cb: (value: OklchColor) => void): () => void;
  };
  /** Set color programmatically (fires onColorChange) */
  setColor: (color: OklchColor) => void;
  /** Push color without firing callbacks (for controlled value sync) */
  pushColor: (color: OklchColor) => void;
  /** Clean up all child primitives and subscriptions */
  destroy: CleanupFunction;
}

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_COLOR: OklchColor = { l: 0.7, c: 0.15, h: 250 };
const DEFAULT_MAX_CHROMA = 0.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getGamutTier(l: number, c: number, h: number): GamutTier {
  if (inSrgb(l, c, h)) return 'gold';
  if (inP3(l, c, h)) return 'silver';
  return 'fail';
}

function resolveKeyDelta(current: number, delta: number, scale: number, max: number): number {
  if (Number.isFinite(delta)) {
    return clamp(current + delta * scale, 0, max);
  }
  return delta < 0 ? 0 : max;
}

// ============================================================================
// Implementation
// ============================================================================

export function createColorPickerState(options: ColorPickerStateOptions): ColorPickerStateControls {
  const {
    areaCanvas,
    areaContainer,
    hueCanvas,
    hueContainer,
    inputs,
    preview,
    areaThumb,
    hueThumb,
    initialColor = DEFAULT_COLOR,
    maxChroma = DEFAULT_MAX_CHROMA,
    disabled = false,
    dir,
    onColorChange,
    onColorCommit,
  } = options;

  const safeMaxChroma = Math.max(maxChroma, 1e-6);
  const cleanups: CleanupFunction[] = [];
  const $color = atom<OklchColor>(initialColor);

  const dirOption = dir !== undefined ? { dir } : {};

  // Area interactive (2D)
  cleanups.push(
    createInteractive(areaContainer, {
      mode: '2d',
      disabled,
      ...dirOption,
      onMove: (point: NormalizedPoint) => {
        const cur = $color.get();
        const newColor = { l: point.left, c: (1 - point.top) * safeMaxChroma, h: cur.h };
        $color.set(newColor);
        onColorChange?.(newColor);
      },
      onKeyMove: (delta: MoveDelta) => {
        const cur = $color.get();
        const newL = resolveKeyDelta(cur.l, delta.dLeft, 1, 1);
        const newC = resolveKeyDelta(cur.c, -delta.dTop, safeMaxChroma, safeMaxChroma);
        const newColor = { l: newL, c: newC, h: cur.h };
        $color.set(newColor);
        onColorChange?.(newColor);
      },
    }),
  );

  // Hue interactive (1D horizontal)
  cleanups.push(
    createInteractive(hueContainer, {
      mode: '1d-horizontal',
      disabled,
      ...dirOption,
      onMove: (point: NormalizedPoint) => {
        const cur = $color.get();
        const newColor = { ...cur, h: point.left * 360 };
        $color.set(newColor);
        onColorChange?.(newColor);
      },
      onKeyMove: (delta: MoveDelta) => {
        const cur = $color.get();
        const newH = resolveKeyDelta(cur.h, delta.dLeft, 360, 360);
        const newColor = { ...cur, h: newH };
        $color.set(newColor);
        onColorChange?.(newColor);
      },
    }),
  );

  // Color area canvas
  cleanups.push(createColorArea(areaCanvas, { hue: initialColor.h, maxChroma: safeMaxChroma }));

  // Hue bar canvas
  cleanups.push(createHueBar(hueCanvas, { lightness: initialColor.l, chroma: initialColor.c }));

  // Color inputs
  const fields: ColorInputField[] = [
    { element: inputs.l, channel: 'l' },
    { element: inputs.c, channel: 'c' },
    { element: inputs.h, channel: 'h' },
  ];
  cleanups.push(
    createColorInput(fields, {
      value: initialColor,
      onChange: (newColor) => {
        const color = { l: newColor.l, c: newColor.c, h: newColor.h };
        $color.set(color);
        onColorChange?.(color);
      },
      onCommit: (newColor) => {
        const color = { l: newColor.l, c: newColor.c, h: newColor.h };
        $color.set(color);
        onColorCommit?.(color);
      },
    }),
  );

  // Swatches
  const tier = getGamutTier(initialColor.l, initialColor.c, initialColor.h);
  const swatchState = { l: initialColor.l, c: initialColor.c, h: initialColor.h, tier };
  const swatchElements = [preview, areaThumb, hueThumb].filter(
    (el): el is HTMLElement => el != null,
  );
  for (const el of swatchElements) {
    cleanups.push(createSwatch(el, swatchState));
  }

  // Subscribe to color changes and propagate to leaf primitives
  const unsubColor = $color.subscribe((color) => {
    updateColorArea(areaCanvas, { hue: color.h, maxChroma: safeMaxChroma });
    updateHueBar(hueCanvas, { lightness: color.l, chroma: color.c });
    updateColorInput(fields, {
      value: { l: color.l, c: color.c, h: color.h },
      onChange: () => {},
    });
    const colorTier = getGamutTier(color.l, color.c, color.h);
    const state = { l: color.l, c: color.c, h: color.h, tier: colorTier };
    for (const el of swatchElements) {
      updateSwatch(el, state);
    }
  });
  cleanups.push(unsubColor);

  // Pointer commit: document-level listeners on pointerdown ensure
  // drag-release outside the container still fires onColorCommit.
  const commitAndDetach = () => {
    document.removeEventListener('mouseup', commitAndDetach);
    document.removeEventListener('touchend', commitAndDetach);
    onColorCommit?.($color.get());
  };
  const attachCommit = () => {
    if (disabled) return;
    document.addEventListener('mouseup', commitAndDetach);
    document.addEventListener('touchend', commitAndDetach);
  };
  const containers = [areaContainer, hueContainer];
  for (const el of containers) {
    el.addEventListener('mousedown', attachCommit);
    el.addEventListener('touchstart', attachCommit);
  }
  cleanups.push(() => {
    for (const el of containers) {
      el.removeEventListener('mousedown', attachCommit);
      el.removeEventListener('touchstart', attachCommit);
    }
    document.removeEventListener('mouseup', commitAndDetach);
    document.removeEventListener('touchend', commitAndDetach);
  });

  function setColor(color: OklchColor): void {
    $color.set(color);
    onColorChange?.(color);
  }

  function pushColor(color: OklchColor): void {
    $color.set(color);
  }

  return {
    $color,
    setColor,
    pushColor,
    destroy() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
