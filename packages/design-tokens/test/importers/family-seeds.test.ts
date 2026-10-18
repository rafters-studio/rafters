import { describe, expect, it } from 'vitest';
import { detectFamilySeeds } from '../../src/importers/family-seeds.js';

describe('detectFamilySeeds', () => {
  it('groups color- declarations by family and strips the color- prefix', () => {
    const seeds = detectFamilySeeds([
      { name: 'color-empire-300', value: 'oklch(0.8 0.1 250)' },
      { name: 'color-empire-700', value: 'oklch(0.4 0.1 250)' },
    ]);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.name).toBe('empire');
  });

  it('prefers the -500 declaration as the seed when the designer wrote one', () => {
    const seeds = detectFamilySeeds([
      { name: 'color-empire-300', value: 'oklch(0.8 0.1 250)' },
      { name: 'color-empire-500', value: 'oklch(0.6 0.12 250)' },
      { name: 'color-empire-700', value: 'oklch(0.4 0.1 250)' },
    ]);
    expect(seeds[0]?.seedPosition).toBe('500');
    expect(seeds[0]?.seed.l).toBeCloseTo(0.6, 5);
  });

  it('keeps the first authored position when no -500 exists', () => {
    const seeds = detectFamilySeeds([
      { name: 'color-empire-700', value: 'oklch(0.4 0.1 250)' },
      { name: 'color-empire-300', value: 'oklch(0.8 0.1 250)' },
    ]);
    expect(seeds[0]?.seedPosition).toBe('700');
    expect(seeds[0]?.seed.l).toBeCloseTo(0.4, 5);
  });

  it('seeds a bare single-colour declaration at 500', () => {
    const seeds = detectFamilySeeds([{ name: 'color-brand', value: '#3b82f6' }]);
    expect(seeds).toEqual([expect.objectContaining({ name: 'brand', seedPosition: '500' })]);
  });

  it('ignores non-color namespaces and unparseable values', () => {
    const seeds = detectFamilySeeds([
      { name: 'font-display', value: 'red' },
      { name: 'color-broken-500', value: 'not-a-colour' },
    ]);
    expect(seeds).toEqual([]);
  });
});
