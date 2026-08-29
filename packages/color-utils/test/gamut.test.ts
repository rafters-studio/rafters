/**
 * Tests for OKLCH gamut awareness utilities
 */

import type { OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  computeGamutBoundaries,
  type GamutTier,
  getGamutTier,
  isInP3Gamut,
  isInSRGBGamut,
  toNearestGamut,
} from '../src/gamut.js';

// Tolerance constant used in boundary computation
const TOLERANCE = 0.001;

// Reference colors
const midGray: OKLCH = { l: 0.5, c: 0, h: 0, alpha: 1 };
const srgbBlue: OKLCH = { l: 0.5, c: 0.1, h: 260, alpha: 1 };
// P3-only: chroma beyond sRGB but within P3 (green hue has wide P3 extension)
const p3Green: OKLCH = { l: 0.7, c: 0.25, h: 150, alpha: 1 };
const extremeColor: OKLCH = { l: 0.5, c: 0.4, h: 150, alpha: 1 };
const black: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };
const white: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };

describe('isInSRGBGamut', () => {
  it('returns true for achromatic colors', () => {
    expect(isInSRGBGamut(midGray)).toBe(true);
    expect(isInSRGBGamut(black)).toBe(true);
    expect(isInSRGBGamut(white)).toBe(true);
  });

  it('returns true for a known sRGB color', () => {
    expect(isInSRGBGamut(srgbBlue)).toBe(true);
  });

  it('returns false for a P3-only color', () => {
    expect(isInSRGBGamut(p3Green)).toBe(false);
  });
});

describe('isInP3Gamut', () => {
  it('returns true for sRGB colors (P3 is a superset)', () => {
    expect(isInP3Gamut(midGray)).toBe(true);
    expect(isInP3Gamut(srgbBlue)).toBe(true);
  });

  it('returns true for P3-only colors', () => {
    expect(isInP3Gamut(p3Green)).toBe(true);
  });

  it('returns false for extreme chroma values', () => {
    expect(isInP3Gamut(extremeColor)).toBe(false);
  });
});

describe('getGamutTier', () => {
  it('classifies sRGB colors as gold', () => {
    expect(getGamutTier(midGray)).toBe('srgb');
    expect(getGamutTier(srgbBlue)).toBe('srgb');
  });

  it('classifies P3-only colors as silver', () => {
    expect(getGamutTier(p3Green)).toBe('p3');
  });

  it('classifies out-of-gamut colors as fail', () => {
    expect(getGamutTier(extremeColor)).toBe('out');
  });
});

describe('toNearestGamut', () => {
  it('returns the same color for in-gamut sRGB colors', () => {
    const result = toNearestGamut(srgbBlue);
    expect(result.tier).toBe('srgb');
    expect(result.color.l).toBe(srgbBlue.l);
    expect(result.color.c).toBe(srgbBlue.c);
    expect(result.color.h).toBe(srgbBlue.h);
  });

  it('snaps out-of-gamut colors to gold tier', () => {
    const result = toNearestGamut(p3Green);
    expect(result.tier).toBe('srgb');
    expect(isInSRGBGamut(result.color)).toBe(true);
  });

  it('preserves hue approximately when snapping', () => {
    const result = toNearestGamut(p3Green);
    // Gamut mapping may shift hue slightly; allow 10 degrees tolerance
    const hueDiff = Math.abs(result.color.h - p3Green.h);
    expect(hueDiff).toBeLessThan(10);
  });

  it('reduces chroma minimally', () => {
    const result = toNearestGamut(p3Green);
    // Snapped chroma should be less than original but still substantial
    expect(result.color.c).toBeLessThan(p3Green.c);
    expect(result.color.c).toBeGreaterThan(0);
  });

  it('preserves alpha', () => {
    const withAlpha: OKLCH = { ...p3Green, alpha: 0.5 };
    const result = toNearestGamut(withAlpha);
    expect(result.color.alpha).toBe(0.5);
  });
});

