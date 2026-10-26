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
 * Whether Display P3 steps are allowed in a family. Current choice (Sean,
 * 2026-10-17; revisable): one constant, off by default, so every family is
 * built in sRGB until a setting exists to turn it on.
 */
export const ALLOW_P3 = false;

/** The gamut a family is built inside: the space every one of its steps fits in. */
export type GamutCeiling = 'srgb' | 'p3';

function inCeiling(oklch: OKLCH, ceiling: GamutCeiling): boolean {
  return new Color('oklch', [oklch.l, oklch.c, oklch.h]).inGamut(ceiling);
}

/**
 * Map one colour into a gamut ceiling: unchanged when already inside, else
 * the same lightness and hue at the largest chroma the ceiling holds there.
 */
export function toGamutCeiling(oklch: OKLCH, ceiling: GamutCeiling): OKLCH {
  if (inCeiling(oklch, ceiling)) return { ...oklch };
  return { ...oklch, c: Math.min(oklch.c, findMaxChroma(oklch.l, oklch.h, ceiling)) };
}

/**
 * Round a colour the way stored steps are rounded, then take chroma off in
 * 0.001 steps until the rounded colour is inside the ceiling. Rounding hue to
 * a whole degree and chroma to three places can carry a boundary colour back
 * out; this keeps what is stored inside.
 */
function roundInside(oklch: OKLCH, ceiling: GamutCeiling): OKLCH {
  const rounded = roundOKLCH(oklch);
  let c = rounded.c;
  while (c > 0 && !inCeiling({ ...rounded, c }, ceiling)) {
    c = Math.round((c - 0.001) * 1000) / 1000;
  }
  return { ...rounded, c: Math.max(0, c) };
}

/**
 * Map every step of a scale into the ceiling, keeping lightness and hue.
 *
 * A step already inside the ceiling is not moved. A step outside keeps its
 * lightness and hue and loses chroma only, to the ceiling's edge, so the
 * scale's lightness order is the input's.
 */
export function mapScaleToGamut(scale: readonly OKLCH[], ceiling: GamutCeiling): OKLCH[] {
  return scale.map((step) =>
    inCeiling(step, ceiling) ? { ...step } : roundInside(toGamutCeiling(step, ceiling), ceiling),
  );
}

/**
 * The ceiling a family is built inside, set by its seed: 'p3' only when the
 * seed is a Display P3 colour and ALLOW_P3 is on; otherwise 'srgb'.
 */
export function ceilingForSeed(seed: OKLCH): GamutCeiling {
  return ALLOW_P3 && getGamutTier(seed) === 'p3' ? 'p3' : 'srgb';
}

/**
 * The tier of a step mapScaleToGamut returned. Every such step is inside its
 * ceiling, which is at most Display P3, so a step outside sRGB is a P3 step.
 */
export function storedTier(oklch: OKLCH): GamutCeiling {
  return isInSRGBGamut(oklch) ? 'srgb' : 'p3';
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

/**
 * Largest chroma at this lightness and hue that colorjs.io still calls in
 * gamut, by bisection over `inGamut`.
 *
 * The bisection stays rather than deferring to `toGamut`, whose 0.5.2 options
 * do include a coordinate-reduction method (`{ method: 'oklch.c' }`) that
 * looks like it would answer this directly. It does not: `toGamut` returns a
 * color CLIPPED into the target space, and clipping moves lightness too, so
 * reading chroma back off the result overshoots the boundary AT THIS
 * LIGHTNESS -- 0.0284 against the true 0.0094 at h=160, l=0.04, and 0.0337
 * against 0.0227 at h=145, l=0.05. `inGamut` is the predicate this function
 * actually needs, and bisecting it is the only way to ask where it flips.
 */
export function findMaxChroma(l: number, h: number, gamutSpace: string): number {
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
