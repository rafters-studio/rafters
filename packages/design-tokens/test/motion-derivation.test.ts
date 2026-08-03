import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANIMATION_DEFINITIONS,
  DEFAULT_DELAY_DEFINITIONS,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_KEYFRAME_DEFINITIONS,
  DEFAULT_MOTION_COMPOSITE_PRESETS,
  DEFAULT_MOTION_SEMANTIC_MAPPINGS,
} from '../src/generators/defaults.js';
import { generateMotionTokens } from '../src/generators/motion.js';
import {
  BAND_ORDER,
  deriveBand,
  deriveCurve,
  deriveDuration,
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
  { name: 'sheet-out', travel: 'large', category: 'exit', ships: 'moderate' },
];

describe('band derives from travel and category', () => {
  for (const { name, travel, category, ships } of SPATIAL) {
    it(`${name} derives to its shipped band (${ships})`, () => {
      expect(deriveBand(category, travel, undefined)).toBe(ships);
    });
  }

  it('exit is one band shorter than its enter, for every non-large pair', () => {
    for (const travel of ['short', 'medium', 'large'] as MotionTravel[]) {
      const enter = deriveBand('enter', travel, undefined);
      const exit = deriveBand('exit', travel, undefined);
      expect(BAND_ORDER.indexOf(exit)).toBe(BAND_ORDER.indexOf(enter) - 1);
    }
  });

  it('exit shortens for EVERY pair, large travel included -- no exceptions', () => {
    // The agreed matrix states the rule without qualification. An earlier pass
    // carved out a large-travel exception by reading b864de01 as the rule; the
    // matrix's drift table records that commit as the drift instead.
    for (const travel of ['short', 'medium', 'large'] as MotionTravel[]) {
      const enter = deriveBand('enter', travel, undefined);
      const exit = deriveBand('exit', travel, undefined);
      expect(BAND_ORDER.indexOf(exit)).toBe(BAND_ORDER.indexOf(enter) - 1);
    }
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
    const shipped: Record<string, number> = { moderate: 250, normal: 350, slow: 500 };
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

  it('an unresearched intent falls back to the neutral band default', () => {
    // elegant's row is empty on purpose. The study established the DIRECTION
    // (motion-duration peaks at elegant) but never a value, so it inherits the
    // neutral baseline rather than a number somebody invented.
    expect(deriveDuration('moderate', 'elegant', DEFAULT_DURATION_DEFINITIONS)).toBe(250);
  });

  it('A DESIGNER-SUPPLIED STARTING POINT MOVES DURATION -- the point of the epic', () => {
    // The matrix is a designer input. Supplying a row is the whole mechanism;
    // the shipped rows are seed data, not the feature.
    const custom = { elegant: { moderate: 300 } };
    expect(deriveDuration('moderate', 'elegant', DEFAULT_DURATION_DEFINITIONS, custom)).toBe(300);
    expect(deriveDuration('moderate', 'efficient', DEFAULT_DURATION_DEFINITIONS, custom)).toBe(250);
  });

  it('the band clamps the intent -- character never escapes perception', () => {
    // moderate is the communicative window [200,300]. No intent may reach 400,
    // because 400 is a different perceptual band, not a stronger flavour of this one.
    const [min, max] = DEFAULT_DURATION_DEFINITIONS.moderate?.range as [number, number];
    // Including a designer who asks for something outside the window: the band
    // is a fact about perception, so it clamps rather than obeys.
    const absurd = { elegant: { moderate: 5000 }, technical: { moderate: 1 } };
    for (const intent of ['efficient', 'elegant', 'friendly', 'technical', 'editorial'] as const) {
      const ms = deriveDuration('moderate', intent, DEFAULT_DURATION_DEFINITIONS, absurd);
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

describe('end to end: changing intent moves the emitted tokens (epic #1973)', () => {
  function semanticFor(intent: string) {
    const result = generateMotionTokens(
      { baseTransitionDuration: 150, progressionRatio: 'perfect-fourth', intent } as never,
      DEFAULT_DURATION_DEFINITIONS,
      DEFAULT_EASING_DEFINITIONS,
      DEFAULT_DELAY_DEFINITIONS,
      DEFAULT_MOTION_SEMANTIC_MAPPINGS,
      DEFAULT_KEYFRAME_DEFINITIONS,
      DEFAULT_ANIMATION_DEFINITIONS,
      DEFAULT_MOTION_COMPOSITE_PRESETS,
    );
    const out = new Map<string, string>();
    for (const t of result.tokens) {
      if (!t.name.startsWith('motion-semantic-')) continue;
      const spec = JSON.parse(t.value as string) as { durationTier: string; curve: string };
      out.set(t.name, `${spec.durationTier}/${spec.curve}`);
    }
    return out;
  }

  it('no mapping names a tier or a curve any more -- there is nowhere left to bake a choice', () => {
    for (const [name, mapping] of Object.entries(DEFAULT_MOTION_SEMANTIC_MAPPINGS)) {
      if (mapping.category === 'interaction') continue;
      expect(mapping.band, `${name} still declares a band`).toBeUndefined();
      expect(mapping.curve, `${name} still declares a curve`).toBeUndefined();
    }
  });

  it('the derived output is identical to what shipped, for all 13', () => {
    // The golden test guards the emitted CSS; this guards the token spec itself.
    expect(semanticFor('efficient')).toMatchInlineSnapshot(`
      Map {
        "motion-semantic-hover" => "fast/standard",
        "motion-semantic-focus" => "micro/linear",
        "motion-semantic-press" => "micro/spring-snappy",
        "motion-semantic-toggle" => "moderate/standard",
        "motion-semantic-dropdown-in" => "moderate/enter",
        "motion-semantic-dropdown-out" => "fast/exit",
        "motion-semantic-modal-in" => "normal/enter",
        "motion-semantic-modal-out" => "moderate/exit",
        "motion-semantic-sheet-in" => "normal/spring-smooth",
        "motion-semantic-sheet-out" => "moderate/exit",
        "motion-semantic-expand" => "normal/enter",
        "motion-semantic-collapse" => "moderate/exit",
        "motion-semantic-page" => "normal/spring-smooth",
      }
    `);
  });
});

describe('the epic condition: a designer changes intent and motion moves', () => {
  function durationsFor(intent: string) {
    const result = generateMotionTokens(
      { baseTransitionDuration: 150, progressionRatio: 'perfect-fourth', intent } as never,
      DEFAULT_DURATION_DEFINITIONS,
      DEFAULT_EASING_DEFINITIONS,
      DEFAULT_DELAY_DEFINITIONS,
      DEFAULT_MOTION_SEMANTIC_MAPPINGS,
      DEFAULT_KEYFRAME_DEFINITIONS,
      DEFAULT_ANIMATION_DEFINITIONS,
      DEFAULT_MOTION_COMPOSITE_PRESETS,
    );
    const out: Record<string, string> = {};
    for (const t of result.tokens) {
      if (t.name.startsWith('motion-duration-')) out[t.name] = t.value as string;
    }
    return out;
  }

  it('efficient emits exactly the values that ship today', () => {
    const d = durationsFor('efficient');
    expect(d['motion-duration-micro']).toBe('100ms');
    expect(d['motion-duration-fast']).toBe('150ms');
    expect(d['motion-duration-moderate']).toBe('250ms');
    expect(d['motion-duration-normal']).toBe('350ms');
    expect(d['motion-duration-slow']).toBe('500ms');
  });

  it('the four unstudied intents emit the neutral baseline, not invented values', () => {
    // Honest state of the data: only efficient has a researched row. The others
    // are empty and therefore identical to neutral. That is a gap in the RESEARCH,
    // not in the mechanism -- the previous test proves a supplied row moves.
    for (const intent of ['elegant', 'friendly', 'technical', 'editorial']) {
      expect(durationsFor(intent)['motion-duration-moderate']).toBe('250ms');
    }
  });

  it('the acknowledgment landmarks do not move -- perception is not a matter of taste', () => {
    // micro is the Nielsen threshold and fast matches cursor speed. An intent
    // may not restyle a perceptual constant.
    expect(durationsFor('elegant')['motion-duration-micro']).toBe('100ms');
    expect(durationsFor('elegant')['motion-duration-fast']).toBe('150ms');
  });
});
