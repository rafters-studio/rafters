/**
 * Unit tests for the Ratio schema, default registry, and operations.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_RATIOS, type Ratio, RatioSchema, ratioValue, resolveRatio } from '../src/ratios';

const need = (name: string): Ratio => resolveRatio(name);

describe('RatioSchema', () => {
  it('validates a well-formed ratio', () => {
    expect(RatioSchema.safeParse({ name: 'spice', a: 7, b: 4 }).success).toBe(true);
  });

  it('rejects non-positive a or b', () => {
    expect(RatioSchema.safeParse({ name: 'bad', a: 0, b: 1 }).success).toBe(false);
    expect(RatioSchema.safeParse({ name: 'bad', a: 1, b: -1 }).success).toBe(false);
  });

  it('every DEFAULT_RATIOS item validates against the schema', () => {
    for (const r of DEFAULT_RATIOS) {
      expect(RatioSchema.safeParse(r).success).toBe(true);
    }
  });
});

describe('DEFAULT_RATIOS registry', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DEFAULT_RATIOS)).toBe(true);
    expect(DEFAULT_RATIOS.length).toBeGreaterThan(0);
  });

  it('contains the expected named items for design-system use', () => {
    for (const name of [
      'minor-second',
      'major-second',
      'minor-third',
      'major-third',
      'perfect-fourth',
      'augmented-fourth',
      'perfect-fifth',
      'golden',
    ]) {
      expect(DEFAULT_RATIOS.find((r) => r.name === name)).toBeDefined();
    }
  });

  it('all ratios have a/b > 0', () => {
    for (const r of DEFAULT_RATIOS) {
      expect(r.a).toBeGreaterThan(0);
      expect(r.b).toBeGreaterThan(0);
    }
  });
});

describe('ratioValue', () => {
  it('computes a/b', () => {
    expect(ratioValue({ name: 'two', a: 2, b: 1 })).toBe(2);
    expect(ratioValue(need('minor-third'))).toBeCloseTo(6 / 5, 6);
    expect(ratioValue(need('major-third'))).toBeCloseTo(5 / 4, 6);
    expect(ratioValue(need('perfect-fourth'))).toBeCloseTo(4 / 3, 6);
    expect(ratioValue(need('perfect-fifth'))).toBeCloseTo(3 / 2, 6);
    expect(ratioValue(need('golden'))).toBeCloseTo((1 + Math.sqrt(5)) / 2, 6);
    expect(ratioValue(need('augmented-fourth'))).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe('design-system use cases', () => {
  it('builds a golden-ratio spacing scale', () => {
    const golden = need('golden');
    const base = 16;
    const v = ratioValue(golden);
    const steps = [base, base * v, base * v ** 2, base * v ** 3];
    expect(steps[0]).toBe(16);
    expect(steps[1]).toBeCloseTo(25.888, 2);
    expect(steps[2]).toBeCloseTo(41.888, 2);
    expect(steps[3]).toBeCloseTo(67.777, 3);
  });

  it('builds a major-third typography scale', () => {
    const majorThird = ratioValue(need('major-third'));
    const base = 16;
    const scale = [base / majorThird, base, base * majorThird, base * majorThird ** 2];
    expect(scale[0]).toBeCloseTo(12.8, 1);
    expect(scale[1]).toBe(16);
    expect(scale[2]).toBe(20);
    expect(scale[3]).toBe(25);
  });

  it('produces perfect-fifth musical intervals', () => {
    const fifth = ratioValue(need('perfect-fifth'));
    expect(440 * fifth).toBe(660);
  });
});
