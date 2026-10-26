/**
 * Tests for createNormalizedScale() (#2872)
 */

import type { OKLCH } from '@rafters/shared';
import { ColorValueSchema } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { rebakeAccessibility } from '../src/accessibility.js';
import { buildColorValue } from '../src/builder.js';
import { findMaxChroma, isInSRGBGamut } from '../src/gamut.js';
import { generateHarmony } from '../src/harmony.js';
import { createNormalizedScale, NormalizedScaleError } from '../src/normalized-scale.js';
import {
  CHROMA_SHARE,
  HUE_DRIFT_BANDS,
  LIGHTNESS_LADDERS,
} from '../src/normalized-scale-constants.js';

const blue: OKLCH = { l: 0.6, c: 0.15, h: 250, alpha: 1 };
// Exactly on the 90 band, so the measured drift is that band's array.
const yellow: OKLCH = { l: 0.85, c: 0.15, h: 90, alpha: 1 };

const ELEVEN = [0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

function hueDelta(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

describe('createNormalizedScale', () => {
  it('returns a valid ColorValue with the same intelligence as buildColorValue', () => {
    const result = createNormalizedScale(blue);
    const built = buildColorValue(blue);
    expect(ColorValueSchema.safeParse(result).success).toBe(true);
    expect(result.scale).toHaveLength(11);
    expect(result.name).toBe(built.name);
    expect(result.harmonies).toEqual(generateHarmony(blue));
    expect(result.analysis).toEqual(built.analysis);
    expect(result.semanticSuggestions).toEqual(built.semanticSuggestions);
    expect(result.accessibility?.apca).toEqual(built.accessibility?.apca);
  });

  it('defaults to the deep ladder, measured chroma and measured hue', () => {
    expect(createNormalizedScale(blue)).toEqual(
      createNormalizedScale(blue, { lightness: 'deep', chroma: 'measured', hue: 'measured' }),
    );
    expect(createNormalizedScale(blue).scaleStyle).toBe('deep');
  });

  describe('lightness', () => {
    it('anchors the source at the nearest ladder step, exactly as typed', () => {
      const source: OKLCH = { l: 0.6012, c: 0.1234, h: 250.4, alpha: 1 };
      const result = createNormalizedScale(source);
      // deep ladder: 0.593 at index 6 ('600') is nearest 0.6012
      expect(result.anchor).toBe('600');
      expect(result.scale[6]).toEqual(source);
      expect(result.seedAdjusted).toBeUndefined();
    });

    it('bends the ladder toward the pin on both sides', () => {
      const pin: OKLCH = { l: 0.62, c: 0.12, h: 250, alpha: 1 };
      const result = createNormalizedScale(pin, { lightness: 'compact' });
      const lad = LIGHTNESS_LADDERS.compact;
      // compact: 0.6 at index 8 is nearest 0.62
      expect(result.anchor).toBe('800');
      const top = lad[0];
      const bottom = lad[10];
      const at = lad[8];
      for (const [k, step] of result.scale.entries()) {
        const ladK = lad[k] ?? 0;
        const expected =
          k === 8
            ? 0.62
            : k < 8
              ? top + ((0.62 - top) * (ladK - top)) / (at - top)
              : 0.62 + ((bottom - 0.62) * (ladK - at)) / (bottom - at);
        expect(step.l).toBeCloseTo(expected, 3);
      }
      expect(result.scale[0]?.l).toBe(top);
      expect(result.scale[10]?.l).toBe(bottom);
      expect(result.scaleStyle).toBe('compact');
    });

    it('stays strictly decreasing for sources across the range', () => {
      for (const l of [0.99, 0.91, 0.7, 0.555, 0.42, 0.3, 0.1]) {
        for (const lightness of ['deep', 'compact'] as const) {
          const { scale } = createNormalizedScale({ l, c: 0.1, h: 30, alpha: 1 }, { lightness });
          for (let i = 1; i < scale.length; i++) {
            expect(scale[i]?.l ?? 1).toBeLessThan(scale[i - 1]?.l ?? 0);
          }
        }
      }
    });

    it('records a custom ladder as custom', () => {
      const result = createNormalizedScale(blue, { lightness: ELEVEN });
      expect(result.scaleStyle).toBe('custom');
      expect(result.anchor).toBe('500');
      expect(result.scale[5]?.l).toBe(blue.l);
      expect(result.scale[0]?.l).toBe(0.95);
      expect(result.scale[10]?.l).toBe(0.1);
    });
  });

  describe('chroma', () => {
    it("is the seed's share times the curve times the sRGB maximum; the anchor keeps its own", () => {
      const result = createNormalizedScale(blue, { chroma: 'measured', hue: 'none' });
      const seedShare = Math.min(1, blue.c / findMaxChroma(0.6, 250, 'srgb'));
      for (const [i, step] of result.scale.entries()) {
        if (i === 6) {
          expect(step.c).toBe(blue.c);
          continue;
        }
        const max = findMaxChroma(step.l, 250, 'srgb');
        expect(step.c).toBeCloseTo(seedShare * (CHROMA_SHARE.measured[i] ?? 0) * max, 2);
        expect(step.c).toBeLessThanOrEqual(max);
      }
    });

    it('keeps a vivid seed at the gamut edge with the gamut curve', () => {
      const vivid: OKLCH = { l: 0.6, c: 0.3, h: 250, alpha: 1 };
      const result = createNormalizedScale(vivid, { chroma: 'gamut', hue: 'none' });
      const step = result.scale[2];
      expect(step?.c).toBeCloseTo(findMaxChroma(step?.l ?? 0, 250, 'srgb'), 2);
    });
  });

  describe('shadow-ash (0.050-0.013-239)', () => {
    const shadowAsh: OKLCH = { l: 0.05, c: 0.013, h: 239, alpha: 1 };
    const result = createNormalizedScale(shadowAsh);

    it('pins the seed at 950 with its lightness and hue exact', () => {
      // 0.050-0.013-239 sits just outside sRGB, so the pin loses chroma only.
      const pin = result.scale[10];
      expect(result.anchor).toBe('950');
      expect(pin?.l).toBe(shadowAsh.l);
      expect(pin?.h).toBe(shadowAsh.h);
      expect(result.seedAdjusted).toEqual({
        from: shadowAsh,
        to: { ...shadowAsh, c: pin?.c },
        reason: 'gamut',
      });
    });

    it('stays near-grey at every step', () => {
      for (const step of result.scale) expect(step.c).toBeLessThan(0.03);
    });

    it('runs smoothly from 600 to 950 with no gap', () => {
      const run = result.scale.slice(6).map((step) => step.l);
      const gaps = run.slice(1).map((l, i) => (run[i] ?? 0) - l);
      for (const gap of gaps) {
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThan(0.15);
      }
    });
  });

  describe('hue', () => {
    it('drifts by the band relative to the anchor; the anchor keeps the source hue', () => {
      const result = createNormalizedScale(yellow);
      // deep: 0.827 at index 3 is nearest 0.85
      expect(result.anchor).toBe('300');
      const drift = HUE_DRIFT_BANDS[90];
      for (const [i, step] of result.scale.entries()) {
        if (i === 3) {
          expect(step.h).toBe(90);
          continue;
        }
        const expected = 90 + (drift[i] ?? 0) - (drift[3] ?? 0);
        expect(Math.abs(hueDelta(step.h, expected))).toBeLessThanOrEqual(1);
      }
      // dark yellow turns toward brown (lower hue), never olive
      expect(result.scale[10]?.h ?? 90).toBeLessThan(60);
    });

    it('interpolates between the two nearest bands', () => {
      const between = createNormalizedScale({ ...yellow, h: 75 }, { chroma: 'gamut' });
      const expected =
        75 +
        ((HUE_DRIFT_BANDS[60][0] + HUE_DRIFT_BANDS[90][0]) / 2 -
          (HUE_DRIFT_BANDS[60][3] + HUE_DRIFT_BANDS[90][3]) / 2);
      expect(Math.abs(hueDelta(between.scale[0]?.h ?? 0, expected))).toBeLessThanOrEqual(1);
    });

    it('wraps from the 330 band to the 0 band', () => {
      const result = createNormalizedScale({ l: 0.6, c: 0.15, h: 345, alpha: 1 });
      const d0 =
        (HUE_DRIFT_BANDS[330][0] + HUE_DRIFT_BANDS[0][0]) / 2 -
        (HUE_DRIFT_BANDS[330][6] + HUE_DRIFT_BANDS[0][6]) / 2;
      expect(Math.abs(hueDelta(result.scale[0]?.h ?? 0, 345 + d0))).toBeLessThanOrEqual(1);
    });

    it('holds the hue with none', () => {
      const result = createNormalizedScale(yellow, { hue: 'none' });
      for (const step of result.scale) expect(step.h).toBe(90);
    });
  });

  describe('gamut', () => {
    it('reduces chroma only and records per-step gamut', () => {
      const vivid: OKLCH = { l: 0.6, c: 0.3, h: 250, alpha: 1 };
      const unmapped = createNormalizedScale(vivid, { chroma: 'gamut', hue: 'none' });
      const result = createNormalizedScale(vivid, {
        chroma: [1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3, 1.3],
        hue: 'none',
      });
      expect(result.gamut).toEqual(Array.from({ length: 11 }, () => 'srgb'));
      for (const [i, step] of result.scale.entries()) {
        expect(isInSRGBGamut(step)).toBe(true);
        expect(step.l).toBe(unmapped.scale[i]?.l);
        expect(step.h).toBe(250);
      }
    });

    it('reduces an out-of-gamut dark seed in chroma only', () => {
      const dark: OKLCH = { l: 0.2, c: 0.2, h: 56, alpha: 1 };
      const result = createNormalizedScale(dark);
      const pin = result.scale[10];
      expect(result.anchor).toBe('950');
      expect(pin?.l).toBe(dark.l);
      expect(pin?.h).toBe(dark.h);
      expect(pin?.c ?? 1).toBeLessThan(dark.c);
      expect(isInSRGBGamut(pin ?? dark)).toBe(true);
      expect(result.seedAdjusted).toEqual({
        from: dark,
        to: { ...dark, c: pin?.c },
        reason: 'gamut',
      });
    });
  });

  describe('array options', () => {
    it.each(['lightness', 'chroma', 'hue'] as const)(
      'throws naming %s for a wrong length',
      (option) => {
        expect(() => createNormalizedScale(blue, { [option]: [0.5, 0.4] })).toThrow(
          NormalizedScaleError,
        );
        expect(() => createNormalizedScale(blue, { [option]: [0.5, 0.4] })).toThrow(option);
      },
    );

    it('throws naming lightness for a ladder that does not strictly decrease', () => {
      const flat = [...ELEVEN];
      flat[5] = 0.7;
      expect(() => createNormalizedScale(blue, { lightness: flat })).toThrow(/lightness/);
    });
  });

  it('rebakeAccessibility measures on the recorded anchor', () => {
    const result = createNormalizedScale(yellow);
    expect(result.anchor).toBe('300');
    const rebaked = rebakeAccessibility(result);
    expect(rebaked.accessibility?.onWhite.contrastRatio).toBe(
      result.accessibility?.onWhite.contrastRatio,
    );
    const withoutAnchor = rebakeAccessibility({ ...result, anchor: undefined });
    expect(withoutAnchor.accessibility?.onWhite.contrastRatio).not.toBe(
      result.accessibility?.onWhite.contrastRatio,
    );
  });
});
