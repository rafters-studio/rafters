/**
 * OKLCH gamut awareness utilities
 *
 * Three-tier gamut model based on real-world display support:
 * - srgb: in sRGB (safe on every screen, also in P3 by inclusion)
 * - p3:   in Display P3 but NOT sRGB (modern wide-gamut displays only)
 * - out:  outside both gamuts (not displayable anywhere)
 */

import type { OKLCH } from '@rafters/shared';
import Color from 'colorjs.io';
import { z } from 'zod';
import { roundOKLCH } from './conversion.js';
import { MAX_CHROMA } from './internal/math.js';

export const GamutTierSchema = z.enum(['srgb', 'p3', 'out']);
export type GamutTier = z.infer<typeof GamutTierSchema>;

export const GamutBoundaryPointSchema = z.object({
  l: z.number(),
  /** Maximum chroma within sRGB gamut */
  maxC_srgb: z.number(),
  /** Maximum chroma within P3 gamut */
  maxC_p3: z.number(),
});
export type GamutBoundaryPoint = z.infer<typeof GamutBoundaryPointSchema>;

/** Check whether an OKLCH color is within the sRGB gamut. */
export function isInSRGBGamut(oklch: OKLCH): boolean {
  const color = new Color('oklch', [oklch.l, oklch.c, oklch.h]);
  return color.inGamut('srgb');
}

/** Check whether an OKLCH color is within the Display P3 gamut. */
export function isInP3Gamut(oklch: OKLCH): boolean {
  const color = new Color('oklch', [oklch.l, oklch.c, oklch.h]);
  return color.inGamut('p3');
}

/** Classify an OKLCH color by the gamut it fits in. */
export function getGamutTier(oklch: OKLCH): GamutTier {
  if (isInSRGBGamut(oklch)) return 'srgb';
  if (isInP3Gamut(oklch)) return 'p3';
  return 'out';
}

/**
 * Snap an OKLCH color to the nearest in-gamut color.
 * Returns the snapped color and its tier.
 */
export function toNearestGamut(oklch: OKLCH): { color: OKLCH; tier: GamutTier } {
  const color = new Color('oklch', [oklch.l, oklch.c, oklch.h]);

  if (color.inGamut('srgb')) {
    return { color: { ...oklch }, tier: 'srgb' };
  }

  const srgbMapped = color.toGamut({ space: 'srgb' });
  const mappedOklch = srgbMapped.to('oklch');
  return {
    color: {
      l: mappedOklch.coords[0] ?? 0,
      c: mappedOklch.coords[1] ?? 0,
      h: mappedOklch.coords[2] ?? oklch.h,
      alpha: oklch.alpha,
    },
    tier: 'srgb',
  };
}

/**
 * Snap an OKLCH into sRGB and round it -- the shape every generated color is
 * emitted in. Lives here because both halves are gamut/conversion concerns;
 * harmony.ts and semantic.ts are callers, not owners.
 */
export function clampColor(color: OKLCH): OKLCH {
  return roundOKLCH(toNearestGamut(color).color);
}

const DEFAULT_STEPS = 101;
const TOLERANCE = 0.001;

function findMaxChroma(l: number, h: number, gamutSpace: string): number {
  let lo = 0;
  let hi = MAX_CHROMA;
  if (l <= 0 || l >= 1) return 0;
  const maxColor = new Color('oklch', [l, hi, h]);
  if (maxColor.inGamut(gamutSpace)) return hi;
  while (hi - lo > TOLERANCE) {
    const mid = (lo + hi) / 2;
    const color = new Color('oklch', [l, mid, h]);
    if (color.inGamut(gamutSpace)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Compute both sRGB and P3 gamut boundaries for a given hue.
 * The two boundary curves define three zones:
 *   0 .. maxC_srgb            -> srgb
 *   maxC_srgb .. maxC_p3      -> p3
 *   beyond maxC_p3            -> out
 */
export function computeGamutBoundaries(hue: number, steps = DEFAULT_STEPS): GamutBoundaryPoint[] {
  const boundaries: GamutBoundaryPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const l = i / (steps - 1);
    const maxC_srgb = findMaxChroma(l, hue, 'srgb');
    const maxC_p3 = findMaxChroma(l, hue, 'p3');
    boundaries.push({ l, maxC_srgb, maxC_p3 });
  }
  return boundaries;
}
