import { describe, expect, it } from 'vitest';
import { groupIntoFamilies } from '../../src/importers/families.js';

function ramp(name: string, hexBase: string) {
  const positions = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
  return positions.map((p) => ({ name: `${name}-${p}`, value: hexBase }));
}

describe('groupIntoFamilies', () => {
  it('groups a complete 11-position ramp into a family', () => {
    const result = groupIntoFamilies(ramp('color-empire', '#7C0E12'));
    expect(result.families).toHaveLength(1);
    expect(result.families[0]?.name).toBe('empire');
    expect(Object.keys(result.families[0]?.scale ?? {})).toEqual([
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

  it('parses values to OKLCH (round-trips through tryParseColor)', () => {
    const result = groupIntoFamilies(ramp('color-empire', '#7C0E12'));
    const fam = result.families[0];
    const position500 = fam?.scale['500'];
    expect(position500).toBeDefined();
    // Hex -> OKLCH: lightness is a finite number in [0, 1].
    expect(position500?.l).toBeGreaterThan(0);
    expect(position500?.l).toBeLessThanOrEqual(1);
  });

  it('returns empty result for empty input', () => {
    const result = groupIntoFamilies([]);
    expect(result.families).toEqual([]);
    expect(result.leftover).toEqual([]);
  });

  it('returns leftover for declarations whose names do not match the ramp pattern', () => {
    const result = groupIntoFamilies([
      { name: 'primary', value: '#ff0000' },
      { name: 'radius', value: '0.5rem' },
    ]);
    expect(result.families).toHaveLength(0);
    expect(result.leftover.map((d) => d.name)).toEqual(['primary', 'radius']);
  });
});
