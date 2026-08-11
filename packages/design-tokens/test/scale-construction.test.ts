import { ratioValue, resolveRatio } from '@rafters/math-utils';
import { describe, expect, it } from 'vitest';
import { shadowScale } from '../src/generators/shadow.js';
import { spacingMultipliers } from '../src/generators/spacing.js';

/**
 * How a scale is CONSTRUCTED, asserted as properties rather than numbers.
 *
 * The rules below are operator rulings, not arithmetic -- the maths would
 * happily emit a negative position or a 4.25 multiplier, and did. They are
 * pinned here because the next person to touch the generator will be reasoning
 * about values, and these constrain the shape the values are allowed to take.
 *
 * Nothing here asserts a specific rung. A test that pins `spacing-4` to 16px
 * passes whether or not the ratio is connected to anything, which is exactly
 * how the #384 regression survived two years and 85 green tests.
 */

const RATIOS = ['minor-second', 'major-second', 'minor-third', 'major-third', 'perfect-fourth'];
const BASES = [2, 4, 8];

const val = (name: string) => ratioValue(resolveRatio(name));

describe('spacing scale construction', () => {
  for (const name of RATIOS) {
    for (const base of BASES) {
      describe(`${name} at base ${base}`, () => {
        const scale = spacingMultipliers(base, val(name));

        it('starts at position 0, which is the base itself', () => {
          expect(scale[0]).toBe(1);
        });

        it('has no position below the floor', () => {
          // The ruling: the base is the floor, not the middle of a range. A
          // step below it is a value smaller than the unit everything is built
          // from, and it cannot mean anything.
          expect(scale.every((m) => m >= 1)).toBe(true);
        });

        it('emits integer multipliers only', () => {
          // Rounding the pixel and dividing back out manufactures quarters --
          // 17px on a 4px base is 4.25, and `spacing-4.25` breaks anything
          // reading a token name as a number.
          expect(scale.every((m) => Number.isInteger(m))).toBe(true);
        });

        it('ascends strictly, with no rung offered twice', () => {
          for (let i = 1; i < scale.length; i++) {
            expect(scale[i]).toBeGreaterThan(scale[i - 1] as number);
          }
          expect(new Set(scale).size).toBe(scale.length);
        });

        it('emits more than one rung', () => {
          expect(scale.length).toBeGreaterThan(1);
        });
      });
    }
  }

  it('a wider ratio never yields more rungs than a tighter one', () => {
    const counts = RATIOS.map((n) => spacingMultipliers(4, val(n)).length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1] as number);
    }
  });

  it('changing the ratio changes the scale', () => {
    // The property the whole of #2031 exists to restore.
    expect(spacingMultipliers(4, val('minor-third'))).not.toEqual(
      spacingMultipliers(4, val('perfect-fourth')),
    );
  });

  it('survives a degenerate ratio instead of hanging', () => {
    // A ratio of 1 would step forever without ever passing the ceiling.
    expect(spacingMultipliers(4, 1)).toEqual([1]);
    expect(spacingMultipliers(4, 0.5)).toEqual([1]);
  });
});

describe('shadow scale construction', () => {
  for (const name of RATIOS) {
    describe(name, () => {
      const scale = shadowScale(val(name));

      it('floors at 1px, because a thinner blur does not render', () => {
        expect(scale[0]).toBe(1);
        expect(scale.every((px) => px >= 1)).toBe(true);
      });

      it('emits whole pixels, ascending, no duplicates', () => {
        expect(scale.every((px) => Number.isInteger(px))).toBe(true);
        for (let i = 1; i < scale.length; i++) {
          expect(scale[i]).toBeGreaterThan(scale[i - 1] as number);
        }
        expect(new Set(scale).size).toBe(scale.length);
      });
    });
  }

  it('starts below the spacing floor, and that is the point', () => {
    // Shadow is not spacing. Anchoring it at the 4px spacing floor would make
    // the smallest shadow heavier than the default one is today.
    const shadow = shadowScale(val('minor-third'));
    const spacing = spacingMultipliers(4, val('minor-third')).map((m) => m * 4);
    expect(shadow[0]).toBeLessThan(spacing[0] as number);
  });

  it('changing the ratio changes the scale', () => {
    expect(shadowScale(val('minor-third'))).not.toEqual(shadowScale(val('perfect-fourth')));
  });

  it('survives a degenerate ratio instead of hanging', () => {
    expect(shadowScale(1)).toEqual([1]);
  });
});
