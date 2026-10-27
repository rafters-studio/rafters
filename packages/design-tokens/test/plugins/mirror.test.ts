import { buildColorValue } from '@rafters/color-utils';
import { describe, expect, it } from 'vitest';
import { mirrorPlugin, scalePlugin, TokenGraph } from '../../src/index.js';

function graphWith(position: number, offset: number): TokenGraph {
  const g = new TokenGraph([scalePlugin, mirrorPlugin]);
  g.seed('blue', buildColorValue({ l: 0.55, c: 0.15, h: 250, alpha: 1 }));
  g.bind('surface', 'scale', { familyName: 'blue', scalePosition: position });
  g.bind('surface--dark', 'mirror', { fromToken: 'surface', offset });
  return g;
}

describe('mirrorPlugin', () => {
  it('depends on its light token', () => {
    expect(mirrorPlugin.dependsOn({ fromToken: 'card', offset: 0 })).toEqual(['card']);
  });

  it('mirrors the light position across the scale', () => {
    expect(graphWith(0, 0).get('surface--dark')).toEqual({ family: 'blue', position: '950' });
    expect(graphWith(5, 0).get('surface--dark')).toEqual({ family: 'blue', position: '500' });
  });

  it('applies the elevation offset and clamps to the scale', () => {
    expect(graphWith(0, -3).get('surface--dark')).toEqual({ family: 'blue', position: '700' });
    expect(graphWith(10, -3).get('surface--dark')).toEqual({ family: 'blue', position: '50' });
  });
});
