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
import type { ResolvedSystemConfig } from '../src/generators/types.js';

/**
 * An unknown duration tier or easing curve must fail the build.
 *
 * Before this guard every lookup was `if (!def) continue`, which drops the token
 * and leaves the build green. The reference survived downstream regardless: the
 * semantic path writes `motion-duration-<name>` into `dependsOn` and the exporter
 * emits `var(--duration-<name>)` unconditionally. A typo therefore produced
 * syntactically valid CSS that resolves to nothing -- the element simply does not
 * animate, and no test, lint or build step notices.
 *
 * These assert the BUILD FAILS, not that some string is absent from the output.
 * Asserting absence is what a silent skip already satisfies, so it would pass
 * against the bug.
 */

// progressionRatio is a NAME resolved against the ratio registry, not a number --
// a numeric value throws `Unknown ratio` from math-utils before the generator
// reaches any tier lookup.
const CONFIG = {
  baseTransitionDuration: 150,
  progressionRatio: 'perfect-fourth',
} as unknown as ResolvedSystemConfig;

function generate(
  overrides: {
    semantic?: typeof DEFAULT_MOTION_SEMANTIC_MAPPINGS;
    animations?: typeof DEFAULT_ANIMATION_DEFINITIONS;
    composites?: typeof DEFAULT_MOTION_COMPOSITE_PRESETS;
  } = {},
) {
  return generateMotionTokens(
    CONFIG,
    DEFAULT_DURATION_DEFINITIONS,
    DEFAULT_EASING_DEFINITIONS,
    DEFAULT_DELAY_DEFINITIONS,
    overrides.semantic ?? DEFAULT_MOTION_SEMANTIC_MAPPINGS,
    DEFAULT_KEYFRAME_DEFINITIONS,
    overrides.animations ?? DEFAULT_ANIMATION_DEFINITIONS,
    overrides.composites ?? DEFAULT_MOTION_COMPOSITE_PRESETS,
  );
}

describe('motion generator rejects unknown tier and curve names (#1977)', () => {
  it('every shipping definition resolves -- this guard lands with no value change', () => {
    expect(() => generate()).not.toThrow();
  });

  it('an unknown duration tier on a semantic mapping fails the build', () => {
    const [firstName, firstMapping] = Object.entries(DEFAULT_MOTION_SEMANTIC_MAPPINGS)[0] as [
      string,
      (typeof DEFAULT_MOTION_SEMANTIC_MAPPINGS)[string],
    ];
    const semantic = {
      ...DEFAULT_MOTION_SEMANTIC_MAPPINGS,
      [firstName]: { ...firstMapping, durationTier: 'moderat' },
    };
    expect(() => generate({ semantic })).toThrowError(/unknown duration tier "moderat"/);
  });

  it('an unknown easing curve on a semantic mapping fails the build', () => {
    const [firstName, firstMapping] = Object.entries(DEFAULT_MOTION_SEMANTIC_MAPPINGS)[0] as [
      string,
      (typeof DEFAULT_MOTION_SEMANTIC_MAPPINGS)[string],
    ];
    const semantic = {
      ...DEFAULT_MOTION_SEMANTIC_MAPPINGS,
      [firstName]: { ...firstMapping, curve: 'ease' },
    };
    expect(() => generate({ semantic })).toThrowError(/unknown easing curve "ease"/);
  });

  it('an unknown tier on a composite preset fails the build', () => {
    const [firstName, firstPreset] = Object.entries(DEFAULT_MOTION_COMPOSITE_PRESETS)[0] as [
      string,
      (typeof DEFAULT_MOTION_COMPOSITE_PRESETS)[string],
    ];
    const composites = {
      ...DEFAULT_MOTION_COMPOSITE_PRESETS,
      [firstName]: { ...firstPreset, durationTier: 'nope' },
    };
    expect(() => generate({ composites })).toThrowError(/unknown duration tier "nope"/);
  });

  it('the error names the offending definition and the known vocabulary', () => {
    const [firstName, firstMapping] = Object.entries(DEFAULT_MOTION_SEMANTIC_MAPPINGS)[0] as [
      string,
      (typeof DEFAULT_MOTION_SEMANTIC_MAPPINGS)[string],
    ];
    const semantic = {
      ...DEFAULT_MOTION_SEMANTIC_MAPPINGS,
      [firstName]: { ...firstMapping, durationTier: 'moderat' },
    };

    // The failure is nearly always a near-miss, so the fix is unguessable without
    // the vocabulary printed alongside it. Assert both halves.
    let message = '';
    try {
      generate({ semantic });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain(`semantic motion "${firstName}"`);
    for (const tier of Object.keys(DEFAULT_DURATION_DEFINITIONS)) {
      expect(message).toContain(tier);
    }
  });
});
