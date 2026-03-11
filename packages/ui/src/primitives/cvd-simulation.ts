/**
 * CVD Simulation primitive
 * Renders parallel scale strips showing how a color family appears
 * under each color vision deficiency (deuteranopia, protanopia, tritanopia).
 *
 * Framework-agnostic, SSR-safe. The caller provides the original scale,
 * CVD simulation data for the base color, and the base color itself.
 * The primitive computes shifted scales for each deficiency by applying
 * the hue/chroma delta from the base CVD simulation to each scale position,
 * preserving original lightness.
 *
 * @example
 * ```typescript
 * const cleanup = createCvdSimulation(container, {
 *   scale: colorValue.scale,
 *   name: 'ocean-blue',
 *   baseColor: { l: 0.53, c: 0.145, h: 240 },
 *   cvd: {
 *     deuteranopia: { l: 0.53, c: 0.08, h: 260 },
 *     protanopia: { l: 0.53, c: 0.06, h: 270 },
 *     tritanopia: { l: 0.53, c: 0.12, h: 200 },
 *   },
 *   showOriginal: true,
 * });
 *
 * // teardown
 * cleanup();
 * ```
 */

import type { CleanupFunction, OklchColor } from './types';

export type CvdType = 'deuteranopia' | 'protanopia' | 'tritanopia';

export interface CvdSimulationOptions {
  /** Array of 11 OKLCH values mapping to scale positions 50-950 */
  scale: OklchColor[];
  /** Color family name for ARIA labels */
  name: string;
  /** CVD simulation of the base color under each deficiency */
  cvd: Record<CvdType, OklchColor>;
  /** The original base color (typically scale[5]) for computing hue/chroma shifts */
  baseColor: OklchColor;
  /** When true, renders the original scale strip alongside for visual comparison */
  showOriginal?: boolean;
}

const CVD_TYPES: CvdType[] = ['deuteranopia', 'protanopia', 'tritanopia'];

const CVD_DESCRIPTIONS: Record<CvdType, string> = {
  deuteranopia: 'red-green color blindness',
  protanopia: 'red-green color blindness',
  tritanopia: 'blue-yellow color blindness',
};

/**
 * Build an oklch() CSS string from an OklchColor
 */
function toOklchString(v: OklchColor): string {
  return `oklch(${v.l} ${v.c} ${v.h})`;
}

/**
 * Compute the simulated scale for a given CVD type.
 * Applies the hue and chroma shift from the base CVD simulation
 * to each scale position, preserving original lightness.
 */
function simulateScale(
  originalScale: OklchColor[],
  baseColor: OklchColor,
  cvdColor: OklchColor,
): OklchColor[] {
  const hueDelta = cvdColor.h - baseColor.h;
  const chromaRatio = baseColor.c === 0 ? 0 : cvdColor.c / baseColor.c;

  return originalScale.map((original) => ({
    l: original.l,
    c: Math.max(0, original.c * chromaRatio),
    h: (((original.h + hueDelta) % 360) + 360) % 360,
  }));
}

/**
 * Create a single strip container with swatch divs
 */
function createStrip(
  parent: HTMLElement,
  cvdType: string,
  ariaLabel: string,
  swatchColors: OklchColor[],
): HTMLElement {
  const strip = document.createElement('div');
  strip.setAttribute('data-cvd-type', cvdType);
  strip.setAttribute('role', 'img');
  strip.setAttribute('aria-label', ariaLabel);

  for (const color of swatchColors) {
    const swatch = document.createElement('div');
    swatch.setAttribute('data-swatch', '');
    const colorStr = toOklchString(color);
    swatch.style.backgroundColor = colorStr;
    swatch.setAttribute('data-color', colorStr);
    strip.appendChild(swatch);
  }

  parent.appendChild(strip);
  return strip;
}

/**
 * Create CVD simulation strips inside a container element.
 * Returns a cleanup function that removes all created elements.
 */
export function createCvdSimulation(
  container: HTMLElement,
  options: CvdSimulationOptions,
): CleanupFunction {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const { scale, name, cvd, baseColor, showOriginal } = options;
  const strips: HTMLElement[] = [];

  if (showOriginal) {
    const strip = createStrip(container, 'original', `${name} original color scale`, scale);
    strips.push(strip);
  }

  for (const cvdType of CVD_TYPES) {
    const cvdColor = cvd[cvdType];
    const simulatedScale = simulateScale(scale, baseColor, cvdColor);
    const description = CVD_DESCRIPTIONS[cvdType];
    const ariaLabel = `${name} scale as seen with ${cvdType} (${description})`;

    const strip = createStrip(container, cvdType, ariaLabel, simulatedScale);
    strips.push(strip);
  }

  return () => {
    for (const strip of strips) {
      strip.remove();
    }
  };
}
