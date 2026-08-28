/**
 * Unit tests for generateModularScale, the modular typography scale
 * generator built from a Ratio.
 */

import { describe, expect, it } from 'vitest';
import { generateModularScale } from '../src/progressions.js';
import { type Ratio, resolveRatio } from '../src/ratios.js';

const need = (name: string): Ratio => resolveRatio(name);

describe('generateModularScale', () => {
  it('builds smaller and larger arrays from a ratio', () => {
    const scale = generateModularScale(need('major-third'), 16, 5);
    expect(scale.base).toBe(16);
    expect(scale.smaller).toHaveLength(5);
    expect(scale.larger).toHaveLength(5);
    expect(scale.larger[0]).toBe(20);
    expect(scale.larger[1]).toBe(25);
    expect(scale.larger[2]).toBe(31.25);
    expect(scale.smaller[4]).toBeCloseTo(12.8, 1);
  });

  it('defaults to 5 steps each side', () => {
    const scale = generateModularScale(need('minor-third'), 16);
    expect(scale.smaller).toHaveLength(5);
    expect(scale.larger).toHaveLength(5);
  });
});
