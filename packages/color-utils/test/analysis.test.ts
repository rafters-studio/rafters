/**
 * Tests for the analysis fields' colour science (#2672).
 */

import { describe, expect, it } from 'vitest';
import { calculatePerceptualWeight, isLightColor } from '../src/analysis.js';

describe('isLightColor', () => {
  it('lowers the threshold for high chroma (Helmholtz-Kohlrausch: saturated looks lighter)', () => {
    // threshold 0.5 - 0.25 * 0.3 = 0.425
    expect(isLightColor({ l: 0.45, c: 0.25, h: 30, alpha: 1 })).toBe(true);
    expect(isLightColor({ l: 0.45, c: 0.05, h: 30, alpha: 1 })).toBe(false);
    expect(isLightColor({ l: 0.42, c: 0.25, h: 30, alpha: 1 })).toBe(false);
  });
});

describe('calculatePerceptualWeight', () => {
  it('gives an achromatic colour the same weight whatever its hue', () => {
    expect(calculatePerceptualWeight({ l: 0.5, c: 0, h: 0, alpha: 1 })).toEqual(
      calculatePerceptualWeight({ l: 0.5, c: 0, h: 200, alpha: 1 }),
    );
  });

  it('weighs greys below the 0.04 neutral threshold with hue weight 0.5', () => {
    // 0.5 * 0.4 + 0 * 0.35 + 0.5 * 0.25
    expect(calculatePerceptualWeight({ l: 0.5, c: 0, h: 0, alpha: 1 }).weight).toBeCloseTo(0.325);
  });
});
