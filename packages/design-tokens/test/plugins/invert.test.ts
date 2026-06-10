import type { ColorValue } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { invertPlugin, scalePlugin, TokenGraph } from '../../src/index.js';
import { MINIMAL_SCALE as minimalScale } from './_fixtures.js';

describe('invertPlugin', () => {
  it('declares dependency on the fromToken', () => {
    expect(invertPlugin.dependsOn({ fromToken: 'primary' })).toEqual(['primary']);
  });

  it('finds AAA-paired dark counterpart with sufficient distance', () => {
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: {
        wcagAAA: { normal: [[2, 9]], large: [] },
        wcagAA: { normal: [], large: [] },
      },
    };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('parent', 'scale', { familyName: 'accent', scalePosition: 2 });
    g.bind('parent-dark', 'invert', { fromToken: 'parent' });
    expect(g.get('parent-dark')).toEqual({ family: 'accent', position: '900' });
  });

  it('picks the AAA pair whose background leg is nearest the inverted target', () => {
    // Parent at index 2; light pair is (2,4). Inverted bg target is 8.
    // AAA anchors are only {2,4}: orientation (4,2) has from-dist 4 vs (2,4)'s 6,
    // so the bg leg lands at 4 — the darkest AAA-paired anchor available.
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: {
        wcagAAA: { normal: [[2, 4]], large: [] },
        wcagAA: { normal: [[2, 8]], large: [] },
      },
    };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('parent', 'scale', { familyName: 'accent', scalePosition: 2 });
    g.bind('parent-dark', 'invert', { fromToken: 'parent' });
    expect(g.get('parent-dark')).toEqual({ family: 'accent', position: '400' });
  });

  it('uses the nearest passing pair even when the available pair is close', () => {
    // Old code forced mathematical inversion when pair distance < 3; the new
    // contract trusts the nearest passing pair. Parent 2 -> light pair (2,3),
    // inverted bg target 8; (3,2) has from-dist 5 vs (2,3)'s 6 -> bg leg 3.
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: {
        wcagAAA: { normal: [[2, 3]], large: [] },
        wcagAA: { normal: [[2, 3]], large: [] },
      },
    };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('parent', 'scale', { familyName: 'accent', scalePosition: 2 });
    g.bind('parent-dark', 'invert', { fromToken: 'parent' });
    expect(g.get('parent-dark')).toEqual({ family: 'accent', position: '300' });
  });

  it('throws when family has no accessibility data at all', () => {
    const family: ColorValue = { name: 'accent', scale: minimalScale };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('parent', 'scale', { familyName: 'accent', scalePosition: 5 });
    expect(() => g.bind('parent-dark', 'invert', { fromToken: 'parent' })).toThrow(
      /accessibility metadata required|no WCAG pair partner/,
    );
  });

  it('follows reassignment — dark position updates when parent changes', () => {
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: {
        wcagAAA: {
          normal: [
            [0, 8],
            [5, 0],
            [5, 9],
            [9, 0],
          ],
          large: [],
        },
        wcagAA: { normal: [], large: [] },
      },
    };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('primary', 'scale', { familyName: 'accent', scalePosition: 5 });
    g.bind('primary-dark', 'invert', { fromToken: 'primary' });

    const before = g.get('primary-dark');
    g.set('primary', { family: 'accent', position: '900' }, { reason: 'reassign' });
    const after = g.get('primary-dark');

    // Mid-tone parent (5): inverted bg target is 10-5=5, and (5,9) pairs it —
    // a mid stays a mid (the #1635 contract), instead of the old jump to 900.
    expect(before).toEqual({ family: 'accent', position: '500' });
    expect(after).toEqual({ family: 'accent', position: '50' });
  });
});
