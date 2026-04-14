/**
 * Generation Rules Tests
 *
 * Tests for the GenerationRuleParser only.
 * The GenerationRuleExecutor was removed in #1243. Plugin execution tests
 * are now in plugins.test.ts.
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { GenerationRuleParser } from '../src/generation-rules';
import { TokenRegistry } from '../src/registry';

function makeOKLCH(l: number, c: number, h: number): OKLCH {
  return { l, c, h, alpha: 1 };
}

function makeColorValue(name: string, baseH: number): ColorValue {
  const positions = [0.98, 0.95, 0.9, 0.8, 0.7, 0.55, 0.4, 0.25, 0.15, 0.08, 0.04];
  return {
    name,
    scale: positions.map((l) => makeOKLCH(l, 0.15, baseH)),
  };
}

function oklchToCSS(oklch: OKLCH): string {
  return `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${Math.round(oklch.h)})`;
}

describe('GenerationRuleParser', () => {
  let parser: GenerationRuleParser;

  beforeEach(() => {
    parser = new GenerationRuleParser();
  });

  describe('scale colon syntax', () => {
    it('parses scale:500 as scale-position type', () => {
      const result = parser.parse('scale:500');
      expect(result.type).toBe('scale-position');
      expect(result.scalePosition).toBe(5);
    });

    it('parses all Tailwind scale positions correctly', () => {
      const positions = [
        { input: 50, expectedIndex: 0 },
        { input: 100, expectedIndex: 1 },
        { input: 200, expectedIndex: 2 },
        { input: 300, expectedIndex: 3 },
        { input: 400, expectedIndex: 4 },
        { input: 500, expectedIndex: 5 },
        { input: 600, expectedIndex: 6 },
        { input: 700, expectedIndex: 7 },
        { input: 800, expectedIndex: 8 },
        { input: 900, expectedIndex: 9 },
        { input: 950, expectedIndex: 10 },
      ];

      for (const { input, expectedIndex } of positions) {
        const result = parser.parse(`scale:${input}`);
        expect(result.type).toBe('scale-position');
        expect(result.scalePosition).toBe(expectedIndex);
      }
    });

    it('parses non-standard scale values as ratio', () => {
      const result = parser.parse('scale:1.5');
      expect(result.type).toBe('scale');
      expect(result.ratio).toBe(1.5);
    });

    it('parses large non-position numbers as ratio', () => {
      const result = parser.parse('scale:1000');
      expect(result.type).toBe('scale');
      expect(result.ratio).toBe(1000);
    });

    it('rejects malformed scale values', () => {
      expect(() => parser.parse('scale:500foo')).toThrow('Invalid scale value');
      expect(() => parser.parse('scale:1e2')).toThrow('Invalid scale value');
      expect(() => parser.parse('scale:abc')).toThrow('Invalid scale value');
    });
  });

  describe('existing rule types', () => {
    it('parses state:hover correctly', () => {
      const result = parser.parse('state:hover');
      expect(result.type).toBe('state');
      expect(result.stateType).toBe('hover');
    });

    it('parses contrast:auto correctly', () => {
      const result = parser.parse('contrast:auto');
      expect(result.type).toBe('contrast');
      expect(result.contrast).toBe('auto');
    });

    it('parses calc expressions correctly', () => {
      const result = parser.parse('calc({spacing-base} * 2)');
      expect(result.type).toBe('calc');
      expect(result.tokens).toContain('spacing-base');
    });

    it('parses function-style scale correctly', () => {
      const result = parser.parse('scale(base-token, 1.5)');
      expect(result.type).toBe('scale');
      expect(result.baseToken).toBe('base-token');
      expect(result.ratio).toBe(1.5);
    });
  });
});

describe('TokenRegistry regeneration with scale-position', () => {
  let registry: TokenRegistry;

  beforeEach(() => {
    registry = new TokenRegistry();
  });

  it('regenerates scale tokens when parent ColorValue updates', async () => {
    const initialColor = makeColorValue('test-blue', 240);

    registry.add({
      name: 'color-family-primary',
      value: initialColor,
      category: 'color',
      namespace: 'color',
    });

    registry.add({
      name: 'primary-500',
      value: oklchToCSS(initialColor.scale[5] ?? makeOKLCH(0.55, 0.15, 240)),
      category: 'color',
      namespace: 'color',
      dependsOn: ['color-family-primary'],
      generationRule: 'scale:500',
    });

    registry.addDependency('primary-500', ['color-family-primary'], 'scale:500');

    expect(registry.get('primary-500')?.value).toBe(
      oklchToCSS(initialColor.scale[5] ?? makeOKLCH(0.55, 0.15, 240)),
    );

    // Update to new color
    const newColor = makeColorValue('test-green', 120);
    await registry.set('color-family-primary', newColor);

    // Verify regeneration
    const updated = registry.get('primary-500');
    expect(updated?.value).toBe(oklchToCSS(newColor.scale[5] ?? makeOKLCH(0.55, 0.15, 120)));
  });

  it('regenerates all scale positions when parent updates', async () => {
    const initialColor = makeColorValue('test-purple', 280);
    const scalePositions = [
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ];

    registry.add({
      name: 'color-family-primary',
      value: initialColor,
      category: 'color',
      namespace: 'color',
    });

    for (let i = 0; i < scalePositions.length; i++) {
      const pos = scalePositions[i];
      registry.add({
        name: `primary-${pos}`,
        value: oklchToCSS(initialColor.scale[i] ?? makeOKLCH(0.5, 0.15, 280)),
        category: 'color',
        namespace: 'color',
        dependsOn: ['color-family-primary'],
        generationRule: `scale:${pos}`,
      });

      registry.addDependency(`primary-${pos}`, ['color-family-primary'], `scale:${pos}`);
    }

    const newColor = makeColorValue('test-orange', 30);
    await registry.set('color-family-primary', newColor);

    for (let i = 0; i < scalePositions.length; i++) {
      const pos = scalePositions[i];
      const token = registry.get(`primary-${pos}`);
      expect(token?.value).toBe(oklchToCSS(newColor.scale[i] ?? makeOKLCH(0.5, 0.15, 30)));
    }
  });
});
