import type { ColorValue } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { statePlugin, TokenGraph } from '../../src/index.js';
import { MINIMAL_SCALE as minimalScale } from './_fixtures.js';

// Ladder positions sorted: [0, 1, 2, 3, 7, 8, 9, 10].
const fullLadderAccessibility = {
  wcagAAA: {
    normal: [
      [0, 8],
      [0, 9],
      [0, 10],
      [1, 8],
      [1, 9],
      [1, 10],
      [2, 9],
      [2, 10],
      [3, 10],
      [7, 0],
      [8, 0],
      [9, 0],
      [10, 0],
    ],
    large: [],
  },
  wcagAA: { normal: [], large: [] },
  onWhite: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [], aaa: [] },
  onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [], aaa: [] },
};

function seedFamily(g: TokenGraph, name: string, opts?: Partial<ColorValue>): void {
  g.seed(name, { name, scale: minimalScale, ...opts } as ColorValue);
}

describe('statePlugin', () => {
  it('declares dependency on the parent token (from)', () => {
    expect(statePlugin.dependsOn({ from: 'primary', stateType: 'hover' })).toEqual(['primary']);
  });

  it('uses pre-computed stateReferences on the parent family when present', () => {
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', {
      stateReferences: {
        hover: { family: 'accent', position: '700' },
        active: { family: 'accent', position: '800' },
      },
    });
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
    g.bind('primary-active', 'state', { from: 'primary', stateType: 'active' });
    expect(g.get('primary-hover')).toEqual({ family: 'accent', position: '700' });
    expect(g.get('primary-active')).toEqual({ family: 'accent', position: '800' });
  });

  it('walks the WCAG-AAA ladder for hover/active/focus', () => {
    // Ladder = [0, 1, 2, 3, 7, 8, 9, 10]. Parent at position 8 has rank 5.
    // hover  rank +1 -> rank 6 -> position 9.
    // active rank +2 -> rank 7 -> position 10.
    // focus  rank +1 -> rank 6 -> position 9.
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    g.seed('primary', { family: 'accent', position: '800' });
    g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
    g.bind('primary-active', 'state', { from: 'primary', stateType: 'active' });
    g.bind('primary-focus', 'state', { from: 'primary', stateType: 'focus' });
    expect(g.get('primary-hover')).toEqual({ family: 'accent', position: '900' });
    expect(g.get('primary-active')).toEqual({ family: 'accent', position: '950' });
    expect(g.get('primary-focus')).toEqual({ family: 'accent', position: '900' });
  });

  it('disabled returns the ladder rank closest to the family midpoint (position 5)', () => {
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    g.seed('primary', { family: 'accent', position: '800' });
    g.bind('primary-disabled', 'state', { from: 'primary', stateType: 'disabled' });
    expect(g.get('primary-disabled')).toEqual({ family: 'accent', position: '300' });
  });

  it('clamps ladder steps at the top boundary', () => {
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    g.seed('primary', { family: 'accent', position: '950' });
    g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
    expect(g.get('primary-hover')).toEqual({ family: 'accent', position: '950' });
  });

  it('cascade: state recomputes when parent remaps to a different family', () => {
    // Both families have a ladder. After remap, hover walks yellow's ladder.
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    seedFamily(g, 'yellow', {
      accessibility: {
        wcagAAA: {
          normal: [
            [5, 0],
            [5, 1],
            [6, 0],
            [7, 0],
          ],
          large: [],
        },
        wcagAA: { normal: [], large: [] },
        onWhite: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [], aaa: [] },
        onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [], aaa: [] },
      },
    });
    g.seed('primary', { family: 'accent', position: '800' });
    g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
    expect(g.get('primary-hover')).toEqual({ family: 'accent', position: '900' });
    g.set('primary', { family: 'yellow', position: '500' }, { reason: 'remap to yellow' });
    // Yellow ladder = [0, 1, 5, 6, 7]; rank of 5 is 2; hover +1 -> rank 3 -> position 6 -> '600'.
    expect(g.get('primary-hover')).toEqual({ family: 'yellow', position: '600' });
  });

  it('throws when the parent token did not resolve to a ColorReference', () => {
    const g = new TokenGraph([statePlugin]);
    g.seed('not-a-color-ref', 'some-string');
    expect(() => g.bind('x', 'state', { from: 'not-a-color-ref', stateType: 'hover' })).toThrow(
      /could not resolve/,
    );
  });

  it('throws when the parent family has no accessibility.wcagAAA ladder', () => {
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent');
    g.seed('primary', { family: 'accent', position: '500' });
    expect(() => g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' })).toThrow(
      /no accessibility\.wcagAAA\.normal ladder/,
    );
  });

  it('snaps to the nearest ladder rank when parent position is not directly on the ladder', () => {
    // Ladder = [0, 1, 2, 3, 7, 8, 9, 10]. Position 5 is off the ladder.
    // Nearest is 3 (distance 2) -- first hit wins. hover +1 rank -> rank 4 -> position 7.
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-hover', 'state', { from: 'primary', stateType: 'hover' });
    expect(g.get('primary-hover')).toEqual({ family: 'accent', position: '700' });
  });

  it('rejects invalid stateType via Zod', () => {
    const g = new TokenGraph([statePlugin]);
    seedFamily(g, 'accent', { accessibility: fullLadderAccessibility });
    g.seed('primary', { family: 'accent', position: '500' });
    expect(() => g.bind('x', 'state', { from: 'primary', stateType: 'pressed' })).toThrow();
  });
});
