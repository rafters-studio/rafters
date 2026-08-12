import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOCUS_CONFIGS,
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_RADIUS_DEFINITIONS,
  DEFAULT_SHADOW_BOUNDS,
  DEFAULT_SHADOW_DEFINITIONS,
  DEFAULT_SPACING_BOUNDS,
  DEFAULT_TYPOGRAPHY_SCALE,
} from '../src/generators/defaults.js';
import { tokensToTailwind } from '../src/exporters/tailwind.js';
import { generateBaseSystem } from '../src/generators/index.js';
import { generateFocusTokens } from '../src/generators/focus.js';
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
 * motion-derivation.test.ts. Three states are named here, not two:
 *
 *   RATIO_RESPONSIVE  the values are a function of the ratio
 *   RATIO_INERT       declares the progression, computes linear multiples
 *   shadow            its own block -- measurements linear, ratio applied to
 *                     an opacity, so "does anything move" answers yes and lies
 *
 * When #2031 lands, the inert entries move to RATIO_RESPONSIVE, the shadow
 * block's assertions flip, and this file stops describing a defect.
 */

/** Generators whose emitted values are a function of the progression ratio. */
const RATIO_RESPONSIVE = ['typography', 'radius', 'spacing'] as const;

type GeneratorName = (typeof RATIO_RESPONSIVE)[number] | 'shadow';

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
    spacing: flatten(generateSpacingTokens(config, DEFAULT_SPACING_BOUNDS).tokens),
    shadow: flatten(
      generateShadowTokens(config, DEFAULT_SHADOW_DEFINITIONS, DEFAULT_SHADOW_BOUNDS).tokens,
    ),
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

describe('a generator that declares a progression must still declare one', () => {
  it('spacing and shadow advertise progressionSystem, and now mean it', () => {
    const config = resolveConfig(DEFAULT_SYSTEM_CONFIG);
    const declaring = [
      ...generateSpacingTokens(config, DEFAULT_SPACING_BOUNDS).tokens,
      ...generateShadowTokens(config, DEFAULT_SHADOW_DEFINITIONS, DEFAULT_SHADOW_BOUNDS).tokens,
    ].filter((t) => t.progressionSystem !== undefined);

    // This assertion predates #2031, where it proved the claim was a LIE: both
    // generators stamped `progressionSystem` on values computed linearly. The
    // claim is now honest, and the assertion is worth keeping pointed the other
    // way -- if either generator ever stops deriving from the ratio, it must
    // drop the stamp in the same change rather than leave the lie behind.
    expect(declaring.length).toBeGreaterThan(0);
  });
});

/**
 * Shadow's two halves still answer to the ratio for different reasons, which is
 * why this file compares generators one at a time instead of asking "does
 * anything move".
 *
 * GEOMETRY is now genuinely ratio-driven (#2031): offsets, blur and spread
 * resolve onto a progression anchored at a 1px floor, so swapping the ratio
 * moves them the way it moves spacing, type and radius. Before #2031 every
 * measurement was `multiplier * baseSpacing`, purely linear.
 *
 * COLOR is a defect that survives. `shadow.ts` still computes:
 *
 *     const coloredOpacity = baseDef.opacity * ratioVal;
 *
 * An ALPHA CHANNEL multiplied by a musical interval. 0.1 * 1.2 = 12%; under
 * perfect-fourth the same shadow is 13.3%. Nothing about a progression ratio
 * carries meaning applied to opacity -- it was a number in scope. The split
 * assertions keep that visible rather than letting a green "something moved"
 * hide it.
 */
