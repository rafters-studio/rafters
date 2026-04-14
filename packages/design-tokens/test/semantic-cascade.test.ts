/**
 * Tests for the semantic token cascade system:
 * - scale-positions shared utilities (findBestWcagPair, findDarkCounterpartIndex)
 * - deriveGenerationRule pattern matching
 * - applyComputed updating dependsOn on cascade
 * - Repeated cascade stability
 *
 * GenerationRuleExecutor was removed in #1243.
 * Plugin execution tests are in plugins.test.ts.
 */

import type { ColorReference, ColorValue, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../src/generators';
import { generateSemanticTokens } from '../src/generators/semantic';
import type { ResolvedSystemConfig } from '../src/generators/types';
import { TokenRegistry } from '../src/registry';
import {
  findBestWcagPair,
  findDarkCounterpartIndex,
  MIN_WCAG_PAIR_DISTANCE,
} from '../src/scale-positions';

// Minimal config for generateSemanticTokens
const minimalConfig = {} as ResolvedSystemConfig;

// Helper: build a ColorValue with known WCAG pairs
function makeColorValueWithPairs(aaaPairs: number[][], aaPairs: number[][] = []): ColorValue {
  const scale = Array.from({ length: 11 }, (_, i) => ({
    l: 0.95 - i * 0.09,
    c: 0.1,
    h: 240,
    alpha: 1,
  }));

  return {
    name: 'test-color',
    scale,
    accessibility: {
      wcagAAA: { normal: aaaPairs, large: [] },
      wcagAA: { normal: aaPairs, large: [] },
      onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5 },
      onBlack: { wcagAA: true, wcagAAA: false, contrastRatio: 5 },
      apca: { onWhite: 60, onBlack: -60 },
    },
  };
}

describe('findBestWcagPair', () => {
  it('finds the partner with greatest distance on the higher side', () => {
    const pairs = [
      [0, 5],
      [0, 8],
      [0, 10],
    ];
    expect(findBestWcagPair(0, pairs, true)).toBe(10);
  });

  it('finds the partner with greatest distance on the lower side', () => {
    const pairs = [
      [10, 5],
      [10, 2],
      [10, 0],
    ];
    expect(findBestWcagPair(10, pairs, false)).toBe(0);
  });

  it('skips partners on the wrong side', () => {
    const pairs = [
      [5, 3],
      [5, 2],
      [5, 1],
    ];
    // Want higher, but all partners are lower
    expect(findBestWcagPair(5, pairs, true)).toBeUndefined();
  });

  it('handles both orderings in pairs', () => {
    // [a, b] where b === sourceIndex
    const pairs = [[8, 2]];
    expect(findBestWcagPair(2, pairs, true)).toBe(8);
  });

  it('returns undefined for empty pairs', () => {
    expect(findBestWcagPair(5, [], true)).toBeUndefined();
  });

  it('skips malformed pairs', () => {
    const pairs = [[], [1], [undefined as unknown as number, 5]];
    expect(findBestWcagPair(5, pairs, true)).toBeUndefined();
  });
});

describe('findDarkCounterpartIndex', () => {
  it('uses AAA pairs first', () => {
    const cv = makeColorValueWithPairs(
      [[0, 10]], // AAA: 0 pairs with 10
      [[0, 6]], // AA: 0 pairs with 6
    );
    expect(findDarkCounterpartIndex(0, cv)).toBe(10);
  });

  it('falls back to AA when AAA is too close', () => {
    const cv = makeColorValueWithPairs(
      [[5, 7]], // AAA: distance 2, below MIN_WCAG_PAIR_DISTANCE
      [[5, 9]], // AA: distance 4, acceptable
    );
    expect(findDarkCounterpartIndex(5, cv)).toBe(9);
  });

  it('falls back to math inversion when all pairs too close', () => {
    // Suppress the expected warning
    const warn = console.warn;
    console.warn = () => {};
    try {
      const cv = makeColorValueWithPairs(
        [[5, 6]], // AAA: distance 1
        [[5, 7]], // AA: distance 2
      );
      expect(findDarkCounterpartIndex(5, cv)).toBe(5); // 10 - 5
    } finally {
      console.warn = warn;
    }
  });

  it('throws when no WCAG data exists', () => {
    const cv = makeColorValueWithPairs([], []);
    expect(() => findDarkCounterpartIndex(3, cv)).toThrow('No WCAG accessibility data');
  });

  it('searches higher for light indices (<=5)', () => {
    const cv = makeColorValueWithPairs([
      [2, 8],
      [2, 3],
    ]);
    expect(findDarkCounterpartIndex(2, cv)).toBe(8);
  });

  it('searches lower for dark indices (>5)', () => {
    const cv = makeColorValueWithPairs([
      [8, 2],
      [8, 7],
    ]);
    expect(findDarkCounterpartIndex(8, cv)).toBe(2);
  });

  it('respects MIN_WCAG_PAIR_DISTANCE constant', () => {
    expect(MIN_WCAG_PAIR_DISTANCE).toBe(3);
  });
});

