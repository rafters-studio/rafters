/**
 * Tests for generateHarmony() - pure OKLCH hue rotation
 *
 * Core invariants:
 * - L and C are never mutated BEFORE gamut clamping in hue-rotation harmonies
 * - Only H changes before the gamut clamp step
 * - All outputs are gamut-clamped (sRGB)
 * - Correct counts per harmony type
 */

import type { ColorHarmonies, OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { generateHarmony } from '../src/harmony.js';

/** Low-chroma blue: stays well within sRGB gamut across all hue rotations */
const blue: OKLCH = { l: 0.5, c: 0.05, h: 240, alpha: 1 };

/** High-chroma orange: stress-tests gamut clamping */
const orange: OKLCH = { l: 0.6, c: 0.25, h: 60, alpha: 1 };

/** Near-achromatic gray */
const gray: OKLCH = { l: 0.5, c: 0.005, h: 180, alpha: 1 };

/** Edge hue: 0 degrees */
const red: OKLCH = { l: 0.5, c: 0.05, h: 0, alpha: 1 };

/** Edge hue: 359 degrees */
const nearRed: OKLCH = { l: 0.5, c: 0.05, h: 359, alpha: 1 };

/** Tolerance for gamut-clamped values (low-chroma colors barely move) */
const GAMUT_TOLERANCE = 0.01;

describe('generateHarmony', () => {
  describe('return shape', () => {
    it('returns all required harmony keys', () => {
      const result = generateHarmony(blue);

      expect(result).toHaveProperty('complementary');
      expect(result).toHaveProperty('triadic');
      expect(result).toHaveProperty('analogous');
      expect(result).toHaveProperty('tetradic');
      expect(result).toHaveProperty('splitComplementary');
      expect(result).toHaveProperty('monochromatic');
    });

    it('complementary is a single OKLCH object', () => {
      const { complementary } = generateHarmony(blue);

      expect(complementary).toHaveProperty('l');
      expect(complementary).toHaveProperty('c');
      expect(complementary).toHaveProperty('h');
    });
  });

  describe('array counts', () => {
    it('triadic has 3 colors', () => {
      expect(generateHarmony(blue).triadic).toHaveLength(3);
    });

    it('analogous has 6 colors', () => {
      expect(generateHarmony(blue).analogous).toHaveLength(6);
    });

    it('tetradic has 4 colors', () => {
      expect(generateHarmony(blue).tetradic).toHaveLength(4);
    });

    it('splitComplementary has 3 colors', () => {
      expect(generateHarmony(blue).splitComplementary).toHaveLength(3);
    });

    it('monochromatic has 6 colors', () => {
      expect(generateHarmony(blue).monochromatic).toHaveLength(6);
    });
  });

  describe('pure hue rotation - L and C preserved for low-chroma input', () => {
    // Low-chroma colors stay well within sRGB across all hue rotations.
    // This verifies we do NOT artificially mutate L/C before gamut clamping.
    const result = generateHarmony(blue);

    it('complementary preserves L within gamut tolerance', () => {
      expect(result.complementary.l).toBeCloseTo(blue.l, 1);
    });

    it('complementary preserves C within gamut tolerance', () => {
      expect(result.complementary.c).toBeCloseTo(blue.c, 1);
    });

    it('triadic colors preserve L within gamut tolerance', () => {
      for (const color of result.triadic) {
        expect(color.l).toBeCloseTo(blue.l, 1);
      }
    });

    it('triadic colors preserve C within gamut tolerance', () => {
      for (const color of result.triadic) {
        expect(color.c).toBeCloseTo(blue.c, 1);
      }
    });

    it('analogous colors preserve L within gamut tolerance', () => {
      for (const color of result.analogous) {
        expect(color.l).toBeCloseTo(blue.l, 1);
      }
    });

    it('analogous colors preserve C within gamut tolerance', () => {
      for (const color of result.analogous) {
        expect(color.c).toBeCloseTo(blue.c, 1);
      }
    });

    it('tetradic colors preserve L within gamut tolerance', () => {
      for (const color of result.tetradic) {
        expect(color.l).toBeCloseTo(blue.l, 1);
      }
    });

    it('tetradic colors preserve C within gamut tolerance', () => {
      for (const color of result.tetradic) {
        expect(color.c).toBeCloseTo(blue.c, 1);
      }
    });

    it('splitComplementary colors preserve L within gamut tolerance', () => {
      for (const color of result.splitComplementary) {
        expect(color.l).toBeCloseTo(blue.l, 1);
      }
    });

    it('splitComplementary colors preserve C within gamut tolerance', () => {
      for (const color of result.splitComplementary) {
        expect(color.c).toBeCloseTo(blue.c, 1);
      }
    });
  });

  describe('hue rotation angles', () => {
    it('complementary is base +180', () => {
      const { complementary } = generateHarmony(blue);
      const expected = (blue.h + 180) % 360;
      expect(complementary.h).toBeCloseTo(expected, 0);
    });

    it('triadic[0] is base hue', () => {
      const { triadic } = generateHarmony(blue);
      expect(triadic[0]?.h).toBeCloseTo(blue.h, 0);
    });

    it('triadic[1] is base +120', () => {
      const { triadic } = generateHarmony(blue);
      const expected = (blue.h + 120) % 360;
      expect(triadic[1]?.h).toBeCloseTo(expected, 0);
    });

    it('triadic[2] is base +240', () => {
      const { triadic } = generateHarmony(blue);
      const expected = (blue.h + 240) % 360;
      expect(triadic[2]?.h).toBeCloseTo(expected, 0);
    });

    it('analogous hues are -45/-30/-15/+15/+30/+45', () => {
      const { analogous } = generateHarmony(blue);
      const offsets = [-45, -30, -15, 15, 30, 45];
      for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        if (offset === undefined) continue;
        const expected = (((blue.h + offset) % 360) + 360) % 360;
        expect(analogous[i]?.h).toBeCloseTo(expected, 0);
      }
    });

    it('tetradic[0] is base hue', () => {
      const { tetradic } = generateHarmony(blue);
      expect(tetradic[0]?.h).toBeCloseTo(blue.h, 0);
    });

    it('tetradic hues are base/+90/+180/+270', () => {
      const { tetradic } = generateHarmony(blue);
      const offsets = [0, 90, 180, 270];
      for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        if (offset === undefined) continue;
        const expected = (blue.h + offset) % 360;
        expect(tetradic[i]?.h).toBeCloseTo(expected, 0);
      }
    });

    it('splitComplementary[0] is base hue', () => {
      const { splitComplementary } = generateHarmony(blue);
      expect(splitComplementary[0]?.h).toBeCloseTo(blue.h, 0);
    });

    it('splitComplementary hues are base/+150/+210', () => {
      const { splitComplementary } = generateHarmony(blue);
      const offsets = [0, 150, 210];
      for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        if (offset === undefined) continue;
        const expected = (blue.h + offset) % 360;
        expect(splitComplementary[i]?.h).toBeCloseTo(expected, 0);
      }
    });
  });

  describe('monochromatic lightness steps', () => {
    const MONO_L = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

    it('monochromatic has correct lightness at each step', () => {
      const { monochromatic } = generateHarmony(blue);
      for (let i = 0; i < MONO_L.length; i++) {
        const expected = MONO_L[i];
        if (expected === undefined) continue;
        expect(monochromatic[i]?.l).toBeCloseTo(expected, 2);
      }
    });

    it('monochromatic preserves base hue', () => {
      const { monochromatic } = generateHarmony(blue);
      for (const color of monochromatic) {
        // hue is preserved (within rounding from gamut clamp)
        expect(color.h).toBeGreaterThanOrEqual(blue.h - 5);
        expect(color.h).toBeLessThanOrEqual(blue.h + 5);
      }
    });

    it('monochromatic extreme steps have reduced chroma relative to mid steps', () => {
      const { monochromatic } = generateHarmony(blue);
      // L=0.15 (index 0) and L=0.90 (index 5) should have lower C than L=0.45 (index 2)
      const extremeStart = monochromatic[0]?.c ?? 0;
      const extremeEnd = monochromatic[5]?.c ?? 0;
      const midChroma = monochromatic[2]?.c ?? 0;
      expect(extremeStart).toBeLessThanOrEqual(midChroma + GAMUT_TOLERANCE);
      expect(extremeEnd).toBeLessThanOrEqual(midChroma + GAMUT_TOLERANCE);
    });
  });

  describe('gamut clamping', () => {
    it('all OKLCH values have l in [0, 1]', () => {
      const result = generateHarmony(orange);
      const all = getAllColors(result);
      for (const c of all) {
        expect(c.l).toBeGreaterThanOrEqual(0);
        expect(c.l).toBeLessThanOrEqual(1);
      }
    });

    it('all OKLCH values have c >= 0', () => {
      const result = generateHarmony(orange);
      const all = getAllColors(result);
      for (const c of all) {
        expect(c.c).toBeGreaterThanOrEqual(0);
      }
    });

    it('all OKLCH values have h in [0, 360]', () => {
      const result = generateHarmony(orange);
      const all = getAllColors(result);
      for (const c of all) {
        expect(c.h).toBeGreaterThanOrEqual(0);
        expect(c.h).toBeLessThanOrEqual(360);
      }
    });
  });

  describe('edge cases', () => {
    it('hue 0 complementary is near 180', () => {
      const { complementary } = generateHarmony(red);
      // Gamut clamping may shift hue slightly, allow +/- 5 degrees
      expect(complementary.h).toBeGreaterThan(170);
      expect(complementary.h).toBeLessThan(190);
    });

    it('hue 359 complementary is near 179', () => {
      const { complementary } = generateHarmony(nearRed);
      const expected = (359 + 180) % 360; // 179
      expect(complementary.h).toBeGreaterThan(expected - 5);
      expect(complementary.h).toBeLessThan(expected + 5);
    });

    it('handles near-achromatic gray without NaN', () => {
      const result = generateHarmony(gray);
      const all = getAllColors(result);
      for (const c of all) {
        expect(Number.isFinite(c.l)).toBe(true);
        expect(Number.isFinite(c.c)).toBe(true);
        expect(Number.isFinite(c.h)).toBe(true);
      }
    });

    it('produces identical results for same input', () => {
      const r1 = generateHarmony(blue);
      const r2 = generateHarmony(blue);
      expect(r1).toEqual(r2);
    });
  });
});

/** Collect all OKLCH colors from a ColorHarmonies object into a flat array. */
function getAllColors(h: ColorHarmonies): OKLCH[] {
  return [
    h.complementary,
    ...h.triadic,
    ...h.analogous,
    ...h.tetradic,
    ...h.splitComplementary,
    ...h.monochromatic,
  ];
}
