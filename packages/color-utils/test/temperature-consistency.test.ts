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

describe('temperature classifier consistency', () => {
  it('agrees between analysis.temperature and atmosphericWeight.temperature for every hue', () => {
    for (let h = 0; h < 360; h++) {
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
