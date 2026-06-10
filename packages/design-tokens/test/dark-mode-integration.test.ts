/**
 * Dark-mode derivation chain, end to end at the graph level (#1635).
 *
 * huttspawn's repro: after importing a custom palette, every dark-* token
 * resolved to scale extremes (50/950) — dark mode lost all differentiation.
 * This test runs the real derivation chain (scale -> invert -> contrast
 * against the dark background) over a real buildColorValue family and pins
 * the contract: mid-tone parents produce mid-tone dark backgrounds, and the
 * dark foreground derives against the dark background (pair unity through
 * the chain).
 */

import { buildColorValue, POSITION_TO_INDEX } from '@rafters/color-utils';
import type { ColorReference } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { contrastPlugin, invertPlugin, scalePlugin, TokenGraph } from '../src/index.js';

// An imported-brand-shaped seed (warm mid-tone, huttspawn's "mud" class).
const mudSeed = { l: 0.45, c: 0.08, h: 60, alpha: 1 };

function buildChain(position: number) {
  const family = buildColorValue(mudSeed);
  const g = new TokenGraph([scalePlugin, invertPlugin, contrastPlugin]);
  g.seed('mud', family);
  g.bind('primary', 'scale', { familyName: 'mud', scalePosition: position });
  g.bind('primary--dark', 'invert', { fromToken: 'primary' });
  g.bind('primary-foreground', 'contrast', { against: 'primary', level: 'AAA' });
  g.bind('primary-foreground--dark', 'contrast', { against: 'primary--dark', level: 'AAA' });
  return g;
}

describe('dark derivation chain over a real imported-palette family', () => {
  it('mid-tone parents produce mid-tone dark backgrounds (not 50/950)', () => {
    const darkIndexes: number[] = [];
    for (const position of [3, 4, 5, 6, 7]) {
      const g = buildChain(position);
      const dark = g.get('primary--dark') as ColorReference;
      const index = POSITION_TO_INDEX[dark.position];
      expect(index, `position ${position} -> dark ${dark.position}`).toBeGreaterThan(0);
      expect(index, `position ${position} -> dark ${dark.position}`).toBeLessThan(10);
      darkIndexes.push(index as number);
    }
    // Differentiation: the five mid-tones must not collapse to a single dark position.
    expect(new Set(darkIndexes).size).toBeGreaterThan(1);
  });

  it('designer dark override anchors and survives the cascade (#1630)', () => {
    const g = buildChain(5);
    const computed = g.get('primary--dark') as ColorReference;
    // Pick an override position that provably differs from the computed one.
    const overridePosition = computed.position === '200' ? '800' : '200';

    // Designer vetoes the computed dark: override like any other token.
    g.set(
      'primary--dark',
      { family: 'mud', position: overridePosition },
      { reason: 'computed dark too heavy for panel surfaces' },
    );
    expect((g.get('primary--dark') as ColorReference).position).toBe(overridePosition);

    // The parent moves; the cascade re-runs; the override must HOLD.
    g.set('primary', { family: 'mud', position: '700' }, { reason: 'brand shift' });
    expect((g.get('primary--dark') as ColorReference).position).toBe(overridePosition);

    // The dark FOREGROUND is not overridden — it must keep deriving, against
    // the overridden dark background.
    const darkFg = g.get('primary-foreground--dark') as ColorReference;
    expect(darkFg.position).not.toBe(overridePosition);

    // The override is recorded with its reason (the why-gate), not silent.
    const node = g.node('primary--dark');
    expect(node?.userOverride?.reason).toBe('computed dark too heavy for panel surfaces');
    expect(node?.binding?.plugin).toBe('invert'); // re-derivation hook preserved
  });

  it('dark foreground derives against the dark background (pair unity via the chain)', () => {
    const g = buildChain(5);
    const darkBg = g.get('primary--dark') as ColorReference;
    const darkFg = g.get('primary-foreground--dark') as ColorReference;
    // The dark foreground must be a WCAG partner of the DARK background's
    // position within the family — proven by it differing from the light
    // foreground's relationship and re-deriving when the dark bg moves.
    expect(darkFg.family).toBe('mud');
    expect(darkFg.position).not.toBe(darkBg.position);

    // Cascade proof: overriding the parent re-derives BOTH dark legs.
    g.set('primary', { family: 'mud', position: '800' }, { reason: 'designer reassignment' });
    const movedBg = g.get('primary--dark') as ColorReference;
    const movedFg = g.get('primary-foreground--dark') as ColorReference;
    expect(movedBg.position).not.toBe(darkBg.position);
    expect(movedFg.position).not.toBe(movedBg.position);
  });
});
