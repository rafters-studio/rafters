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
 * GOLDEN OUTPUT GUARD.
 *
 * The motion generator is being refactored so it RECEIVES its whole vocabulary
 * (keyframes and animations were literal arrays in the function body while every
 * other definition arrived as a parameter). A relocation must not change a single
 * emitted byte -- the only intended output change is the deletion of the broken
 * `accordion-down` / `accordion-up` pair, which interpolate
 * `var(--radix-accordion-content-height)` that nothing in this system sets.
 *
 * So this snapshot is the completeness proof: refactor, re-run, and the diff must
 * be exactly those deletions and nothing else. A relocated keyframe whose CSS
 * shifted, or an easing that moved when the legacy remap retired, shows up here.
 *
 * Read the diff. Never update this blind.
 */

const CONFIG = {
  baseTransitionDuration: 150,
  progressionRatio: 'minor-third',
} as unknown as ResolvedSystemConfig;

function emitMotion() {
  return generateMotionTokens(
    CONFIG,
    DEFAULT_DURATION_DEFINITIONS,
    DEFAULT_EASING_DEFINITIONS,
    DEFAULT_DELAY_DEFINITIONS,
    DEFAULT_MOTION_SEMANTIC_MAPPINGS,
    DEFAULT_KEYFRAME_DEFINITIONS,
    DEFAULT_ANIMATION_DEFINITIONS,
    DEFAULT_MOTION_COMPOSITE_PRESETS,
  );
}

describe('motion generator: golden output', () => {
  it('emits a stable set of token names', () => {
    const names = emitMotion()
      .tokens.map((t) => t.name)
      .sort();
    expect(names).toMatchSnapshot();
  });

  it('emits stable name -> value pairs', () => {
    const pairs = emitMotion()
      .tokens.map((t) => `${t.name} = ${String(t.value)}`)
      .sort();
    expect(pairs).toMatchSnapshot();
  });

  it('resolves the standard easing curve to its defined bezier', () => {
    // The standard curve is the intent baseline's workhorse (efficient = the
    // neutral default). It is a mild decelerate with a responsive start
    // -- cubic-bezier(0.4, 0, 0.2, 1) -- NOT the symmetric ease it once was.
    // Proven explicitly so a redefinition cannot slip through a blind snapshot
    // update; standard is referenced by var(--ease-standard) everywhere, so this
    // one token value is the whole surface the change moves.
    const standard = emitMotion().tokens.find((t) => t.name === 'motion-easing-standard');
    expect(standard?.value).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('resolves the duration tiers to the efficient-baseline defaults', () => {
    // Efficient (the neutral default intent) picks the LOW end of each
    // perceptual range -- it is a fast-running intent that lives in
    // micro/fast/moderate and rarely reaches slow. So the tier defaults are the
    // low bound of each band, not its midpoint. Proven explicitly so the
    // baseline cannot drift back to the mid-range values it once shipped.
    const byName = new Map(emitMotion().tokens.map((t) => [t.name, String(t.value)]));
    expect(byName.get('motion-duration-instant')).toBe('0ms');
    expect(byName.get('motion-duration-micro')).toBe('100ms');
    expect(byName.get('motion-duration-fast')).toBe('150ms');
    expect(byName.get('motion-duration-moderate')).toBe('200ms');
    expect(byName.get('motion-duration-normal')).toBe('300ms');
    expect(byName.get('motion-duration-slow')).toBe('400ms');
  });

  it('emits no keyframe referencing a variable this system never sets', () => {
    // The original #1899 defect. `--radix-accordion-content-height` is set by
    // Radix from JS measurement; nothing here sets it, so any keyframe
    // interpolating it animates to an undefined height in every consumer.
    const offenders = emitMotion()
      .tokens.filter((t) => String(t.value).includes('--radix-'))
      .map((t) => t.name);
    expect(offenders).toEqual([]);
  });
});