describe('deriveGenerationRule', () => {
  it('assigns correct rules to semantic tokens', () => {
    const result = generateSemanticTokens(minimalConfig);
    const tokenMap = new Map(result.tokens.map((t) => [t.name, t]));

    // Base tokens get scale:position
    expect(tokenMap.get('primary')?.generationRule).toBe('scale:900');
    expect(tokenMap.get('destructive')?.generationRule).toBe('scale:600');
    expect(tokenMap.get('background')?.generationRule).toBe('scale:50');

    // Foreground tokens get contrast:auto
    expect(tokenMap.get('primary-foreground')?.generationRule).toBe('contrast:auto');
    expect(tokenMap.get('card-foreground')?.generationRule).toBe('contrast:auto');

    // State tokens get state:*
    expect(tokenMap.get('primary-hover')?.generationRule).toBe('state:hover');
    expect(tokenMap.get('destructive-active')?.generationRule).toBe('state:active');
    expect(tokenMap.get('primary-focus')?.generationRule).toBe('state:focus');

    // Hover-foreground gets contrast:auto, not state:hover
    expect(tokenMap.get('primary-hover-foreground')?.generationRule).toBe('contrast:auto');
    expect(tokenMap.get('destructive-active-foreground')?.generationRule).toBe('contrast:auto');
  });

  it('all semantic tokens have a generationRule', () => {
    const result = generateSemanticTokens(minimalConfig);
    for (const token of result.tokens) {
      expect(token.generationRule, `${token.name} missing generationRule`).toBeDefined();
      expect(token.generationRule?.length).toBeGreaterThan(0);
    }
  });

  it('all semantic tokens have dependsOn[0] as family token', () => {
    const result = generateSemanticTokens(minimalConfig);
    for (const token of result.tokens) {
      expect(token.dependsOn, `${token.name} missing dependsOn`).toBeDefined();
      expect(token.dependsOn?.length).toBeGreaterThanOrEqual(1);
      // dependsOn[0] should NOT contain a dash+number suffix (it's a family, not a position token)
      const dep0 = token.dependsOn?.[0];
      expect(dep0, `${token.name} has no dependsOn[0]`).toBeDefined();
      expect(dep0).not.toMatch(/-\d+$/);
    }
  });
});

describe('applyComputed cascade behavior', () => {
  it('updates dependsOn when semantic token cascades', async () => {
    const result = generateBaseSystem();
    const registry = new TokenRegistry(result.allTokens);

    const before = registry.get('primary');
    expect(before?.dependsOn?.[0]).toBe('neutral');

    // Trigger cascade by updating the neutral family
    const { buildColorValue } = await import('@rafters/color-utils');
    const tealCV = buildColorValue({ l: 0.5, c: 0.1, h: 180 }, { token: 'neutral' });
    await registry.set('neutral', tealCV);

    const after = registry.get('primary');
    // dependsOn[0] stays as family token
    expect(after?.dependsOn?.[0]).toBe('neutral');
    // dependsOn[1] is dark mode position
    expect(after?.dependsOn?.[1]).toMatch(/^neutral-/);
  });

  it('preserves designer overrides through cascade', async () => {
    const result = generateBaseSystem();
    const registry = new TokenRegistry(result.allTokens);

    // Set a designer override
    const ring = registry.get('ring') as Token;
    await registry.setToken({
      ...ring,
      value: { family: 'silver-true-sky', position: '600' },
      dependsOn: ['silver-true-sky', 'silver-true-sky-400'],
      userOverride: {
        previousValue: JSON.stringify(ring.value),
        reason: 'Brand guideline: sky blue focus rings',
      },
    });

    // Cascade neutral family
    const { buildColorValue } = await import('@rafters/color-utils');
    const cv = buildColorValue({ l: 0.5, c: 0.1, h: 180 }, { token: 'neutral' });
    await registry.set('neutral', cv);

    const after = registry.get('ring') as Token;
    const val = after.value as ColorReference;
    expect(val.family).toBe('silver-true-sky');
    expect(val.position).toBe('600');
    expect(after.userOverride?.reason).toBe('Brand guideline: sky blue focus rings');
    // computedValue shows what the system would have set
    expect(after.computedValue).toBeDefined();
  });

  it('survives three consecutive cascades', async () => {
    const result = generateBaseSystem();
    const registry = new TokenRegistry(result.allTokens);
    const { buildColorValue } = await import('@rafters/color-utils');

    const colors = [
      { l: 0.208, c: 0.042, h: 266 }, // navy
      { l: 0.5, c: 0.1, h: 180 }, // teal
      { l: 0.5, c: 0.15, h: 25 }, // red
    ];

    for (const oklch of colors) {
      const cv = buildColorValue(oklch, { token: 'neutral' });
      await registry.set('neutral', cv);

      const primary = registry.get('primary');
      expect(primary?.dependsOn?.[0]).toBe('neutral');
      const val = primary?.value as ColorReference;
      expect(val.family).toBe('neutral');
    }
  });

  it('does not cascade tokens on different families', async () => {
    const result = generateBaseSystem();
    const registry = new TokenRegistry(result.allTokens);

    const destructiveBefore = registry.get('destructive') as Token;
    const beforeVal = destructiveBefore.value as ColorReference;

    const { buildColorValue } = await import('@rafters/color-utils');
    const cv = buildColorValue({ l: 0.5, c: 0.1, h: 180 }, { token: 'neutral' });
    await registry.set('neutral', cv);

    const destructiveAfter = registry.get('destructive') as Token;
    const afterVal = destructiveAfter.value as ColorReference;
    expect(afterVal.family).toBe(beforeVal.family);
    expect(afterVal.position).toBe(beforeVal.position);
  });
});
