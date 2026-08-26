import { getGamutTier as computeGamutTier } from '@rafters/color-utils';
import { compose, type Slice } from '../../lib/compose';
import {
  createBehavior,
  type AriaAttrs,
  type BehaviorSpec,
  type PartIds,
} from '../../lib/contract';
import { updateAriaAttribute } from '../../primitives/aria-manager';
import { createColorArea, updateColorArea } from '../../primitives/color-area';
import type { ColorInputField } from '../../primitives/color-input';
import { createColorInput, updateColorInput } from '../../primitives/color-input';
import { createSwatch, updateSwatch } from '../../primitives/color-swatch';
import { createHueBar, updateHueBar } from '../../primitives/hue-bar';
import { createInteractive } from '../../primitives/interactive';
import { barPosFromHue, hueFromBarPos } from '../../primitives/hue-warp';
import type {
  CleanupFunction,
  Direction,
  GamutTier,
  MoveDelta,
  NormalizedPoint,
  OklchColor,
} from '../../primitives/types';

export const DEFAULT_COLOR: OklchColor = { l: 0.7, c: 0.15, h: 250 };
export const DEFAULT_MAX_CHROMA = 0.4;

// ============================================================================
// Score
// ============================================================================

export interface ColorPickerConfig {
  value?: OklchColor | undefined;
  defaultValue?: OklchColor | undefined;
  maxChroma: number;
  disabled: boolean;
  dir?: Direction | undefined;
}

export interface ColorPickerState {
  color: OklchColor;
}

export type ColorPickerActions = {
  setColor: { color: OklchColor };
};

export type ColorPickerPart = 'root' | 'area' | 'hue' | 'preview';

export function effectiveColor(state: ColorPickerState, config: ColorPickerConfig): OklchColor {
  return config.value ?? state.color;
}

export function getGamutTier(l: number, c: number, h: number): GamutTier {
  return computeGamutTier({ l, c, h, alpha: 1 });
}

export { barPosFromHue, hueFromBarPos };
export type { GamutTier, OklchColor, Direction };

const GAMUT_LABELS: Record<GamutTier, string> = {
  srgb: 'sRGB',
  p3: 'P3',
  out: 'Out of gamut',
};

