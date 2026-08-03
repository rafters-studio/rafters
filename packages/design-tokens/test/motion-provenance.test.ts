import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANIMATION_DEFINITIONS,
  DEFAULT_DELAY_NAMESPACE,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_EXTENT_NAMESPACE,
  DEFAULT_KEYFRAME_DEFINITIONS,
  DEFAULT_MOTION_COMPOSITE_PRESETS,
  DEFAULT_MOTION_SEMANTIC_MAPPINGS,
  DEFAULT_PERIOD_NAMESPACE,
} from '../src/generators/defaults.js';
import { generateMotionTokens, motionNamespaceTokenName } from '../src/generators/motion.js';
import type { ResolvedSystemConfig } from '../src/generators/types.js';

const CONFIG = {
  baseTransitionDuration: 150,
  progressionRatio: 'minor-third',
} as unknown as ResolvedSystemConfig;

function emitMotion() {
  return generateMotionTokens(
    CONFIG,
    DEFAULT_DURATION_DEFINITIONS,
    DEFAULT_EASING_DEFINITIONS,
    DEFAULT_DELAY_NAMESPACE,
    DEFAULT_EXTENT_NAMESPACE,
    DEFAULT_PERIOD_NAMESPACE,
    DEFAULT_MOTION_SEMANTIC_MAPPINGS,
    DEFAULT_KEYFRAME_DEFINITIONS,
    DEFAULT_ANIMATION_DEFINITIONS,
    DEFAULT_MOTION_COMPOSITE_PRESETS,
  );
}

/**
 * Acceptance criterion 5 of #1991: every non-baseline default value carries
 * proposed provenance, never presented as measured. This is the regression
 * guard the review round found missing -- criteria 1/2/4 each got a dedicated
 * test, this one had only source-line citations. Nothing here derives values;
 * it verifies the HONESTY MARKING on values, which is the drift the provenance
 * field exists to prevent: a future entry added without its PROPOSED note is
 * indistinguishable from a measured one at the point of use.
 */

const NEW_NAMESPACES = [
  ['delay', DEFAULT_DELAY_NAMESPACE],
  ['extent', DEFAULT_EXTENT_NAMESPACE],
  ['period', DEFAULT_PERIOD_NAMESPACE],
] as const;

describe('motion value provenance (criterion 5)', () => {
  it('every proposed entry announces itself: note starts with PROPOSED', () => {
    for (const [ns, table] of NEW_NAMESPACES) {
      for (const [member, def] of Object.entries(table)) {
        if (def.provenance === 'proposed') {
          expect(
            def.note.startsWith('PROPOSED'),
            `${ns}-${member} is provenance:proposed but its note does not open with PROPOSED`,
          ).toBe(true);
        }
      }
    }
  });

  it('observed entries say what was observed, and nothing claims measured or tuned', () => {
    for (const [ns, table] of NEW_NAMESPACES) {
      for (const [member, def] of Object.entries(table)) {
        // The vocabulary is baseline | observed | proposed by construction --
        // this asserts no table entry ever smuggles a stronger claim in prose.
        expect(
          ['baseline', 'observed', 'proposed'],
          `${ns}-${member} carries an unknown provenance`,
        ).toContain(def.provenance);
        if (def.provenance === 'observed') {
          expect(
            /observ/i.test(def.note),
            `${ns}-${member} is provenance:observed but its note does not say what was observed`,
          ).toBe(true);
        }
        // Negations are honest ("observed in working code, not tuned") --
        // only a POSITIVE measured/tuned claim is the lie this guards against.
        const withoutNegations = def.note.replace(
          /\b(?:not|never|un)[- ]?(?:measured|tuned)\b/gi,
          '',
        );
        expect(
          /\b(?:measured|tuned)\b/i.test(withoutNegations),
          `${ns}-${member} note claims measured/tuned -- no knobs study has run`,
        ).toBe(false);
      }
    }
  });

  it('the provenance tag reaches every emitted namespace token description', () => {
    const tokens = emitMotion().tokens;
    const byName = new Map(tokens.map((t) => [t.name, t]));

    let checked = 0;
    for (const [ns, table] of NEW_NAMESPACES) {
      for (const [member, def] of Object.entries(table)) {
        const name = motionNamespaceTokenName(ns, member);
        const token = byName.get(name);
        expect(token, `${name} was not emitted`).toBeDefined();
        expect(token?.description ?? '', `${name} description lost its provenance tag`).toContain(
          `[provenance: ${def.provenance}]`,
        );
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
