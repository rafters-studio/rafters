import { describe, expect, it } from 'vitest';
import { DEFAULT_DURATION_DEFINITIONS } from '../src/generators/defaults.js';
import { MOTION_DURATION_SCALE } from '../src/generators/types.js';

/**
 * Duration tiers are perceptual RANGES a designer picks within, not constants
 * (docs/MOTION.md). These guard the two properties that make that safe:
 *
 * 1. REGRESSION -- the defaults are the efficient-baseline values (efficient is
 *    the neutral default intent), and the neutral intent emits them verbatim.
 *    If one changes, a consumer's motion changed and someone should have said so.
 * 2. COHERENCE -- every default lies inside its own range, the bands do not
 *    overlap downward into the communicative window, and the ceiling holds.
 */

/**
 * The efficient-baseline defaults, BANDED: 150 -> 250 -> 350 -> 500, gaps of
 * 100, 100 and 150. The gaps are the point -- two adjacent tiers have to be
 * tellable apart or the vocabulary has more words than it has ideas.
 *
 * These are NOT the low end of each range. The flat 200/300/400 ladder that
 * shipped between b864de01 and #1991 was band minimums arriving through the
 * derivation, and it read as deliberate because the defaults had been edited
 * down to match. Do not "fix" these -- a change here is a change to what every
 * project ships at neutral intent.
 */
const EFFICIENT_DEFAULTS: Record<string, number> = {
  instant: 0,
  micro: 100,
  fast: 150,
  moderate: 250,
  normal: 350,
  slow: 500,
};

describe('duration tiers: regression', () => {
  it('every default equals the efficient-baseline value', () => {
    for (const [tier, expected] of Object.entries(EFFICIENT_DEFAULTS)) {
      const def = DEFAULT_DURATION_DEFINITIONS[tier];
      expect(def, `tier "${tier}" is missing`).toBeDefined();
      expect(def?.default, `tier "${tier}" default moved`).toBe(expected);
    }
  });

  it('covers every tier in the scale, and adds none', () => {
    expect(Object.keys(DEFAULT_DURATION_DEFINITIONS).sort()).toEqual(
      [...MOTION_DURATION_SCALE].sort(),
    );
  });
});

describe('duration tiers: coherence', () => {
  it('every default lies inside its own range', () => {
    for (const tier of MOTION_DURATION_SCALE) {
      const def = DEFAULT_DURATION_DEFINITIONS[tier];
      if (!def) continue;
      const [min, max] = def.range;
      expect(def.default, `tier "${tier}" default is outside its range`).toBeGreaterThanOrEqual(
        min,
      );
      expect(def.default, `tier "${tier}" default is outside its range`).toBeLessThanOrEqual(max);
    }
  });

  it('every range is well-formed (min <= max)', () => {
    for (const tier of MOTION_DURATION_SCALE) {
      const def = DEFAULT_DURATION_DEFINITIONS[tier];
      if (!def) continue;
      const [min, max] = def.range;
      expect(min, `tier "${tier}" has an inverted range`).toBeLessThanOrEqual(max);
    }
  });

  it('instant is fixed at zero -- it is the null case, not a band', () => {
    expect(DEFAULT_DURATION_DEFINITIONS.instant?.range).toEqual([0, 0]);
    expect(DEFAULT_DURATION_DEFINITIONS.instant?.default).toBe(0);
  });

  it('ranges ascend without overlapping, so tiers stay distinguishable', () => {
    // Skip `instant` -- a fixed [0,0] point, not a band.
    const banded = MOTION_DURATION_SCALE.filter((t) => t !== 'instant');
    for (let i = 1; i < banded.length; i++) {
      const prevTier = banded[i - 1];
      const tier = banded[i];
      if (!prevTier || !tier) continue;
      const prev = DEFAULT_DURATION_DEFINITIONS[prevTier];
      const curr = DEFAULT_DURATION_DEFINITIONS[tier];
      if (!prev || !curr) continue;
      expect(
        curr.range[0],
        `"${tier}" overlaps "${prevTier}" -- a value would sit in two tiers`,
      ).toBeGreaterThanOrEqual(prev.range[1]);
    }
  });

  it('no tier is reachable past the 500ms sluggish ceiling', () => {
    // docs/MOTION.md: over ~500ms reads as sluggish. `slow` tops out there and
    // Studio cannot pick past it; 700ms remains the why-gated absolute.
    for (const tier of MOTION_DURATION_SCALE) {
      const def = DEFAULT_DURATION_DEFINITIONS[tier];
      if (!def) continue;
      expect(def.range[1], `tier "${tier}" can exceed the ceiling`).toBeLessThanOrEqual(500);
    }
  });

  it('nothing below moderate reaches into the communicative window', () => {
    // Acknowledgment tiers must stay under ~200ms or they stop reading as
    // acknowledgment -- the reason the ranges do not overlap downward.
    for (const tier of ['micro', 'fast'] as const) {
      const def = DEFAULT_DURATION_DEFINITIONS[tier];
      expect(def?.range[1], `"${tier}" reaches into the communicative window`).toBeLessThanOrEqual(
        200,
      );
    }
  });
});
