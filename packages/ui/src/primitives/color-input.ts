/**
 * Color Input primitive
 * Manages numeric input fields for direct OKLCH value entry.
 * Validates, clamps, and formats values per channel constraints.
 *
 * Framework-agnostic, SSR-safe. The caller provides input elements
 * mapped to OKLCH channels as the first positional argument (consistent
 * with the element-first pattern used by createInteractive, createColorArea,
 * and createHueBar). The primitive sets attributes, attaches event
 * listeners, and handles value formatting.
 *
 * onChange fires during live editing (input events, arrow keys).
 * onCommit fires when the user confirms a value (blur, Enter) and
 * reformats the display value to canonical precision.
 *
 * @example
 * ```typescript
 * const cleanup = createColorInput(fields, {
 *   value: { l: 0.7, c: 0.15, h: 250 },
 *   onChange: (color) => console.log(color),
 * });
 *
 * // update from external source (no onChange fired)
 * updateColorInput(fields, {
 *   value: { l: 0.5, c: 0.1, h: 180 },
 *   onChange,
 * });
 *
 * // teardown
 * cleanup();
 * ```
 *
 * @primitives types
 */

import type { CleanupFunction, OklchColorAlpha } from './types';

type Channel = 'l' | 'c' | 'h' | 'alpha';

export interface ColorInputField {
  element: HTMLInputElement;
  channel: Channel;
}

export interface ColorInputOptions {
  value: OklchColorAlpha;
  onChange: (color: OklchColorAlpha) => void;
  onCommit?: (color: OklchColorAlpha) => void;
  precision?: Partial<Record<Channel, number>>;
}

interface ChannelConfig {
  min: number;
  max: number;
  step: number;
  precision: number;
  label: string;
}

const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  l: { min: 0, max: 1, step: 0.01, precision: 2, label: 'Lightness' },
  c: { min: 0, max: 0.4, step: 0.001, precision: 3, label: 'Chroma' },
  h: { min: 0, max: 360, step: 1, precision: 0, label: 'Hue' },
  alpha: { min: 0, max: 1, step: 0.01, precision: 2, label: 'Alpha' },
};

const MANAGED_ATTRIBUTES = ['inputmode', 'min', 'max', 'step', 'aria-label'] as const;

/** Digits, single decimal point, optional leading minus -- rejects "1abc", "1e2", etc. */
const NUMERIC_RE = /^-?\d*\.?\d*$/;

function isNumericInput(str: string): boolean {
  return NUMERIC_RE.test(str);
}

// Registry maps every managed input element to shared state, so updateColorInput
// can look up state from any field element regardless of array ordering.
const colorInputRegistry = new WeakMap<HTMLInputElement, { currentColor: OklchColorAlpha }>();

function getPrecision(channel: Channel, options: ColorInputOptions): number {
  return options.precision?.[channel] ?? CHANNEL_CONFIG[channel].precision;
}

function getChannelValue(color: OklchColorAlpha, channel: Channel): number {
  if (channel === 'alpha') {
    return color.alpha ?? 1;
  }
  return color[channel];
}

function clamp(value: number, channel: Channel): number {
  const config = CHANNEL_CONFIG[channel];
  return Math.min(config.max, Math.max(config.min, value));
}

/**
 * Build an updated color with one channel changed.
 * Preserves alpha only if explicitly present on the source color.
 */
function buildColor(current: OklchColorAlpha, channel: Channel, value: number): OklchColorAlpha {
  const color: OklchColorAlpha = { l: current.l, c: current.c, h: current.h };
  if (current.alpha !== undefined) {
    color.alpha = current.alpha;
  }
  if (channel === 'alpha') {
    color.alpha = value;
  } else {
    color[channel] = value;
  }
  return color;
}

/**
 * Restore an attribute to its previous value, or remove it if it was absent.
 */
function restoreAttribute(element: HTMLElement, name: string, previous: string | null): void {
  if (previous === null) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, previous);
  }
}

