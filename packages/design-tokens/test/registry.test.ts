import type { ColorValue, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  contrastPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
  UnknownTokenError,
} from '../src/index.js';

const minimalScale = [
  { l: 0.97, c: 0.02, h: 240 },
  { l: 0.93, c: 0.05, h: 240 },
  { l: 0.85, c: 0.1, h: 240 },
  { l: 0.75, c: 0.14, h: 240 },
  { l: 0.65, c: 0.16, h: 240 },
  { l: 0.55, c: 0.18, h: 240 },
  { l: 0.45, c: 0.18, h: 240 },
  { l: 0.35, c: 0.16, h: 240 },
  { l: 0.25, c: 0.14, h: 240 },
  { l: 0.18, c: 0.1, h: 240 },
  { l: 0.12, c: 0.07, h: 240 },
];

const accentToken: Token = {
  name: 'accent',
  namespace: 'color',
  category: 'color',
  value: {
    name: 'accent',
    scale: minimalScale,
    accessibility: {
      wcagAAA: { normal: [[5, 0]], large: [] },
      wcagAA: { normal: [[5, 0]], large: [] },
      onWhite: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [5], aaa: [9] },
      onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 7, aa: [5], aaa: [0] },
    },
  } as ColorValue,
  userOverride: null,
};

const spacingBaseToken: Token = {
  name: 'spacing-base',
  namespace: 'spacing',
  category: 'spacing',
  value: '4px',
  userOverride: null,
};

function semanticTokenFor(name: string): Token {
  return {
    name,
    namespace: 'semantic',
    category: 'color',
    value: '',
    userOverride: null,
  };
}

