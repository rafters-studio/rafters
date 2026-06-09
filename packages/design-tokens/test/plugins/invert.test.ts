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

  it('falls back to AA when AAA pair is too close', () => {
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
    expect(g.get('parent-dark')).toEqual({ family: 'accent', position: '800' });
  });

  it('falls back to mathematical inversion when no usable WCAG pair', () => {
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
    expect(g.get('parent-dark')).toEqual({ family: 'accent', position: '800' });
  });

  it('throws when family has no accessibility data at all', () => {
    const family: ColorValue = { name: 'accent', scale: minimalScale };
    const g = new TokenGraph([scalePlugin, invertPlugin]);
    g.seed('accent', family);
    g.bind('parent', 'scale', { familyName: 'accent', scalePosition: 5 });
    expect(() => g.bind('parent-dark', 'invert', { fromToken: 'parent' })).toThrow(
      /No WCAG accessibility data/,
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

    expect(before).toEqual({ family: 'accent', position: '900' });
    expect(after).toEqual({ family: 'accent', position: '50' });
  });
});