function applyFieldAttributes(element: HTMLInputElement, channel: Channel): void {
  const config = CHANNEL_CONFIG[channel];
  element.setAttribute('inputmode', 'decimal');
  element.setAttribute('min', String(config.min));
  element.setAttribute('max', String(config.max));
  element.setAttribute('step', String(config.step));
  element.setAttribute('aria-label', config.label);
}

function setFieldValue(
  element: HTMLInputElement,
  channel: Channel,
  color: OklchColorAlpha,
  options: ColorInputOptions,
): void {
  const raw = getChannelValue(color, channel);
  const precision = getPrecision(channel, options);
  element.value = raw.toFixed(precision);
}

/**
 * Create color input behavior on a set of input fields.
 * Returns a cleanup function that removes listeners and restores original attributes.
 */
export function createColorInput(
  fields: ColorInputField[],
  options: ColorInputOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const state = { currentColor: { ...options.value } };
  for (const { element } of fields) {
    colorInputRegistry.set(element, state);
  }
  const cleanups: CleanupFunction[] = [];

  for (const { element, channel } of fields) {
    const config = CHANNEL_CONFIG[channel];

    const savedAttributes = new Map<string, string | null>();
    for (const attr of MANAGED_ATTRIBUTES) {
      savedAttributes.set(attr, element.getAttribute(attr));
    }
    const savedValue = element.value;

    applyFieldAttributes(element, channel);
    setFieldValue(element, channel, options.value, options);
    let lastValidValue = element.value;

    const onInput = () => {
      if (!isNumericInput(element.value)) return;
      const parsed = Number.parseFloat(element.value);
      if (Number.isNaN(parsed)) return;
      const clamped = clamp(parsed, channel);
      state.currentColor = buildColor(state.currentColor, channel, clamped);
      lastValidValue = element.value;
      options.onChange(state.currentColor);
    };

    const onCommit = () => {
      if (!isNumericInput(element.value)) {
        element.value = lastValidValue;
        return;
      }
      const parsed = Number.parseFloat(element.value);
      if (Number.isNaN(parsed)) {
        element.value = lastValidValue;
        return;
      }
      const clamped = clamp(parsed, channel);
      const formatted = clamped.toFixed(getPrecision(channel, options));
      element.value = formatted;
      lastValidValue = formatted;
      state.currentColor = buildColor(state.currentColor, channel, clamped);
      options.onCommit?.(state.currentColor);
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        onCommit();
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const multiplier = event.shiftKey ? 10 : 1; // Shift = 10x step for coarse adjustment
        const delta = config.step * multiplier * (event.key === 'ArrowUp' ? 1 : -1);
        const current = Number.parseFloat(element.value) || 0;
        const newValue = clamp(current + delta, channel);
        const formatted = newValue.toFixed(getPrecision(channel, options));
        element.value = formatted;
        lastValidValue = formatted;
        state.currentColor = buildColor(state.currentColor, channel, newValue);
        options.onChange(state.currentColor);
      }
    };

    element.addEventListener('input', onInput);
    element.addEventListener('blur', onCommit);
    element.addEventListener('keydown', onKeydown);

    cleanups.push(() => {
      element.removeEventListener('input', onInput);
      element.removeEventListener('blur', onCommit);
      element.removeEventListener('keydown', onKeydown);

      for (const [attr, prev] of savedAttributes) {
        restoreAttribute(element, attr, prev);
      }
      element.value = savedValue;
    });
  }

  return () => {
    for (const fn of cleanups) {
      fn();
    }
    for (const { element } of fields) {
      colorInputRegistry.delete(element);
    }
  };
}

/**
 * Update displayed values without firing onChange.
 * Useful for external color changes (e.g. from a slider or swatch).
 */
export function updateColorInput(fields: ColorInputField[], options: ColorInputOptions): void {
  if (typeof window === 'undefined') {
    return;
  }

  let entry: { currentColor: OklchColorAlpha } | undefined;
  for (const { element } of fields) {
    entry = colorInputRegistry.get(element);
    if (entry) break;
  }
  if (entry) {
    entry.currentColor = { ...options.value };
  }

  for (const { element, channel } of fields) {
    setFieldValue(element, channel, options.value, options);
  }
}