describe('TokenRegistry', () => {
  describe('construction', () => {
    it('seeds initial tokens with metadata and value', () => {
      const r = new TokenRegistry([accentToken]);
      expect(r.size()).toBe(1);
      expect(r.has('accent')).toBe(true);
      expect(r.get('accent')?.namespace).toBe('color');
      // Zod fills OKLCH.alpha default 1; compare structure, not deep object identity.
      const v = r.get('accent')?.value;
      expect(v && typeof v === 'object' && 'name' in v && v.name).toBe('accent');
      expect(
        v && typeof v === 'object' && 'scale' in v && Array.isArray(v.scale) && v.scale.length,
      ).toBe(11);
    });

    it('seeds plugins via constructor', () => {
      const r = new TokenRegistry([accentToken, semanticTokenFor('accent-500')], [scalePlugin]);
      r.bind('accent-500', 'scale', { familyName: 'accent', scalePosition: 5 });
      expect(r.get('accent-500')?.value).toEqual({ family: 'accent', position: '500' });
    });
  });

  describe('set', () => {
    it('writes value on existing token and records userOverride', () => {
      const r = new TokenRegistry([spacingBaseToken]);
      r.set('spacing-base', '8px', { reason: 'designer choice' });
      expect(r.get('spacing-base')?.value).toBe('8px');
      expect(r.get('spacing-base')?.userOverride?.reason).toBe('designer choice');
      expect(r.get('spacing-base')?.userOverride?.previousValue).toBe('4px');
    });

    it('throws UnknownTokenError when set is called on a name with no registered metadata', () => {
      const r = new TokenRegistry();
      expect(() => r.set('color-mystery', '#fff', { reason: 'test' })).toThrow(UnknownTokenError);
    });

    it('replaces userOverride on subsequent set (latest reason wins)', () => {
      const r = new TokenRegistry([spacingBaseToken]);
      r.set('spacing-base', '20px', { reason: 'first change' });
      r.set('spacing-base', '24px', { reason: 'second change' });
      const token = r.get('spacing-base');
      expect(token?.value).toBe('24px');
      expect(token?.userOverride?.reason).toBe('second change');
      expect(token?.userOverride?.previousValue).toBe('20px');
    });
  });

  describe('define', () => {
    it('registers a new token with full metadata after construction', () => {
      const r = new TokenRegistry();
      r.define(spacingBaseToken);
      expect(r.has('spacing-base')).toBe(true);
      expect(r.get('spacing-base')?.value).toBe('4px');
    });

    it('rejects input missing required fields', () => {
      const r = new TokenRegistry();
      expect(() => r.define({ name: 'incomplete' })).toThrow();
    });
  });

  describe('bind + cascade', () => {
    it('cascades family changes through scale + contrast chain', () => {
      const r = new TokenRegistry(
        [accentToken, semanticTokenFor('accent-500'), semanticTokenFor('accent-fg')],
        [scalePlugin, contrastPlugin],
      );
      r.bind('accent-500', 'scale', { familyName: 'accent', scalePosition: 5 });
      r.bind('accent-fg', 'contrast', { against: 'accent-500', level: 'AAA' });
      expect(r.get('accent-500')?.value).toEqual({ family: 'accent', position: '500' });
      expect(r.get('accent-fg')?.value).toBeDefined();
    });

    it('cascades through state variants on family change', () => {
      const r = new TokenRegistry(
        [accentToken, semanticTokenFor('accent-500'), semanticTokenFor('accent-hover')],
        [scalePlugin, statePlugin],
      );
      r.bind('accent-500', 'scale', { familyName: 'accent', scalePosition: 5 });
      r.bind('accent-hover', 'state', { from: 'accent-500', stateType: 'hover' });
      const newAccent = { ...accentToken.value, name: 'mutated' } as ColorValue;
      r.set('accent', newAccent, { reason: 'test mutation' });
      expect(r.get('accent')?.value).toEqual(newAccent);
      expect(r.get('accent-hover')?.value).toBeDefined();
    });

    it('preserves metadata dependsOn (carries the dark-counterpart convention untouched by binding)', () => {
      const semanticWithDeps: Token = {
        name: 'primary',
        namespace: 'semantic',
        category: 'color',
        value: '',
        userOverride: null,
        // dependsOn[0] = family token, dependsOn[1] = dark counterpart
        dependsOn: ['accent', 'accent-50'],
      };
      const r = new TokenRegistry([accentToken, semanticWithDeps], [scalePlugin]);
      r.bind('primary', 'scale', { familyName: 'accent', scalePosition: 5 });
      expect(r.get('primary')?.dependsOn).toEqual(['accent', 'accent-50']);
    });
  });

  describe('userOverride anchors block recompute', () => {
    it('blocks recompute on anchored node when upstream changes', () => {
      const r = new TokenRegistry([accentToken, semanticTokenFor('accent-500')], [scalePlugin]);
      r.bind('accent-500', 'scale', { familyName: 'accent', scalePosition: 5 });
      r.set('accent-500', { family: 'override', position: 'manual' }, { reason: 'manual' });
      const newAccent = { ...accentToken.value, name: 'mutated' } as ColorValue;
      r.set('accent', newAccent, { reason: 'family remap' });
      expect(r.get('accent-500')?.value).toEqual({ family: 'override', position: 'manual' });
    });
  });

  describe('list + filter', () => {
    it('lists all tokens', () => {
      const r = new TokenRegistry([accentToken, spacingBaseToken]);
      expect(r.list().length).toBe(2);
    });

    it('filters by namespace', () => {
      const r = new TokenRegistry([accentToken, spacingBaseToken]);
      const colors = r.list({ namespace: 'color' });
      expect(colors.length).toBe(1);
      expect(colors[0]?.name).toBe('accent');
    });

    it('filters by category', () => {
      const r = new TokenRegistry([accentToken, spacingBaseToken]);
      const spacings = r.list({ category: 'spacing' });
      expect(spacings.length).toBe(1);
      expect(spacings[0]?.name).toBe('spacing-base');
    });
  });

  describe('plugin registration', () => {
    it('accepts plugins added after construction', () => {
      const r = new TokenRegistry([accentToken, semanticTokenFor('accent-500')]);
      r.registerPlugin(scalePlugin);
      r.bind('accent-500', 'scale', { familyName: 'accent', scalePosition: 5 });
      expect(r.get('accent-500')?.value).toEqual({ family: 'accent', position: '500' });
    });
  });

  describe('undo', () => {
    it('reverses the most recent operation', () => {
      const r = new TokenRegistry([spacingBaseToken]);
      r.set('spacing-base', '16px', { reason: 'test undo' });
      r.undo();
      expect(r.get('spacing-base')?.value).toBe('4px');
    });
  });

  describe('get', () => {
    it('returns undefined for unknown name', () => {
      const r = new TokenRegistry();
      expect(r.get('nope')).toBeUndefined();
    });

    it('preserves all metadata fields from the initial Token', () => {
      const richToken: Token = {
        ...accentToken,
        semanticMeaning: 'primary brand color',
        cognitiveLoad: 4,
        accessibilityLevel: 'AAA',
        appliesWhen: ['hero sections'],
      };
      const r = new TokenRegistry([richToken]);
      const t = r.get('accent');
      expect(t?.semanticMeaning).toBe('primary brand color');
      expect(t?.cognitiveLoad).toBe(4);
      expect(t?.accessibilityLevel).toBe('AAA');
      expect(t?.appliesWhen).toEqual(['hero sections']);
    });
  });
});
