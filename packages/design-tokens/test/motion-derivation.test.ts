import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION_DEFINITIONS } from '../src/generators/defaults.js';
import {
  BAND_ORDER,
  deriveBand,
  deriveCurve,
  deriveDuration,
  LARGE_TRAVEL_DISAGREEMENT,
  type MotionTravel,
} from '../src/generators/motion-derivation.js';

/**
 * The derivation must reproduce what ships, or the disagreement must be named.
 *
 * A derivation that quietly changes shipped values is indistinguishable from a
 * bug; one that reproduces them proves the model describes the decisions a human
 * already made. Where the model and the shipped value genuinely differ, the
 * difference is asserted explicitly rather than smoothed over.
 */

/** Shipped enter/exit mappings, with the travel each declares in prose. */
const SPATIAL: Array<{
  name: string;
  travel: MotionTravel;
  category: 'enter' | 'exit';
  ships: string;
}> = [
  { name: 'dropdown-in', travel: 'short', category: 'enter', ships: 'moderate' },
  { name: 'dropdown-out', travel: 'short', category: 'exit', ships: 'fast' },
  { name: 'modal-in', travel: 'medium', category: 'enter', ships: 'normal' },
  { name: 'modal-out', travel: 'medium', category: 'exit', ships: 'moderate' },
  { name: 'sheet-in', travel: 'large', category: 'enter', ships: 'normal' },
  { name: 'sheet-out', travel: 'large', category: 'exit', ships: 'normal' },
];

describe('band derives from travel and category', () => {
  for (const { name, travel, category, ships } of SPATIAL) {
    it(`${name} derives to its shipped band (${ships})`, () => {
      expect(deriveBand(category, travel, undefined)).toBe(ships);
    });
  }

  it('exit is one band shorter than its enter, for every non-large pair', () => {
    for (const travel of ['short', 'medium'] as MotionTravel[]) {
      const enter = deriveBand('enter', travel, undefined);
      const exit = deriveBand('exit', travel, undefined);
      expect(BAND_ORDER.indexOf(exit)).toBe(BAND_ORDER.indexOf(enter) - 1);
    }
  });

  it('the large-travel pair does NOT shorten on exit -- the documented exception', () => {
    expect(deriveBand('enter', 'large', undefined)).toBe(deriveBand('exit', 'large', undefined));
  });

  it('records the large-travel disagreement rather than resolving it silently', () => {
    // The model says slow; b864de01 says normal. Both are asserted so that
    // changing either one has to be deliberate.
    expect(LARGE_TRAVEL_DISAGREEMENT.derived).toBe('slow');
    expect(LARGE_TRAVEL_DISAGREEMENT.shipped).toBe('normal');
    expect(deriveBand('enter', 'large', undefined)).toBe(LARGE_TRAVEL_DISAGREEMENT.shipped);
  });

  it('an interaction mapping must declare its band -- it has no travel', () => {
    expect(() => deriveBand('interaction', 'none', undefined)).toThrowError(
      /must declare its band/,
    );
    expect(deriveBand('interaction', 'none', 'micro')).toBe('micro');
  });
});