describe('computeGamutBoundaries', () => {
  it('returns the requested number of steps', () => {
    const boundaries = computeGamutBoundaries(260, 21);
    expect(boundaries).toHaveLength(21);
  });

  it('covers lightness range from 0 to 1', () => {
    const boundaries = computeGamutBoundaries(260, 11);
    expect(boundaries[0].l).toBeCloseTo(0, 5);
    expect(boundaries[boundaries.length - 1].l).toBeCloseTo(1, 5);
  });

  it('has zero chroma at L=0 and L=1', () => {
    const boundaries = computeGamutBoundaries(260, 11);
    expect(boundaries[0].maxC_srgb).toBe(0);
    expect(boundaries[0].maxC_p3).toBe(0);
    expect(boundaries[boundaries.length - 1].maxC_srgb).toBe(0);
    expect(boundaries[boundaries.length - 1].maxC_p3).toBe(0);
  });

  it('P3 boundary is always >= sRGB boundary', () => {
    const boundaries = computeGamutBoundaries(260, 21);
    for (const point of boundaries) {
      expect(point.maxC_p3).toBeGreaterThanOrEqual(point.maxC_srgb - TOLERANCE);
    }
  });

  it('boundaries narrow at lightness extremes', () => {
    const boundaries = computeGamutBoundaries(260, 101);
    // Mid-range should have higher chroma than near-black or near-white
    const mid = boundaries[50];
    const nearBlack = boundaries[5];
    const nearWhite = boundaries[95];

    expect(mid.maxC_srgb).toBeGreaterThan(nearBlack.maxC_srgb);
    expect(mid.maxC_srgb).toBeGreaterThan(nearWhite.maxC_srgb);
  });

  it('blue hue has higher max chroma than yellow', () => {
    const blueBounds = computeGamutBoundaries(260, 21);
    const yellowBounds = computeGamutBoundaries(90, 21);

    // Find peak sRGB chroma for each hue
    const blueMax = Math.max(...blueBounds.map((b) => b.maxC_srgb));
    const yellowMax = Math.max(...yellowBounds.map((b) => b.maxC_srgb));

    expect(blueMax).toBeGreaterThan(yellowMax);
  });

  it('produces a smooth curve (no sudden jumps)', () => {
    const boundaries = computeGamutBoundaries(260, 101);
    for (let i = 1; i < boundaries.length; i++) {
      const diff = Math.abs(boundaries[i].maxC_srgb - boundaries[i - 1].maxC_srgb);
      // Adjacent lightness steps should not differ by more than 0.05 chroma
      expect(diff).toBeLessThan(0.05);
    }
  });
});

/**
 * Regression pins for the numerics PR #2141 changed.
 *
 * #2141 deleted `packages/ui/src/primitives/oklch-gamut.ts`, which carried its
 * own OKLCH -> linear-RGB matrices behind a private `EPS = 0.001` tolerance,
 * and routed every caller onto this module's colorjs.io `inGamut`/`toGamut`
 * wrap. It claimed the two were "numerically equal" and shipped no test that
 * could tell them apart. They are not equal: over a 45,360-sample OKLCH grid
 * the two disagree on sRGB membership for 3.2% of samples and on the P3/out
 * split for 5.3%. Two independent causes:
 *
 *   1. `EPS = 0.001` was applied to LINEAR-RGB channels, where the whole cube
 *      is [0, 1]. Near black that tolerance is larger than the gamut itself,
 *      so the old code called plainly undisplayable colors in-gamut.
 *   2. The old P3 blue row (`-0.026073181, -0.703486028, +1.729559209`) was a
 *      copy of the sRGB blue row's shape rather than P3's, so the old P3
 *      boundary sat well inside the real one.
 *
 * Every number below is the colorjs.io answer and differs from what the
 * deleted implementation returned. The existing
 * `packages/ui/test/primitives/color-picker.test.ts` p3-tier pin for
 * `{ l: 0.7, c: 0.25, h: 150 }` passes against BOTH implementations and so
 * proves nothing about this change; these cases are chosen where they differ.
 */
