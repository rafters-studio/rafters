/**
 * Tests for rebakeAccessibility (moved from the removed CLI set command, #1643).
 * The guard: a ColorValue whose scale changed must get fresh WCAG matrices or
 * the contrast/state/invert selection downstream starves.
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { minFontSizeForAPCA, rebakeAccessibility } from '../src/accessibility.js';
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
