/**
 * Color Area primitive
 * Renders a 2D canvas showing Lightness (x-axis) vs Chroma (y-axis)
 * at a fixed hue. Each pixel is painted with its actual OKLCH color
 * if within sRGB or Display P3 gamut, or black if outside both.
 *
 * Framework-agnostic, SSR-safe. The caller provides the canvas element;
 * the primitive handles rendering and ARIA attributes.
 */

import { findMaxChroma } from './oklch-gamut';
import type { CleanupFunction } from './types';

export interface ColorAreaOptions {
  /** Fixed hue angle (0-360) for this area slice */
  hue: number;

  /**
   * Maximum chroma value for the y-axis scale.
   * @default 0.4
   */
  maxChroma?: number;

  /** Device pixel ratio override (default: window.devicePixelRatio) */
  dpr?: number;
}

/**
 * Render the Lightness x Chroma surface onto a canvas.
 * Gracefully handles getContext('2d') returning null (e.g. happy-dom).
 * SSR is guarded at the public API boundary (createColorArea/updateColorArea).
 */
function renderArea(canvas: HTMLCanvasElement, options: ColorAreaOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const { hue } = options;
  const maxChroma = options.maxChroma ?? 0.4;
  const dpr = options.dpr ?? window.devicePixelRatio;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const width = Math.round(cssWidth * dpr);
  const height = Math.round(cssHeight * dpr);

  canvas.width = width;
  canvas.height = height;

  // Render at CSS-pixel resolution for ~4x perf on retina displays
  const scaleX = cssWidth > 0 ? width / cssWidth : 1;
  const scaleY = cssHeight > 0 ? height / cssHeight : 1;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

  const maxX = cssWidth > 1 ? cssWidth - 1 : 1;
  const maxY = cssHeight > 1 ? cssHeight - 1 : 1;

  // Precompute gamut boundary per lightness column
  const maxCPerCol = new Float32Array(cssWidth);
  for (let x = 0; x < cssWidth; x++) {
    const l = x / maxX;
    maxCPerCol[x] = findMaxChroma(l, hue, maxChroma);
  }

  const FADE = 16;

  for (let x = 0; x < cssWidth; x++) {
    const l = x / maxX;
    if (l < 0.01 || l > 0.99) continue;

    const mc = maxCPerCol[x] as number;

    for (let y = 0; y < cssHeight; y++) {
      const c = (1 - y / maxY) * maxChroma;

      if (c <= mc) {
        const distC = mc - c;
        const distPx = (distC / maxChroma) * cssHeight;
        const tC = distPx >= FADE ? 1 : distPx / FADE;
        ctx.globalAlpha = tC * tC; // quadratic falloff
        ctx.fillStyle = `oklch(${l} ${c} ${hue})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Build the ARIA label for a color area at a given hue.
 */
function toAriaLabel(hue: number): string {
  return `Color area for hue ${hue} degrees`;
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
 * Create a color area on a canvas element.
 * Sets ARIA attributes and renders the Lightness x Chroma surface.
 * Returns a cleanup function that restores original state.
 */
export function createColorArea(
  canvas: HTMLCanvasElement,
  options: ColorAreaOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const prevRole = canvas.getAttribute('role');
  const prevAriaLabel = canvas.getAttribute('aria-label');

  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', toAriaLabel(options.hue));

  renderArea(canvas, options);

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
 * Update an existing color area without teardown/rebuild.
 * Updates ARIA label and re-renders the surface.
 */
export function updateColorArea(canvas: HTMLCanvasElement, options: ColorAreaOptions): void {
  if (typeof window === 'undefined') {
    return;
  }

  canvas.setAttribute('aria-label', toAriaLabel(options.hue));
  renderArea(canvas, options);
}
