/**
 * Hue Bar primitive
 * Renders a 1D gradient strip showing the 0-360 hue spectrum
 * at a given lightness and chroma. Hues within sRGB or Display P3
 * are painted with their OKLCH color; hues outside both are painted black.
 *
 * Framework-agnostic, SSR-safe. The caller provides the canvas element;
 * the primitive handles rendering and ARIA attributes.
 */

import { findMaxChroma, hueFromBarPos, inP3, inSrgb } from './oklch-gamut';
import type { CleanupFunction } from './types';

export interface HueBarOptions {
  /** Lightness at which to render the hue spectrum (0-1) */
  lightness: number;

  /** Chroma at which to render the hue spectrum (0-~0.4) */
  chroma: number;

  /**
   * Orientation of the strip.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';

  /** Device pixel ratio override (default: window.devicePixelRatio) */
  dpr?: number;

  /**
   * When true, render each hue at its peak-chroma lightness
   * with perceptual sine warp and box blur smoothing.
   * Ignores `lightness` and `chroma` options.
   * @default false
   */
  vivid?: boolean;
}

/** Maximum chroma ceiling for peak-chroma probing */
const MAX_C = 0.4;

/**
 * Render vivid peak-chroma hue bar with perceptual warp and box blur smoothing.
 * Each column is painted at the lightness that maximizes displayable chroma.
 */
function renderVivid(
  ctx: CanvasRenderingContext2D,
  steps: number,
  maxIndex: number,
  isHorizontal: boolean,
  cssWidth: number,
  cssHeight: number,
): void {
  const rawL = new Float32Array(steps);
  const rawC = new Float32Array(steps);

  for (let i = 0; i < steps; i++) {
    const hue = hueFromBarPos(i / maxIndex);
    let bestL = 0.5;
    let bestC = 0;
    for (let probe = 0.2; probe <= 0.85; probe += 0.01) {
      const probeC = findMaxChroma(probe, hue, MAX_C);
      if (probeC > bestC) {
        bestC = probeC;
        bestL = probe;
      }
    }
    rawL[i] = bestL;
    rawC[i] = bestC;
  }

  const blur = Math.max(3, Math.round(steps / 80));
  const sL = new Float32Array(steps);
  const sC = new Float32Array(steps);

  for (let i = 0; i < steps; i++) {
    let sumL = 0;
    let sumC = 0;
    let cnt = 0;
    for (let k = i - blur; k <= i + blur; k++) {
      const ki = ((k % steps) + steps) % steps;
      sumL += rawL[ki] ?? 0;
      sumC += rawC[ki] ?? 0;
      cnt++;
    }
    sL[i] = sumL / cnt;
    sC[i] = sumC / cnt;
  }

  for (let i = 0; i < steps; i++) {
    const hue = hueFromBarPos(i / maxIndex);
    ctx.fillStyle = `oklch(${sL[i] ?? 0} ${sC[i] ?? 0} ${hue})`;
    if (isHorizontal) {
      ctx.fillRect(i, 0, 1, cssHeight);
    } else {
      ctx.fillRect(0, i, cssWidth, 1);
    }
  }
}

/**
 * Render the hue spectrum onto a canvas.
 * Gracefully handles getContext('2d') returning null (e.g. happy-dom).
 * SSR is guarded at the public API boundary (createHueBar/updateHueBar).
 */
function renderHueBar(canvas: HTMLCanvasElement, options: HueBarOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const orientation = options.orientation ?? 'horizontal';
  const dpr = options.dpr ?? window.devicePixelRatio;

  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;

  const backingWidth = Math.round(cssWidth * dpr);
  const backingHeight = Math.round(cssHeight * dpr);

  canvas.width = backingWidth;
  canvas.height = backingHeight;

  // Scale so drawing uses CSS pixels; derive from rounded backing size for accuracy
  const scaleX = cssWidth > 0 ? backingWidth / cssWidth : 1;
  const scaleY = cssHeight > 0 ? backingHeight / cssHeight : 1;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  const { lightness, chroma } = options;
  const isHorizontal = orientation === 'horizontal';
  const steps = isHorizontal ? cssWidth : cssHeight;
  const maxIndex = steps > 1 ? steps - 1 : 1;

  if (options.vivid) {
    renderVivid(ctx, steps, maxIndex, isHorizontal, cssWidth, cssHeight);
    return;
  }

  for (let i = 0; i < steps; i++) {
    const h = (i / maxIndex) * 360;
    if (inSrgb(lightness, chroma, h) || inP3(lightness, chroma, h)) {
      ctx.fillStyle = `oklch(${lightness} ${chroma} ${h})`;
    } else {
      ctx.fillStyle = '#000';
    }
    if (isHorizontal) {
      ctx.fillRect(i, 0, 1, cssHeight);
    } else {
      ctx.fillRect(0, i, cssWidth, 1);
    }
  }
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

/**
 * Apply hue bar rendering and ARIA attributes to a canvas element.
 * Returns a cleanup function that restores original state.
 */
export function createHueBar(canvas: HTMLCanvasElement, options: HueBarOptions): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const prevRole = canvas.getAttribute('role');
  const prevAriaLabel = canvas.getAttribute('aria-label');

  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Hue spectrum');

  renderHueBar(canvas, options);

  return () => {
    restoreAttribute(canvas, 'role', prevRole);
    restoreAttribute(canvas, 'aria-label', prevAriaLabel);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
}

/**
 * Update an existing hue bar without teardown/rebuild.
 * Re-renders the canvas with new options. ARIA label stays the same.
 */
export function updateHueBar(canvas: HTMLCanvasElement, options: HueBarOptions): void {
  if (typeof window === 'undefined') {
    return;
  }
  renderHueBar(canvas, options);
}
