import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_RADIUS_DEFINITIONS,
  DEFAULT_SHADOW_DEFINITIONS,
  DEFAULT_SPACING_MULTIPLIERS,
  DEFAULT_TYPOGRAPHY_SCALE,
} from '../src/generators/defaults.js';
import { generateRadiusTokens } from '../src/generators/radius.js';
import { generateShadowTokens } from '../src/generators/shadow.js';
import { generateSpacingTokens } from '../src/generators/spacing.js';
import { DEFAULT_SYSTEM_CONFIG, resolveConfig } from '../src/generators/types.js';
import { generateTypographyTokens } from '../src/generators/typography.js';

/**
 * The progression property.
 *
 * A generator that declares `progressionSystem` is claiming its values are a
 * function of the ratio. That claim is only meaningful if changing the ratio
 * changes the values. This test asserts the property itself, never the numbers --
 * a test pinned to `4 * N` passes whether or not the ratio is connected to
 * anything, which is exactly how the spacing regression survived two years and
 * 85 tests advertised as "covering mathematical relationships" (#2031).
 *
 * Where a generator declares the progression and does not use it, the
 * disagreement is asserted explicitly rather than smoothed over, following
 * motion-derivation.test.ts. RATIO_INERT is the regression, named, with a
 * failing-on-purpose flip waiting in #2031: when spacing and shadow derive,
 * they move to RATIO_RESPONSIVE and this file stops describing a defect.
 */

/** Generators whose emitted values are a function of the progression ratio. */
const RATIO_RESPONSIVE = ['typography', 'radius'] as const;

/**
 * Declares `progressionSystem` on every token, computes `baseSpacingUnit *
 * multiplier`. The geometric sequence at spacing.ts:29 is computed and used only
 * to fill a metadata `sample` field. Regression, tracked by #2031.
 */
const RATIO_INERT = ['spacing'] as const;

type GeneratorName = (typeof RATIO_RESPONSIVE)[number] | (typeof RATIO_INERT)[number] | 'shadow';

/** Emit each generator's token values under a given progression ratio. */
function valuesUnder(ratio: string): Record<GeneratorName, string[]> {
  const config = resolveConfig({ ...DEFAULT_SYSTEM_CONFIG, progressionRatio: ratio });
  const flatten = (tokens: readonly { name: string; value: unknown }[]): string[] =>
    tokens.map((t) => `${t.name}=${JSON.stringify(t.value)}`).sort();

  return {
    typography: flatten(
      generateTypographyTokens(config, DEFAULT_TYPOGRAPHY_SCALE, DEFAULT_FONT_WEIGHTS).tokens,
    ),
    radius: flatten(generateRadiusTokens(config, DEFAULT_RADIUS_DEFINITIONS).tokens),
    spacing: flatten(generateSpacingTokens(config, DEFAULT_SPACING_MULTIPLIERS).tokens),
    shadow: flatten(generateShadowTokens(config, DEFAULT_SHADOW_DEFINITIONS).tokens),
  };
}

/**
 * Two ratios far enough apart that no rounding could coincide: minor-third
 * (6:5) is the default, perfect-fourth (4:3) is a different named interval.
 */
const baseline = valuesUnder('minor-third');
const swapped = valuesUnder('perfect-fourth');

/**
 * Metadata tokens embed the ratio name in their value, so they differ under a
 * ratio swap even when no measurement moved. Comparing them would let an inert
 * generator pass on the strength of its own claim. Drop them.
 */
function measurements(values: string[]): string[] {
  return values.filter(
    (v) => !v.startsWith('spacing-progression=') && !v.includes('-progression='),
  );
}

describe('the progression ratio drives the values that claim it', () => {
  for (const name of RATIO_RESPONSIVE) {
    it(`${name}: swapping the ratio moves the emitted values`, () => {
      const before = measurements(baseline[name]);
      const after = measurements(swapped[name]);

      expect(before.length, `${name} emitted no measurements`).toBeGreaterThan(0);
      expect(after).not.toEqual(before);
    });
  }
});

describe('REGRESSION #2031 -- generators that declare the progression and ignore it', () => {
  for (const name of RATIO_INERT) {
    it(`${name}: swapping the ratio changes nothing (this is the defect)`, () => {
      const before = measurements(baseline[name]);
      const after = measurements(swapped[name]);

      expect(before.length, `${name} emitted no measurements`).toBeGreaterThan(0);
      // Flip to .not.toEqual when #2031 lands and move `name` to RATIO_RESPONSIVE.
      expect(after).toEqual(before);
    });
  }

  it('every inert generator still advertises a progressionSystem on its tokens', () => {
    const config = resolveConfig(DEFAULT_SYSTEM_CONFIG);
    const declaring = [
      ...generateSpacingTokens(config, DEFAULT_SPACING_MULTIPLIERS).tokens,
      ...generateShadowTokens(config, DEFAULT_SHADOW_DEFINITIONS).tokens,
    ].filter((t) => t.progressionSystem !== undefined);

    // The claim is what makes the inertness a lie rather than a design choice.
    // When #2031 lands this stays true and becomes honest; if instead the claim
    // is retired (motion's route), this assertion is what forces the decision to
    // be explicit rather than silent.
    expect(declaring.length).toBeGreaterThan(0);
  });
});

/**
 * Shadow is neither responsive nor inert -- it is a false positive waiting to
 * happen, and the reason this file compares generators one at a time instead of
 * asking "does anything move".
 *
 * Every shadow MEASUREMENT is linear: `multiplier * baseSpacing` via scalePx.
 * The ratio reaches exactly one value, `shadow.ts:193`:
 *
 *     const coloredOpacity = baseDef.opacity * ratioVal;
 *
 * An ALPHA CHANNEL multiplied by a musical interval. 0.1 * 1.2 = 12%; under
 * perfect-fourth the same shadow is 13.3%. Nothing about a progression ratio
 * carries meaning applied to opacity -- it was a number in scope. So a naive
 * "swapping the ratio changes something" test passes shadow and hides that all
 * of its geometry is linear, which is why the assertions below are split.
 */
describe('REGRESSION #2031 -- shadow geometry is linear; the ratio only tints', () => {
  const geometry = (v: string) => /-(offset-x|offset-y|blur|spread)=/.test(v);
  const colored = (v: string) => /^shadow-(primary|destructive)=/.test(v);

  it('no shadow measurement responds to the ratio', () => {
    const before = measurements(baseline.shadow).filter(geometry);
    const after = measurements(swapped.shadow).filter(geometry);

    expect(before.length).toBeGreaterThan(0);
    // Flip to .not.toEqual when #2031 lands.
    expect(after).toEqual(before);
  });

  it('the ratio reaches only the colored-variant opacity', () => {
    const before = measurements(baseline.shadow).filter(colored);
    const after = measurements(swapped.shadow).filter(colored);

    expect(before.length).toBeGreaterThan(0);
    // Documents the misapplication, not an endorsement of it. #2031 decides
    // whether coloredOpacity keeps the ratio or gets a reason of its own.
    expect(after).not.toEqual(before);
  });
});