export function gamutLabel(tier: GamutTier): string {
  return GAMUT_LABELS[tier];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function resolveKeyDelta(current: number, delta: number, scale: number, max: number): number {
  if (Number.isFinite(delta)) {
    return clamp(current + delta * scale, 0, max);
  }
  return delta < 0 ? 0 : max;
}

const colorPicker: Slice<ColorPickerConfig, ColorPickerState, ColorPickerActions, ColorPickerPart> =
  {
    name: 'color-picker',
    parts: {
      root: { role: 'group' },
      area: {},
      hue: {},
      preview: {},
    },
    initialState: (config) => ({
      color: config.value ?? config.defaultValue ?? DEFAULT_COLOR,
    }),
    actions: {
      setColor: (_state, { color }) => ({ color }),
    },
    canDispatch: (_state, _action, config) => !config.disabled,
    aria: (state, config) => {
      const color = effectiveColor(state, config);
      return {
        root: {
          role: 'group',
          'aria-label': 'Color picker',
          'aria-disabled': config.disabled ? 'true' : undefined,
        },
        area: {
          'aria-label': 'Lightness and chroma',
        },
        hue: {
          'aria-label': 'Hue',
          'aria-valuemin': '0',
          'aria-valuemax': '360',
          'aria-valuenow': String(Math.round(color.h)),
        },
        preview: {
          'data-gamut-tier': getGamutTier(color.l, color.c, color.h),
        },
      };
    },
    keymap: () => null,
  };

export const colorPickerBehavior: BehaviorSpec<
  ColorPickerConfig,
  ColorPickerState,
  ColorPickerActions,
  ColorPickerPart
> = compose('color-picker', colorPicker);

// ============================================================================
// Shared composition function (React useEffect + bindColorPicker both call)
// ============================================================================

export interface ColorPickerCompositionOptions {
  areaCanvas: HTMLCanvasElement;
  areaContainer: HTMLElement;
  areaThumb: HTMLElement;
  hueCanvas: HTMLCanvasElement;
  hueContainer: HTMLElement;
  hueThumb: HTMLElement;
  inputs: { l: HTMLInputElement; c: HTMLInputElement; h: HTMLInputElement };
  preview: HTMLElement;
  gamutLabelEl?: HTMLElement | null;
  getConfig: () => ColorPickerConfig;
  getColor: () => OklchColor;
  request: (color: OklchColor) => void;
  commit: (color: OklchColor) => void;
}

export function composeColorPickerInteractions(
  options: ColorPickerCompositionOptions,
): CleanupFunction {
  const {
    areaCanvas,
    areaContainer,
    areaThumb,
    hueCanvas,
    hueContainer,
    hueThumb,
    inputs,
    preview,
    getConfig,
    getColor,
    request,
    commit,
  } = options;

  const config = getConfig();
  const color = getColor();
  const safeMaxChroma = Math.max(config.maxChroma, 1e-6);
  const dirOption = config.dir !== undefined ? { dir: config.dir } : {};
  const cleanups: CleanupFunction[] = [];

  // Area interactive (2D: lightness x chroma)
  cleanups.push(
    createInteractive(areaContainer, {
      mode: '2d',
      disabled: config.disabled,
      ...dirOption,
      onMove: (point: NormalizedPoint) => {
        const cfg = getConfig();
        const cur = getColor();
        const mc = Math.max(cfg.maxChroma, 1e-6);
        request({ l: point.left, c: (1 - point.top) * mc, h: cur.h });
      },
      onKeyMove: (delta: MoveDelta) => {
        const cfg = getConfig();
        const cur = getColor();
        const mc = Math.max(cfg.maxChroma, 1e-6);
        const newL = resolveKeyDelta(cur.l, delta.dLeft, 1, 1);
        const newC = resolveKeyDelta(cur.c, -delta.dTop, mc, mc);
        request({ l: newL, c: newC, h: cur.h });
      },
    }),
  );

  // Hue interactive (1D horizontal)
  cleanups.push(
    createInteractive(hueContainer, {
      mode: '1d-horizontal',
      disabled: config.disabled,
      ...dirOption,
      onMove: (point: NormalizedPoint) => {
        const cur = getColor();
        request({ ...cur, h: hueFromBarPos(point.left) });
      },
      onKeyMove: (delta: MoveDelta) => {
        const cur = getColor();
        const newH = resolveKeyDelta(cur.h, delta.dLeft, 360, 360);
        request({ ...cur, h: newH });
      },
    }),
  );

  // Color area canvas
  cleanups.push(createColorArea(areaCanvas, { hue: color.h, maxChroma: safeMaxChroma }));

  // Hue bar canvas
  cleanups.push(createHueBar(hueCanvas, { lightness: color.l, chroma: color.c, vivid: true }));

  // Color inputs
  const fields: ColorInputField[] = [
    { element: inputs.l, channel: 'l' },
    { element: inputs.c, channel: 'c' },
    { element: inputs.h, channel: 'h' },
  ];
  cleanups.push(
    createColorInput(fields, {
      value: color,
      onChange: (newColor) => request({ l: newColor.l, c: newColor.c, h: newColor.h }),
      onCommit: (newColor) => commit({ l: newColor.l, c: newColor.c, h: newColor.h }),
    }),
  );

  // Preview swatch
  const tier = getGamutTier(color.l, color.c, color.h);
  cleanups.push(createSwatch(preview, { l: color.l, c: color.c, h: color.h, tier }));
  for (const el of [areaThumb, hueThumb]) {
    cleanups.push(createSwatch(el, { l: color.l, c: color.c, h: color.h, tier }));
  }

  // Pointer commit: document-level listeners ensure drag-release outside
  // the container still fires the commit callback.
  const commitAndDetach = () => {
    document.removeEventListener('mouseup', commitAndDetach);
    document.removeEventListener('touchend', commitAndDetach);
    commit(getColor());
  };
  const attachCommit = () => {
    if (getConfig().disabled) return;
    document.addEventListener('mouseup', commitAndDetach);
    document.addEventListener('touchend', commitAndDetach);
  };
  for (const el of [areaContainer, hueContainer]) {
    el.addEventListener('mousedown', attachCommit);
    el.addEventListener('touchstart', attachCommit);
  }
  cleanups.push(() => {
    for (const el of [areaContainer, hueContainer]) {
      el.removeEventListener('mousedown', attachCommit);
      el.removeEventListener('touchstart', attachCommit);
    }
    document.removeEventListener('mouseup', commitAndDetach);
    document.removeEventListener('touchend', commitAndDetach);
  });

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

/**
 * Render the live state to the DOM: update canvases, inputs, swatches, thumbs,
 * gamut label. Called by memory.subscribe in bindColorPicker and by React's
 * useMemory-driven re-render.
 */
export function paintColorPicker(
  color: OklchColor,
  config: ColorPickerConfig,
  elements: {
    areaCanvas: HTMLCanvasElement;
    areaThumb: HTMLElement;
    hueCanvas: HTMLCanvasElement;
    hueThumb: HTMLElement;
    inputs: { l: HTMLInputElement; c: HTMLInputElement; h: HTMLInputElement };
    preview: HTMLElement;
    gamutLabelEl?: HTMLElement | null;
  },
): void {
  const safeMaxChroma = Math.max(config.maxChroma, 1e-6);
  const tier = getGamutTier(color.l, color.c, color.h);

  updateColorArea(elements.areaCanvas, { hue: color.h, maxChroma: safeMaxChroma });
  updateHueBar(elements.hueCanvas, { lightness: color.l, chroma: color.c, vivid: true });

  const fields: ColorInputField[] = [
    { element: elements.inputs.l, channel: 'l' },
    { element: elements.inputs.c, channel: 'c' },
    { element: elements.inputs.h, channel: 'h' },
  ];
  updateColorInput(fields, { value: color, onChange: () => {} });

  const swatchState = { l: color.l, c: color.c, h: color.h, tier };
  updateSwatch(elements.preview, swatchState);
  updateSwatch(elements.areaThumb, swatchState);
  updateSwatch(elements.hueThumb, swatchState);

  // Thumb positions (inline style, not classes)
  elements.areaThumb.style.left = `${color.l * 100}%`;
  elements.areaThumb.style.top = `${(1 - color.c / safeMaxChroma) * 100}%`;
  elements.hueThumb.style.left = `${barPosFromHue(color.h) * 100}%`;

  if (elements.gamutLabelEl) {
    elements.gamutLabelEl.textContent = gamutLabel(tier);
  }
}

// ============================================================================
// DOM-native binding (WC + Astro)
// ============================================================================

function readConfigFromRoot(root: HTMLElement): ColorPickerConfig {
  const disabled = root.getAttribute('data-disabled') === 'true';
  const maxChroma = Number(root.getAttribute('data-max-chroma') ?? DEFAULT_MAX_CHROMA);
  const dir = root.getAttribute('dir') as Direction | null;

  const defaultL = Number(root.getAttribute('data-default-l') ?? DEFAULT_COLOR.l);
  const defaultC = Number(root.getAttribute('data-default-c') ?? DEFAULT_COLOR.c);
  const defaultH = Number(root.getAttribute('data-default-h') ?? DEFAULT_COLOR.h);

  return {
    maxChroma: Number.isFinite(maxChroma) ? maxChroma : DEFAULT_MAX_CHROMA,
    disabled,
    ...(dir ? { dir } : {}),
    defaultValue: { l: defaultL, c: defaultC, h: defaultH },
  };
}

export function bindColorPicker(root: HTMLElement): CleanupFunction {
  const areaContainer = root.querySelector<HTMLElement>('[data-part="area"]');
  const areaCanvas = areaContainer?.querySelector<HTMLCanvasElement>('canvas');
  const areaThumb = areaContainer?.querySelector<HTMLElement>('[data-role="thumb"]');
  const hueContainer = root.querySelector<HTMLElement>('[data-part="hue"]');
  const hueCanvas = hueContainer?.querySelector<HTMLCanvasElement>('canvas');
  const hueThumb = hueContainer?.querySelector<HTMLElement>('[data-role="thumb"]');
  const inputL = root.querySelector<HTMLInputElement>('[data-channel="l"]');
  const inputC = root.querySelector<HTMLInputElement>('[data-channel="c"]');
  const inputH = root.querySelector<HTMLInputElement>('[data-channel="h"]');
  const previewEl = root.querySelector<HTMLElement>('[data-part="preview"]');
  const gamutLabelEl = root.querySelector<HTMLElement>('[data-part="gamut-label"]');

  if (
    !areaContainer ||
    !areaCanvas ||
    !areaThumb ||
    !hueContainer ||
    !hueCanvas ||
    !hueThumb ||
    !inputL ||
    !inputC ||
    !inputH ||
    !previewEl
  ) {
    return () => {};
  }

  const config = readConfigFromRoot(root);
  const { memory, dispatch } = createBehavior(colorPickerBehavior, config);

  const ids = {} as PartIds<ColorPickerPart>;
  for (const part of Object.keys(colorPickerBehavior.parts) as ColorPickerPart[]) {
    const el = part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
    ids[part] = el?.id ?? '';
  }

  const applyProjection = (el: HTMLElement | null, attrs: AriaAttrs | undefined) => {
    if (!el || !attrs) return;
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const elems = {
    areaCanvas,
    areaThumb,
    hueCanvas,
    hueThumb,
    inputs: { l: inputL, c: inputC, h: inputH },
    preview: previewEl,
    gamutLabelEl,
  };

  const stopInteractions = composeColorPickerInteractions({
    ...elems,
    areaContainer,
    hueContainer,
    getConfig: () => config,
    getColor: () => effectiveColor(memory.get(), config),
    request: (color) => {
      dispatch('setColor', config, { color });
      root.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    },
    commit: (color) => {
      dispatch('setColor', config, { color });
      root.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    },
  });

  const unsubscribe = memory.subscribe((state) => {
    const color = effectiveColor(state, config);
    const projection = colorPickerBehavior.aria(state, config, ids);
    applyProjection(hueContainer, projection.hue);
    applyProjection(previewEl, projection.preview);
    paintColorPicker(color, config, elems);
  });

  return () => {
    unsubscribe();
    stopInteractions();
  };
}