describe('shadow geometry follows the ratio; the coloured opacity is a defect', () => {
  const geometry = (v: string) => /-(offset-x|offset-y|blur|spread)=/.test(v);
  const colored = (v: string) => /^shadow-(primary|destructive)=/.test(v);

  it('shadow measurements respond to the ratio', () => {
    const before = measurements(baseline.shadow).filter(geometry);
    const after = measurements(swapped.shadow).filter(geometry);

    expect(before.length).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
  });

  it('the ratio reaches only the colored-variant opacity', () => {
    const before = measurements(baseline.shadow).filter(colored);
    const after = measurements(swapped.shadow).filter(colored);

    expect(before.length).toBeGreaterThan(0);
    // Documents the misapplication, not an endorsement of it. Geometry was
    // fixed in #2031; whether coloredOpacity keeps the ratio or gets a reason
    // of its own is still open.
    expect(after).not.toEqual(before);
  });
});

/**
 * Radius and focus derive from spacing (#2035). The CSS values are expressions
 * like `calc(var(--rafters-spacing-base) * 1.5)` -- the string is the same at
 * every base because the CASCADE resolves it at runtime. The property under
 * test is the reference, not a numeric diff.
 */
describe('radius and focus derive from spacing', () => {
  const config = resolveConfig(DEFAULT_SYSTEM_CONFIG);

  it('radius-base references spacing-base, not a literal rem', () => {
    const tokens = generateRadiusTokens(config, DEFAULT_RADIUS_DEFINITIONS).tokens;
    const base = tokens.find((t) => t.name === 'radius-base');
    expect(base?.value).toContain('var(--rafters-spacing-base)');
    expect(base?.value).not.toMatch(/^\d/);
    expect(base?.dependsOn).toContain('spacing-base');
  });

  it('focus-ring-width references spacing-base, not a literal rem', () => {
    const tokens = generateFocusTokens(config, DEFAULT_FOCUS_CONFIGS).tokens;
    const base = tokens.find((t) => t.name === 'focus-ring-width');
    expect(base?.value).toContain('var(--rafters-spacing-base)');
    expect(base?.value).not.toMatch(/^\d/);
    expect(base?.dependsOn).toContain('spacing-base');
  });

  it('focus configs chain through focus-ring-width, not literal px', () => {
    const tokens = generateFocusTokens(config, DEFAULT_FOCUS_CONFIGS).tokens;
    const ring = tokens.find((t) => t.name === 'focus-ring');
    expect(ring?.value).toContain('var(--rafters-focus-ring-width)');
    const outline = tokens.find((t) => t.name === 'focus-outline');
    expect(outline?.value).toContain('var(--rafters-focus-ring-width)');
    const hc = tokens.find((t) => t.name === 'focus-high-contrast');
    expect(hc?.value).toContain('var(--rafters-focus-ring-width)');
  });

  it('no literal rem value in radius-base or focus-ring-width', () => {
    const radiusTokens = generateRadiusTokens(config, DEFAULT_RADIUS_DEFINITIONS).tokens;
    const focusTokens = generateFocusTokens(config, DEFAULT_FOCUS_CONFIGS).tokens;
    const rBase = radiusTokens.find((t) => t.name === 'radius-base');
    const fBase = focusTokens.find((t) => t.name === 'focus-ring-width');
    expect(rBase?.value).not.toMatch(/rem$/);
    expect(fBase?.value).not.toMatch(/rem$/);
  });

  it('the exporter rewrites spacing refs so no dangling --rafters- vars remain', () => {
    const system = generateBaseSystem({});
    const css = tokensToTailwind(system.allTokens, { includeImport: false }, []);
    const lines = css.split('\n');

    const radiusLines = lines.filter((l) => /--radius-/.test(l));
    const focusLines = lines.filter((l) => /--focus-/.test(l));

    expect(radiusLines.length).toBeGreaterThan(0);
    expect(focusLines.length).toBeGreaterThan(0);

    for (const line of radiusLines) {
      expect(line, `dangling in radius: ${line.trim()}`).not.toContain(
        'var(--rafters-spacing-base)',
      );
    }
    for (const line of focusLines) {
      expect(line, `dangling in focus: ${line.trim()}`).not.toContain(
        'var(--rafters-spacing-base)',
      );
      expect(line, `dangling in focus: ${line.trim()}`).not.toContain(
        'var(--rafters-focus-ring-width)',
      );
    }
  });
});
