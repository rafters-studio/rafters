import type { ColorValue } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { contrastPlugin, TokenGraph } from '../../src/index.js';
import { MINIMAL_SCALE as minimalScale } from './_fixtures.js';

const ACCENT_AAA_PAIR = {
  wcagAAA: { normal: [[5, 0]] as number[][], large: [] as number[][] },
  wcagAA: { normal: [] as number[][], large: [] as number[][] },
};

describe('contrastPlugin', () => {
  it('declares dependency on the parent token (against)', () => {
    expect(contrastPlugin.dependsOn({ against: 'primary', level: 'AAA' })).toEqual(['primary']);
  });

  it('uses pre-computed foregroundReferences.auto when present on the parent family', () => {
    const family = {
      name: 'accent',
      scale: minimalScale,
      foregroundReferences: { auto: { family: 'gray', position: '50' } },
    } as ColorValue;
    const g = new TokenGraph([contrastPlugin]);
    g.seed('accent', family);
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' });
    expect(g.get('primary-fg')).toEqual({ family: 'gray', position: '50' });
  });

  it('uses WCAG AAA pair from the parent family accessibility data', () => {
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: ACCENT_AAA_PAIR,
    };
    const g = new TokenGraph([contrastPlugin]);
    g.seed('accent', family);
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' });
    expect(g.get('primary-fg')).toEqual({ family: 'accent', position: '50' });
  });

  it('falls back to WCAG AA when no AAA pair (level=AAA tries AAA then AA)', () => {
    const family: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: {
        wcagAAA: { normal: [], large: [] },
        wcagAA: { normal: [[5, 10]], large: [] },
      },
    };
    const g = new TokenGraph([contrastPlugin]);
    g.seed('accent', family);
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' });
    expect(g.get('primary-fg')).toEqual({ family: 'accent', position: '950' });
  });

  it('cascade: foreground recomputes when parent value remaps to a different family', () => {
    const accent: ColorValue = {
      name: 'accent',
      scale: minimalScale,
      accessibility: ACCENT_AAA_PAIR,
    };
    const yellow: ColorValue = {
      name: 'yellow',
      scale: minimalScale,
      accessibility: {
        wcagAAA: { normal: [[5, 10]], large: [] },
        wcagAA: { normal: [], large: [] },
      },
    };
    const g = new TokenGraph([contrastPlugin]);
    g.seed('accent', accent);
    g.seed('yellow', yellow);
    g.seed('primary', { family: 'accent', position: '500' });
    g.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' });
    expect(g.get('primary-fg')).toEqual({ family: 'accent', position: '50' });
    g.set('primary', { family: 'yellow', position: '500' }, { reason: 'remap' });
    expect(g.get('primary-fg')).toEqual({ family: 'yellow', position: '950' });
  });

  it('throws when the parent token did not resolve to a ColorReference', () => {
    const g = new TokenGraph([contrastPlugin]);
    g.seed('not-a-color-ref', 'some-string');
    expect(() => g.bind('fg', 'contrast', { against: 'not-a-color-ref', level: 'AAA' })).toThrow(
      /could not resolve/,
    );
  });

  it('throws when the parent family has neither foregroundReferences nor WCAG pairs', () => {
    const family: ColorValue = { name: 'accent', scale: minimalScale };
    const g = new TokenGraph([contrastPlugin]);
    g.seed('accent', family);
    g.seed('primary', { family: 'accent', position: '500' });
    expect(() => g.bind('primary-fg', 'contrast', { against: 'primary', level: 'AAA' })).toThrow(
      /no WCAG pair partner|accessibility metadata requiredibility/,
    );
  });
});