describe('computeGamutBoundaries regression (post-#2141 colorjs.io wrap)', () => {
  // 101 steps -> l lands on exact hundredths, and each point's maxC_p3 is by
  // construction the same bisection over colorjs.io's `inGamut` that
  // findMaxChroma runs, so the boundary array is the public way to assert it.
  const h145 = computeGamutBoundaries(145);
  const at = (boundaries: typeof h145, l: number) =>
    boundaries.find((p) => Math.abs(p.l - l) < 0.005);

  it('h=145, l=0.85 sits at the colorjs.io boundary, not the hand-rolled one', () => {
    const point = at(h145, 0.85);
    // Old hand-rolled: maxC_srgb 0.2672 (coincidentally equal here), maxC_p3
    // 0.3047 -- the P3 blue-row bug cost ~0.058 of real chroma at this point.
    expect(point?.maxC_srgb).toBeCloseTo(0.2672, 3);
    expect(point?.maxC_p3).toBeCloseTo(0.3625, 3);
  });

  it('h=145, l=0.80 gives the maxC_p3 0.341 / maxC_srgb 0.252 pair', () => {
    // #2159 quotes this pair against l=0.85; it is measured at l=0.80. Both
    // lightnesses are pinned so the quoted figures stay covered either way.
    const point = at(h145, 0.8);
    expect(point?.maxC_srgb).toBeCloseTo(0.252, 2);
    expect(point?.maxC_p3).toBeCloseTo(0.341, 2);
  });

  it('dark case h=160, l=0.04 collapses to near-zero chroma', () => {
    // The near-black case the old EPS=0.001 linear-RGB tolerance got most
    // wrong: it put both boundaries above 0.26 here, an order of magnitude
    // past what either gamut actually holds at this lightness.
    const point = at(computeGamutBoundaries(160), 0.04);
    expect(point?.maxC_srgb).toBeCloseTo(0.0094, 3);
    expect(point?.maxC_p3).toBeCloseTo(0.0133, 3);
  });

  it('h=145, l=0.05 is not 8.5x too permissive', () => {
    // The old findMaxChroma also FUSED the two gamuts (`inSrgb || inP3`), so
    // its single answer here was 0.1937 -- 8.5x the real P3 boundary.
    const maxC_p3 = at(h145, 0.05)?.maxC_p3;
    expect(maxC_p3).not.toBeCloseTo(0.1937, 2);
    expect(maxC_p3).toBeCloseTo(0.0227, 2);
  });
});

/**
 * Tier classifications where the deleted hand-rolled implementation and the
 * colorjs.io wrap DISAGREE. The colorjs.io answer is asserted as correct.
 */
describe('getGamutTier regression (post-#2141 colorjs.io wrap)', () => {
  const disagreementFixtures: ReadonlyArray<readonly [OKLCH, GamutTier, string]> = [
    // EPS=0.001 on linear-RGB channels near black: the old code called this
    // 'srgb'. No display shows it -- it is outside P3 as well.
    [{ l: 0.03, c: 0.02, h: 40, alpha: 1 }, 'out', 'srgb'],
    // The same tolerance one tier up: the old code called this 'srgb' when it
    // is only reachable on a P3 display.
    [{ l: 0.15, c: 0.03, h: 200, alpha: 1 }, 'p3', 'srgb'],
    // The P3 blue-row copy-paste bug, in the other direction: the old code
    // called this 'out' when Display P3 holds it comfortably.
    [{ l: 0.68, c: 0.15, h: 90, alpha: 1 }, 'p3', 'out'],
  ];

  it.each(disagreementFixtures)(
    'classifies %o as %s (hand-rolled math said %s)',
    (oklch, expectedTier) => {
      expect(getGamutTier(oklch)).toBe(expectedTier);
    },
  );
});
