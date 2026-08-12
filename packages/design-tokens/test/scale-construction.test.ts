import { ratioValue, resolveRatio } from '@rafters/math-utils';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_SHADOW_BOUNDS,
  DEFAULT_SPACING_BOUNDS,
  DEFAULT_TYPOGRAPHY_SCALE,
} from '../src/generators/defaults.js';
import { DEFAULT_SYSTEM_CONFIG, PURE_MATH_CONFIG, resolveConfig } from '../src/generators/types.js';
import { generateTypographyTokens } from '../src/generators/typography.js';
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
        const scale = spacingMultipliers(val(name), {
          floor: 1,
          ceiling: DEFAULT_SPACING_BOUNDS.ceiling / base,
        });

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
    const counts = RATIOS.map((n) => spacingMultipliers(val(n), DEFAULT_SPACING_BOUNDS).length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1] as number);
    }
  });

  it('changing the ratio changes the scale', () => {
    // The property the whole of #2031 exists to restore.
    expect(spacingMultipliers(val('minor-third'), DEFAULT_SPACING_BOUNDS)).not.toEqual(
      spacingMultipliers(val('perfect-fourth'), DEFAULT_SPACING_BOUNDS),
    );
  });

  it('survives a degenerate ratio instead of hanging', () => {
    // A ratio of 1 would step forever without ever passing the ceiling.
    expect(spacingMultipliers(1, DEFAULT_SPACING_BOUNDS)).toEqual([1]);
    expect(spacingMultipliers(0.5, DEFAULT_SPACING_BOUNDS)).toEqual([1]);
  });
});

describe('shadow scale construction', () => {
  for (const name of RATIOS) {
    describe(name, () => {
      const scale = shadowScale(val(name), DEFAULT_SHADOW_BOUNDS);

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
    const shadow = shadowScale(val('minor-third'), DEFAULT_SHADOW_BOUNDS);
    const spacing = spacingMultipliers(val('minor-third'), DEFAULT_SPACING_BOUNDS).map(
      (m) => m * 4,
    );
    expect(shadow[0]).toBeLessThan(spacing[0] as number);
  });

  it('changing the ratio changes the scale', () => {
    expect(shadowScale(val('minor-third'), DEFAULT_SHADOW_BOUNDS)).not.toEqual(
      shadowScale(val('perfect-fourth'), DEFAULT_SHADOW_BOUNDS),
    );
  });

  it('survives a degenerate ratio instead of hanging', () => {
    expect(shadowScale(1, DEFAULT_SHADOW_BOUNDS)).toEqual([1]);
  });
});

/**
 * PURE_MATH_CONFIG has to be observable, or it is decoration.
 *
 * After #2035 only TWO pins remain: baseFontSize and baseTransitionDuration.
 * Radius and focus derive from baseSpacingUnit unconditionally in both configs,
 * so their pins were removed -- they hid the derivation at base 4.
 */
describe('PURE_MATH_CONFIG is not decorative', () => {
  const pure = resolveConfig(PURE_MATH_CONFIG);
  const pinned = resolveConfig(DEFAULT_SYSTEM_CONFIG);

  const flatten = (tokens: readonly { name: string; value: unknown }[]) =>
    tokens.map((t) => `${t.name}=${JSON.stringify(t.value)}`).sort();

  it('resolves different anchors from the same base', () => {
    // Two pins remain: baseFontSize and baseTransitionDuration. Radius and
    // focus derive from baseSpacingUnit in both configs (#2035).
    const movedPure = resolveConfig({ ...PURE_MATH_CONFIG, baseSpacingUnit: 6 });
    const movedPinned = resolveConfig({ ...DEFAULT_SYSTEM_CONFIG, baseSpacingUnit: 6 });

    expect(movedPure.baseFontSize).not.toBe(movedPinned.baseFontSize);
    expect(movedPure.baseTransitionDuration).not.toBe(movedPinned.baseTransitionDuration);
    // Radius and focus agree because neither config pins them anymore.
    expect(movedPure.baseRadius).toBe(movedPinned.baseRadius);
    expect(movedPure.focusRingWidth).toBe(movedPinned.focusRingWidth);
  });

  it('changes typography output once the base moves', () => {
    const pureAt6 = resolveConfig({ ...PURE_MATH_CONFIG, baseSpacingUnit: 6 });
    const pinnedAt6 = resolveConfig({ ...DEFAULT_SYSTEM_CONFIG, baseSpacingUnit: 6 });

    expect(
      flatten(
        generateTypographyTokens(pureAt6, DEFAULT_TYPOGRAPHY_SCALE, DEFAULT_FONT_WEIGHTS).tokens,
      ),
    ).not.toEqual(
      flatten(
        generateTypographyTokens(pinnedAt6, DEFAULT_TYPOGRAPHY_SCALE, DEFAULT_FONT_WEIGHTS).tokens,
      ),
    );
  });

  it('radius and focus move together with the base in both configs', () => {
    const at4 = resolveConfig({ ...DEFAULT_SYSTEM_CONFIG, baseSpacingUnit: 4 });
    const at6 = resolveConfig({ ...DEFAULT_SYSTEM_CONFIG, baseSpacingUnit: 6 });

    expect(at4.baseRadius).not.toBe(at6.baseRadius);
    expect(at4.focusRingWidth).not.toBe(at6.focusRingWidth);
    expect(at6.baseRadius).toBe(6 * 1.5);
    expect(at6.focusRingWidth).toBe(6 / 2);
  });

  it('leaves spacing alone, because spacing reads neither pin', () => {
    expect(pure.baseSpacingUnit).toBe(pinned.baseSpacingUnit);
    expect(pure.progressionRatio).toBe(pinned.progressionRatio);
  });
});
