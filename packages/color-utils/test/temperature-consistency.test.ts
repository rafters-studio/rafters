/**
 * Regression guard for the two divergent temperature classifiers (#2146).
 *
 * ColorValue carried two independent warm/cool/neutral verdicts:
 * analysis.temperature from getColorTemperature, and
 * atmosphericWeight.temperature from an inline hue-range check in harmony.ts.
 * They disagreed on 148 of 360 integer hues, including the color wheel's own
 * semantic anchors. calculateAtmosphericWeight now sources its verdict from
 * getColorTemperature, so the two fields can never contradict each other.
 */

import { describe, expect, it } from 'vitest';
import { buildColorValue } from '../src/builder.js';

// getColorTemperature changes verdict at hues 0, 90, 120, 150, 270, 290, 315
// and 360. Sweep every 5 degrees (which lands on each boundary) plus the
// integer hues on both sides of each one, so every band and edge is asserted
// without building all 360 ColorValues (each build is slow under load).
const BOUNDARIES = [0, 90, 120, 150, 270, 290, 315];
const SAMPLED_HUES = [
  ...new Set([
    ...Array.from({ length: 72 }, (_, i) => i * 5),
    ...BOUNDARIES.flatMap((b) => [b - 1, b, b + 1]),
    359,
  ]),
]
  .map((h) => (h + 360) % 360)
  .sort((a, b) => a - b);

describe('temperature classifier consistency', () => {
  it('agrees between analysis.temperature and atmosphericWeight.temperature across every hue band', () => {
    for (const h of SAMPLED_HUES) {
      const value = buildColorValue({ l: 0.6, c: 0.15, h });
      // Both fields are optional on ColorValue: assert presence so the
      // equality below can never pass as undefined === undefined.
      expect(value.analysis?.temperature).toBeDefined();
      expect(value.atmosphericWeight?.temperature).toBeDefined();
      expect(value.atmosphericWeight?.temperature).toBe(value.analysis?.temperature);
    }
  });

  it('agrees on the warning anchor hue (h=85)', () => {
    const value = buildColorValue({ l: 0.6, c: 0.15, h: 85 });
    expect(value.atmosphericWeight?.temperature).toBe(value.analysis?.temperature);
  });

  it('agrees on the success anchor hue (h=145)', () => {
    const value = buildColorValue({ l: 0.6, c: 0.15, h: 145 });
    expect(value.atmosphericWeight?.temperature).toBe(value.analysis?.temperature);
  });

  it('reports neutral in both fields when chroma is below the neutral guard', () => {
    // The chroma guard lives only in getColorTemperature. The old inline
    // classifier ignored chroma entirely and called h=30 warm at any chroma.
    const value = buildColorValue({ l: 0.6, c: 0.01, h: 30 });
    expect(value.analysis?.temperature).toBe('neutral');
    expect(value.atmosphericWeight?.temperature).toBe('neutral');
  });
});
