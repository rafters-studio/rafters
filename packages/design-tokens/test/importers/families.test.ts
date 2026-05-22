import { describe, expect, it } from 'vitest';
import {
  colorValueFromFamily,
  groupIntoFamilies,
  seedFamiliesFromDeclarations,
} from '../../src/importers/families.js';

function ramp(name: string, hexBase: string) {
  const positions = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  return positions.map((p) => ({ name: `${name}-${p}`, value: hexBase }));
}

describe('groupIntoFamilies', () => {
  it('groups a complete 11-position ramp into a family with seed + sourcePositions', () => {
    const result = groupIntoFamilies(ramp('color-empire', '#7C0E12'));
    expect(result.families).toHaveLength(1);
    const fam = result.families[0];
    expect(fam?.name).toBe('empire');
    expect(fam?.seed).toBeDefined();
    expect(Object.keys(fam?.sourcePositions ?? {})).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ]);
    expect(result.leftover).toEqual([]);
  });

  it('strips the `color-` prefix from family names', () => {
    const result = groupIntoFamilies(ramp('color-republic', '#3574B0'));
    expect(result.families[0]?.name).toBe('republic');
  });

  it('keeps multiple distinct families separate', () => {
    const result = groupIntoFamilies([
      ...ramp('color-empire', '#7C0E12'),
      ...ramp('color-republic', '#3574B0'),
      ...ramp('color-mud', '#3D5C5C'),
    ]);
    const names = result.families.map((f) => f.name).sort();
    expect(names).toEqual(['empire', 'mud', 'republic']);
  });

  it('rejects partial ramps (under 7 positions) and routes them to leftover', () => {
    const partial = ['50', '100', '500'].map((p) => ({
      name: `color-half-${p}`,
      value: '#aabbcc',
    }));
    const result = groupIntoFamilies(partial);
    expect(result.families).toHaveLength(0);
    expect(result.leftover.map((d) => d.name)).toEqual([
      'color-half-50',
      'color-half-100',
      'color-half-500',
    ]);
  });

  it('routes non-color values to leftover', () => {
    const result = groupIntoFamilies([
      { name: 'spacing-50', value: '0.5rem' },
      { name: 'spacing-100', value: '1rem' },
    ]);
    expect(result.families).toHaveLength(0);
    expect(result.leftover.map((d) => d.name)).toEqual(['spacing-50', 'spacing-100']);
  });

  it("uses the source's 500 position as the seed", () => {
    const result = groupIntoFamilies(ramp('color-empire', '#7C0E12'));
    const fam = result.families[0];
    expect(fam?.seed).toEqual(fam?.sourcePositions['500']);
  });

  it('returns empty result for empty input', () => {
    const result = groupIntoFamilies([]);
    expect(result.families).toEqual([]);
    expect(result.leftover).toEqual([]);
  });
});

describe('seedFamiliesFromDeclarations', () => {
  it('promotes a bare color declaration to a family with seed at position 500', () => {
    const seeds = seedFamiliesFromDeclarations([{ name: 'color-brand', value: '#FF5500' }]);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.name).toBe('brand');
    expect(seeds[0]?.seed).toBeDefined();
    expect(Object.keys(seeds[0]?.sourcePositions ?? {})).toEqual(['500']);
  });

  it('honors a position suffix in the source name', () => {
    const seeds = seedFamiliesFromDeclarations([{ name: 'color-brand-700', value: '#7C0E12' }]);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.name).toBe('brand');
    expect(Object.keys(seeds[0]?.sourcePositions ?? {})).toEqual(['700']);
  });

  it('skips declarations whose family name collides with an existing ramp', () => {
    const seeds = seedFamiliesFromDeclarations(
      [{ name: 'color-empire', value: '#000000' }],
      new Set(['empire']),
    );
    expect(seeds).toHaveLength(0);
  });

  it('skips non-color values', () => {
    const seeds = seedFamiliesFromDeclarations([
      { name: 'spacing-base', value: '0.25rem' },
      { name: 'font-sans', value: '"Inter", sans-serif' },
    ]);
    expect(seeds).toHaveLength(0);
  });

  it('handles multiple distinct seed names', () => {
    const seeds = seedFamiliesFromDeclarations([
      { name: 'color-brand', value: '#FF5500' },
      { name: 'color-accent', value: '#3574B0' },
      { name: 'color-warn', value: '#FAA21C' },
    ]);
    expect(seeds.map((f) => f.name)).toEqual(['brand', 'accent', 'warn']);
  });

  it('returns empty for empty input', () => {
    expect(seedFamiliesFromDeclarations([])).toEqual([]);
  });
});

describe('colorValueFromFamily', () => {
  it('returns a complete ColorValue with all the rich data buildColorValue produces', () => {
    const ramps = groupIntoFamilies(ramp('color-empire', '#7C0E12'));
    const fam = ramps.families[0];
    if (!fam) throw new Error('expected a family');
    const cv = colorValueFromFamily(fam);

    expect(cv.name).toBeDefined();
    expect(cv.scale).toHaveLength(11);
    expect(cv.tokenId).toMatch(/^color-/);
    expect(cv.harmonies).toBeDefined();
    expect(cv.harmonies?.complementary).toBeDefined();
    expect(cv.harmonies?.triadic).toBeDefined();
    expect(cv.analysis).toBeDefined();
    expect(cv.analysis?.temperature).toBeDefined();
    expect(cv.atmosphericWeight).toBeDefined();
    expect(cv.perceptualWeight).toBeDefined();
    expect(cv.semanticSuggestions).toBeDefined();
    expect(cv.accessibility?.wcagAA?.normal).toBeDefined();
    expect(cv.accessibility?.wcagAAA?.normal).toBeDefined();
    expect(cv.accessibility?.onWhite).toBeDefined();
    expect(cv.accessibility?.onBlack).toBeDefined();
    expect(cv.accessibility?.apca).toBeDefined();
  });

  it('preserves source-declared positions in the final scale for ramps', () => {
    const sourceValues: Record<string, string> = {
      '50': '#FCE8E8',
      '100': '#F5C4C5',
      '200': '#E08385',
      '300': '#C74447',
      '400': '#A11E22',
      '500': '#7C0E12',
      '600': '#650B0E',
      '700': '#4E080B',
      '800': '#380608',
      '900': '#220304',
      '950': '#110202',
    };
    const decls = Object.entries(sourceValues).map(([p, v]) => ({
      name: `color-empire-${p}`,
      value: v,
    }));
    const { families } = groupIntoFamilies(decls);
    const fam = families[0];
    if (!fam) throw new Error('expected a family');
    const cv = colorValueFromFamily(fam);
    const sourcePos500 = fam.sourcePositions['500'];
    expect(cv.scale[5]).toEqual(sourcePos500);
  });

  it('uses buildColorValue generated scale for positions the designer did not author', () => {
    const seeds = seedFamiliesFromDeclarations([{ name: 'color-brand', value: '#FF5500' }]);
    const fam = seeds[0];
    if (!fam) throw new Error('expected a family');
    const cv = colorValueFromFamily(fam);
    expect(cv.scale).toHaveLength(11);
    expect(cv.scale[5]).toEqual(fam.sourcePositions['500']);
  });
});