describe('duration derives from band and intent', () => {
  it('efficient reproduces the shipped default for every communicative band', () => {
    // The bands that carry spatial motion. These are what a travel-driven
    // derivation actually produces, and they match byte for byte.
    const shipped: Record<string, number> = { moderate: 200, normal: 300, slow: 400 };
    for (const [band, ms] of Object.entries(shipped)) {
      expect(deriveDuration(band as never, 'efficient', DEFAULT_DURATION_DEFINITIONS)).toBe(ms);
    }
  });

  it('micro and fast do NOT sit at their band minimum -- they are perceptual landmarks', () => {
    // A near-miss that would have changed every focus ring and hover in the
    // system. `micro` ships 100 in a [50,120] band because 100ms is the Nielsen
    // instantaneous threshold, and `fast` ships 150 in [120,200] to match cursor
    // speed. Neither is "the low end of the range" -- they are fixed points that
    // happen to lie inside one.
    //
    // So intent-position does not govern the acknowledgment bands, and the
    // derivation must not be applied to them. Asserted rather than silently
    // avoided, because the failure mode is a 100ms -> 50ms shift that no test
    // would otherwise catch.
    expect(DEFAULT_DURATION_DEFINITIONS.micro?.default).toBe(100);
    expect(DEFAULT_DURATION_DEFINITIONS.micro?.range[0]).toBe(50);
    expect(DEFAULT_DURATION_DEFINITIONS.fast?.default).toBe(150);
    expect(DEFAULT_DURATION_DEFINITIONS.fast?.range[0]).toBe(120);

    // So these bands take their default verbatim rather than being interpolated,
    // and the derivation reproduces them exactly.
    expect(deriveDuration('micro', 'efficient', DEFAULT_DURATION_DEFINITIONS)).toBe(100);
    expect(deriveDuration('fast', 'efficient', DEFAULT_DURATION_DEFINITIONS)).toBe(150);

    // And no intent may move them -- a landmark is not a matter of character.
    expect(deriveDuration('micro', 'elegant', DEFAULT_DURATION_DEFINITIONS)).toBe(100);
  });

  it('elegant sits at the high end -- the measured motion-duration peak', () => {
    expect(deriveDuration('moderate', 'elegant', DEFAULT_DURATION_DEFINITIONS)).toBe(300);
    expect(deriveDuration('normal', 'elegant', DEFAULT_DURATION_DEFINITIONS)).toBe(400);
  });

  it('CHANGING INTENT MOVES DURATION -- the whole point of the epic', () => {
    const efficient = deriveDuration('moderate', 'efficient', DEFAULT_DURATION_DEFINITIONS);
    const elegant = deriveDuration('moderate', 'elegant', DEFAULT_DURATION_DEFINITIONS);
    expect(elegant).toBeGreaterThan(efficient);
  });

  it('the band clamps the intent -- character never escapes perception', () => {
    // moderate is the communicative window [200,300]. No intent may reach 400,
    // because 400 is a different perceptual band, not a stronger flavour of this one.
    const [min, max] = DEFAULT_DURATION_DEFINITIONS.moderate?.range as [number, number];
    for (const intent of ['efficient', 'elegant', 'friendly', 'technical', 'editorial'] as const) {
      const ms = deriveDuration('moderate', intent, DEFAULT_DURATION_DEFINITIONS);
      expect(ms).toBeGreaterThanOrEqual(min);
      expect(ms).toBeLessThanOrEqual(max);
    }
  });

  it('an unknown band fails loudly', () => {
    expect(() =>
      deriveDuration('communicative' as never, 'efficient', DEFAULT_DURATION_DEFINITIONS),
    ).toThrowError(/unknown band "communicative"/);
  });
});

describe('curve derives from category and travel', () => {
  it('every exit uses the exit curve -- regular across all four shipped pairs', () => {
    for (const travel of ['short', 'medium', 'large'] as MotionTravel[]) {
      expect(deriveCurve('exit', travel, 'efficient', undefined)).toBe('exit');
    }
  });

  it('enter uses the arrival curve, except large travel which settles', () => {
    expect(deriveCurve('enter', 'short', 'efficient', undefined)).toBe('enter');
    expect(deriveCurve('enter', 'medium', 'efficient', undefined)).toBe('enter');
    // sheet and page: the user must track a large surface into place.
    expect(deriveCurve('enter', 'large', 'efficient', undefined)).toBe('spring-smooth');
  });

  it('a spring is never derived for an entering or exiting element at efficient', () => {
    // 29 of 30 surveyed sites carry zero overshoot curves; spring-snappy belongs
    // to friendly. Nothing in the spatial path may resolve to it.
    for (const travel of ['none', 'short', 'medium', 'large'] as MotionTravel[]) {
      expect(deriveCurve('enter', travel, 'efficient', undefined)).not.toBe('spring-snappy');
      expect(deriveCurve('exit', travel, 'efficient', undefined)).not.toBe('spring-snappy');
    }
  });
});
