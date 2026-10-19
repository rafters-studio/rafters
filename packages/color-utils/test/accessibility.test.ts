/**
 * Tests for rebakeAccessibility (moved from the removed CLI set command, #1643).
 * The guard: a ColorValue whose scale changed must get fresh WCAG matrices or
 * the contrast/state/invert selection downstream starves.
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { APCAcontrast, displayP3toY, sRGBtoY } from 'apca-w3';
import Color from 'colorjs.io';
import { describe, expect, it } from 'vitest';
import {
  CONTRAST_BLACK,
  CONTRAST_WHITE,
  calculateAPCAContrast,
  calculateWCAGContrast,
  generateAccessibilityMetadata,
  minFontSizeForAPCA,
  rebakeAccessibility,
} from '../src/accessibility.js';
import { buildColorValue } from '../src/builder.js';
import { getGamutTier, toGamutCeiling } from '../src/gamut.js';
import { generateOKLCHScale } from '../src/harmony.js';
import { SCALE_POSITIONS } from '../src/scale-positions.js';

function scaleFor(seed: OKLCH): OKLCH[] {
  const record = generateOKLCHScale(seed);
  return SCALE_POSITIONS.map((p) => record[p]).filter((v): v is OKLCH => v !== undefined);
}

describe('rebakeAccessibility', () => {
  it('adds a WCAG ladder to a ColorValue with a scale', () => {
    const bare = {
      name: 'test-blue',
      scale: scaleFor({ l: 0.5, c: 0.15, h: 240, alpha: 1 }),
    } as ColorValue;
    const baked = rebakeAccessibility(bare);
    expect(baked.accessibility?.wcagAAA?.normal.length).toBeGreaterThan(0);
    expect(baked.accessibility?.onWhite.contrastRatio).toBeGreaterThan(1);
    expect(baked.accessibility?.onBlack.contrastRatio).toBeGreaterThan(1);
  });

  it('is a no-op on values without a scale', () => {
    const ref = { name: 'ref-only' } as ColorValue;
    expect(rebakeAccessibility(ref)).toBe(ref);
  });

  it('replaces stale matrices rather than keeping them', () => {
    const value = {
      name: 'stale',
      scale: scaleFor({ l: 0.5, c: 0.15, h: 240, alpha: 1 }),
      accessibility: {
        wcagAAA: { normal: [[0, 0]], large: [] },
        wcagAA: { normal: [], large: [] },
        onWhite: { wcagAA: false, wcagAAA: false, contrastRatio: 0 },
        onBlack: { wcagAA: false, wcagAAA: false, contrastRatio: 0 },
      },
    } as unknown as ColorValue;
    const baked = rebakeAccessibility(value);
    expect(baked.accessibility?.onWhite.contrastRatio).toBeGreaterThan(0);
    expect(baked.accessibility?.wcagAAA?.normal).not.toEqual([[0, 0]]);
  });
});

describe('minFontSizeForAPCA', () => {
  // Pins the breakpoint table that builder.ts now derives
  // ColorValue.accessibility.apca.minFontSize from, instead of re-encoding
  // 60/45 inline. The boundaries are inclusive on the lower edge.
  it('returns 16 at and above the 60 breakpoint', () => {
    expect(minFontSizeForAPCA(60)).toBe(16);
    expect(minFontSizeForAPCA(90)).toBe(16);
  });

  it('returns 24 between the 45 and 60 breakpoints', () => {
    expect(minFontSizeForAPCA(59.999)).toBe(24);
    expect(minFontSizeForAPCA(45)).toBe(24);
  });

  it('returns 32 below the 45 breakpoint', () => {
    expect(minFontSizeForAPCA(44.999)).toBe(32);
    expect(minFontSizeForAPCA(0)).toBe(32);
  });

  it('reads magnitude, not polarity', () => {
    expect(minFontSizeForAPCA(-75)).toBe(16);
    expect(minFontSizeForAPCA(-50)).toBe(24);
  });
});

describe('contrast measures colours as stored, sRGB or P3 (#2673)', () => {
  // The default family seeds (design-tokens generators/defaults.ts DEFAULT_COLOR_SEEDS).
  const defaultSeeds: OKLCH[] = [
    { l: 0.442, c: 0, h: 0, alpha: 1 },
    { l: 0.55, c: 0.12, h: 180, alpha: 1 },
    { l: 0.55, c: 0.2, h: 0, alpha: 1 },
    { l: 0.55, c: 0.12, h: 60, alpha: 1 },
    { l: 0.55, c: 0.12, h: 90, alpha: 1 },
    { l: 0.55, c: 0.12, h: 210, alpha: 1 },
    { l: 0.55, c: 0.12, h: 270, alpha: 1 },
  ];

  // The sRGB-channel relative luminance the WCAG function used before #2673.
  function srgbChannelRatio(colour: OKLCH, against: OKLCH): number {
    const lum = (o: OKLCH): number => {
      const [r = 0, g = 0, b = 0] = new Color('oklch', [o.l, o.c, o.h]).to('srgb').coords;
      const lin = (v: number): number => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const [a, b] = [lum(colour), lum(against)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  const yOf = (o: OKLCH): number =>
    new Color('oklch', [o.l, o.c, o.h]).to('xyz-d65').coords[1] ?? Number.NaN;

  const p3 = { l: 0.6, c: 0.13, h: 210, alpha: 1 };

  it('leaves every sRGB step of the default families unchanged within 0.01', () => {
    let measured = 0;
    for (const seed of defaultSeeds) {
      for (const step of buildColorValue(seed).scale) {
        if (getGamutTier(step) !== 'srgb') continue;
        for (const ref of [CONTRAST_WHITE, CONTRAST_BLACK]) {
          const drift = Math.abs(calculateWCAGContrast(step, ref) - srgbChannelRatio(step, ref));
          expect(drift).toBeLessThan(0.01);
          measured++;
        }
      }
    }
    expect(measured).toBeGreaterThan(0);
  });

  it('measures a P3 colour from its XYZ D65 Y', () => {
    expect(getGamutTier(p3)).toBe('p3');
    expect(calculateWCAGContrast(p3, CONTRAST_WHITE)).toBeCloseTo(1.05 / (yOf(p3) + 0.05), 2);
    expect(calculateWCAGContrast(p3, CONTRAST_WHITE)).toBeCloseTo(3.755, 2);
    const srgb = { l: 0.55, c: 0.05, h: 30, alpha: 1 };
    expect(getGamutTier(srgb)).toBe('srgb');
    expect(calculateWCAGContrast(srgb, CONTRAST_WHITE)).toBeCloseTo(4.963, 2);
  });

  it('measures a P3 colour through displayP3toY, not its sRGB clip', () => {
    const [r = 0, g = 0, b = 0] = new Color('oklch', [p3.l, p3.c, p3.h]).to('p3').coords;
    const expected = APCAcontrast(displayP3toY([r, g, b]), sRGBtoY([255, 255, 255]));
    expect(calculateAPCAContrast(p3, CONTRAST_WHITE)).toBeCloseTo(expected, 6);

    const [cr = 0, cg = 0, cb = 0] = new Color('oklch', [p3.l, p3.c, p3.h])
      .to('srgb')
      .coords.map((v) => Math.max(0, Math.min(1, v ?? 0)) * 255);
    const fromClip = APCAcontrast(sRGBtoY([cr, cg, cb]), sRGBtoY([255, 255, 255]));
    expect(Math.abs(calculateAPCAContrast(p3, CONTRAST_WHITE) - fromClip)).toBeGreaterThan(0.1);
  });

  it('measures a colour beyond P3 as its P3 gamut map', () => {
    const out = { l: 0.6, c: 0.4, h: 150, alpha: 1 };
    expect(getGamutTier(out)).toBe('out');
    const contrast = calculateAPCAContrast(out, CONTRAST_WHITE);
    expect(Number.isFinite(contrast)).toBe(true);
    expect(contrast).toBeCloseTo(
      calculateAPCAContrast(toGamutCeiling(out, 'p3'), CONTRAST_WHITE),
      6,
    );
  });

  it('snaps a channel inGamut accepts at -7e-5 to 0 as float noise, not NaN', () => {
    const [l = 0, c = 0, h = 0] = new Color('srgb', [-7e-5, 0.5, 0.5]).to('oklch').coords;
    const edge = { l, c, h, alpha: 1 };
    expect(getGamutTier(edge)).toBe('srgb');
    const [r = 0, g = 0, b = 0] = new Color('oklch', [l, c, h]).to('srgb').coords;
    expect(r).toBeLessThan(0);
    const contrast = calculateAPCAContrast(edge, CONTRAST_WHITE);
    expect(Number.isFinite(contrast)).toBe(true);
    expect(contrast).toBeCloseTo(
      APCAcontrast(sRGBtoY([0, g * 255, b * 255]), sRGBtoY([255, 255, 255])),
      6,
    );
  });

  it('leaves black text on white unchanged in APCA', () => {
    const contrast = calculateAPCAContrast(CONTRAST_BLACK, CONTRAST_WHITE);
    expect(contrast).toBeCloseTo(APCAcontrast(sRGBtoY([0, 0, 0]), sRGBtoY([255, 255, 255])), 6);
    expect(Math.abs(contrast)).toBeGreaterThan(105);
    expect(Math.abs(contrast)).toBeLessThan(107);
  });

  it('builds the pair matrices from the new luminance on a scale holding P3 steps', () => {
    const scale: OKLCH[] = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25].map((l) =>
      toGamutCeiling({ l, c: 0.4, h: 150, alpha: 1 }, 'p3'),
    );
    expect(scale.some((s) => getGamutTier(s) === 'p3')).toBe(true);

    const meta = generateAccessibilityMetadata(scale);
    const pairsAt = (min: number): number[][] => {
      const pairs: number[][] = [];
      for (const [i, a] of scale.entries()) {
        for (const [j, b] of scale.entries()) {
          if (i !== j && calculateWCAGContrast(a, b) >= min) pairs.push([i, j]);
        }
      }
      return pairs;
    };
    const indicesAt = (ref: OKLCH, min: number): number[] =>
      scale.flatMap((s, i) => (calculateWCAGContrast(s, ref) >= min ? [i] : []));

    expect(meta.wcagAA.normal).toEqual(pairsAt(4.5));
    expect(meta.wcagAA.large).toEqual(pairsAt(3.0));
    expect(meta.wcagAAA.normal).toEqual(pairsAt(7.0));
    expect(meta.wcagAAA.large).toEqual(pairsAt(4.5));
    expect(meta.onWhite).toEqual({
      aa: indicesAt(CONTRAST_WHITE, 4.5),
      aaa: indicesAt(CONTRAST_WHITE, 7.0),
    });
    expect(meta.onBlack).toEqual({
      aa: indicesAt(CONTRAST_BLACK, 4.5),
      aaa: indicesAt(CONTRAST_BLACK, 7.0),
    });
  });
});
