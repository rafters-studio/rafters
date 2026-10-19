import {
  getGamutTier,
  POSITION_TO_INDEX,
  rebakeAccessibility,
  SCALE_POSITIONS,
} from '@rafters/color-utils';
import type { OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { importColorFamily } from '../../src/importers/color.js';

const SEED: OKLCH = { l: 0.5, c: 0.18, h: 30 };

describe('importColorFamily', () => {
  it('returns 1 family token + 11 per-position primitive tokens', () => {
    const tokens = importColorFamily('empire', '500', SEED);
    expect(tokens).toHaveLength(1 + SCALE_POSITIONS.length);

    const [family, ...primitives] = tokens;
    expect(family?.name).toBe('empire');
    expect(family?.namespace).toBe('color');
    expect(primitives.map((t) => t.name)).toEqual(SCALE_POSITIONS.map((p) => `empire-${p}`));
  });

  it('overrides the auto-generated color name with the supplied family name', () => {
    const tokens = importColorFamily('silly-blue', '500', SEED);
    const family = tokens[0];
    if (!family || typeof family.value === 'string') {
      throw new Error('expected family token with ColorValue value');
    }
    if ('family' in family.value) {
      throw new Error('expected ColorValue, not ColorReference');
    }
    expect(family.value.name).toBe('silly-blue');
  });

  it('pins the seed at the position the designer authored, not always 500', () => {
    const tokens = importColorFamily('empire', '700', SEED);
    const family = tokens[0];
    if (!family || typeof family.value === 'string' || 'family' in family.value) {
      throw new Error('expected ColorValue family token');
    }
    const idx700 = POSITION_TO_INDEX['700'];
    if (idx700 === undefined) throw new Error('700 should be in POSITION_TO_INDEX');
    const at700 = family.value.scale[idx700];
    expect(at700?.l).toBeCloseTo(SEED.l, 5);
    expect(at700?.c).toBeCloseTo(SEED.c, 5);
    expect(at700?.h).toBeCloseTo(SEED.h, 5);
  });

  it('seeds at position 500 when the designer authored there', () => {
    const tokens = importColorFamily('empire', '500', SEED);
    const family = tokens[0];
    if (!family || typeof family.value === 'string' || 'family' in family.value) {
      throw new Error('expected ColorValue family token');
    }
    const idx500 = POSITION_TO_INDEX['500'];
    if (idx500 === undefined) throw new Error('500 should be in POSITION_TO_INDEX');
    const at500 = family.value.scale[idx500];
    expect(at500?.l).toBeCloseTo(SEED.l, 5);
    expect(at500?.c).toBeCloseTo(SEED.c, 5);
    expect(at500?.h).toBeCloseTo(SEED.h, 5);
  });

  it('re-derives accessibility from the pinned scale when the seed sits off the natural step', () => {
    const seed: OKLCH = { l: 0.62, c: 0.14, h: 250, alpha: 1 };
    const family = importColorFamily('empire', '400', seed)[0];
    if (!family || typeof family.value === 'string' || 'family' in family.value) {
      throw new Error('expected ColorValue family token');
    }
    const imported = family.value;
    expect(imported.scale[4]).toEqual(seed);
    expect(imported.accessibility).toEqual(rebakeAccessibility(imported).accessibility);
  });

  it('pins a P3 or out-of-gamut seed as typed, records its true tier, and no seedAdjusted (#2672)', () => {
    const cases: { seed: OKLCH; tier: 'srgb' | 'p3' | 'out' }[] = [
      { seed: SEED, tier: getGamutTier(SEED) },
      { seed: { l: 0.55, c: 0.12, h: 210, alpha: 1 }, tier: 'p3' },
      { seed: { l: 0.7, c: 0.35, h: 150, alpha: 1 }, tier: 'out' },
    ];
    for (const { seed, tier } of cases) {
      expect(getGamutTier(seed)).toBe(tier);
      const family = importColorFamily('empire', '400', seed)[0];
      if (!family || typeof family.value === 'string' || 'family' in family.value) {
        throw new Error('expected ColorValue family token');
      }
      const imported = family.value;
      expect(imported.scale[4]).toEqual(seed);
      expect(imported.gamut?.[4]).toBe(tier);
      for (const [i, step] of imported.scale.entries()) {
        expect(imported.gamut?.[i]).toBe(getGamutTier(step));
      }
      expect(imported.seedAdjusted).toBeUndefined();
    }
  });

  it('throws on an unknown seed position', () => {
    expect(() => importColorFamily('empire', '550', SEED)).toThrow(/unknown scale position "550"/);
  });
});
