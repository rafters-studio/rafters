/**
 * Tests for DTCG Format Converter
 */

import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { toDTCG, toDTCGByNamespace } from '../../src/exporters/dtcg.js';

describe('toDTCG', () => {
  describe('basic conversion', () => {
    it('should convert a simple token to DTCG format', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-4',
          value: '1rem',
          category: 'spacing',
          namespace: 'spacing',
        },
      ];

      const result = toDTCG(tokens);

      expect(result).toHaveProperty('spacing');
      expect(result.spacing).toHaveProperty('4');
      expect((result.spacing as Record<string, unknown>)['4']).toHaveProperty('$value', '1rem');
    });

    it('should convert multiple tokens', () => {
      const tokens: Token[] = [
        { name: 'spacing-1', value: '0.25rem', category: 'spacing', namespace: 'spacing' },
        { name: 'spacing-2', value: '0.5rem', category: 'spacing', namespace: 'spacing' },
        { name: 'color-primary', value: 'blue', category: 'color', namespace: 'color' },
      ];

      const result = toDTCG(tokens);

      expect(result.spacing).toBeDefined();
      expect(result.color).toBeDefined();
    });

    it('should add $type based on category', () => {
      const tokens: Token[] = [
        { name: 'color-primary', value: 'blue', category: 'color', namespace: 'color' },
        { name: 'spacing-4', value: '1rem', category: 'spacing', namespace: 'spacing' },
        { name: 'duration-fast', value: '150ms', category: 'duration', namespace: 'motion' },
      ];

      const result = toDTCG(tokens, { applyTypesToGroup: false });

      const colorToken = (result.color as Record<string, unknown>).primary as Record<
        string,
        unknown
      >;
      expect(colorToken.$type).toBe('color');

      const spacingToken = (result.spacing as Record<string, unknown>)['4'] as Record<
        string,
        unknown
      >;
      expect(spacingToken.$type).toBe('dimension');

      const durationToken = (result.duration as Record<string, unknown>).fast as Record<
        string,
        unknown
      >;
      expect(durationToken.$type).toBe('duration');
    });

    it('should include $description from token description', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-4',
          value: '1rem',
          category: 'spacing',
          namespace: 'spacing',
          description: 'Standard spacing unit',
        },
      ];

      const result = toDTCG(tokens);
      const token = (result.spacing as Record<string, unknown>)['4'] as Record<string, unknown>;

      expect(token.$description).toBe('Standard spacing unit');
    });

    it('should use semanticMeaning as fallback for $description', () => {
      const tokens: Token[] = [
        {
          name: 'color-primary',
          value: 'blue',
          category: 'color',
          namespace: 'color',
          semanticMeaning: 'Primary brand color',
        },
      ];

      const result = toDTCG(tokens);
      const token = (result.color as Record<string, unknown>).primary as Record<string, unknown>;

      expect(token.$description).toBe('Primary brand color');
    });
  });

  describe('nesting options', () => {
    it('should nest tokens by path when nested=true', () => {
      const tokens: Token[] = [
        { name: 'color-neutral-500', value: 'gray', category: 'color', namespace: 'color' },
      ];

      const result = toDTCG(tokens, { nested: true });

      expect(result.color).toBeDefined();
      expect((result.color as Record<string, unknown>).neutral).toBeDefined();
      expect(
        ((result.color as Record<string, unknown>).neutral as Record<string, unknown>)['500'],
      ).toBeDefined();
    });

    it('should flatten tokens when nested=false', () => {
      const tokens: Token[] = [
        { name: 'color-neutral-500', value: 'gray', category: 'color', namespace: 'color' },
      ];

      const result = toDTCG(tokens, { nested: false });

      expect(result['color-neutral-500']).toBeDefined();
    });
  });

  describe('extensions', () => {
    it('should include rafters extensions when includeExtensions=true', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-4',
          value: '1rem',
          category: 'spacing',
          namespace: 'spacing',
          semanticMeaning: 'Standard spacing',
          progressionSystem: 'minor-third',
          dependsOn: ['spacing-base'],
        },
      ];

      const result = toDTCG(tokens, { includeExtensions: true });
      const token = (result.spacing as Record<string, unknown>)['4'] as Record<string, unknown>;

      expect(token.$extensions).toBeDefined();
      expect((token.$extensions as Record<string, unknown>).rafters).toBeDefined();

      const rafters = (token.$extensions as Record<string, unknown>).rafters as Record<
        string,
        unknown
      >;
      expect(rafters.semanticMeaning).toBe('Standard spacing');
      expect(rafters.progressionSystem).toBe('minor-third');
      expect(rafters.dependsOn).toEqual(['spacing-base']);
    });

    it('should exclude extensions when includeExtensions=false', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-4',
          value: '1rem',
          category: 'spacing',
          namespace: 'spacing',
          semanticMeaning: 'Standard spacing',
        },
      ];

      const result = toDTCG(tokens, { includeExtensions: false });
      const token = (result.spacing as Record<string, unknown>)['4'] as Record<string, unknown>;

      expect(token.$extensions).toBeUndefined();
    });
  });

  describe('designer intent extensions', () => {
    it('should include userOverride in extensions', () => {
      const tokens: Token[] = [
        {
          name: 'color-primary',
          value: 'oklch(0.6 0.2 260)',
          category: 'color',
          namespace: 'color',
          userOverride: {
            previousValue: 'oklch(0.5 0.15 260)',
            reason: 'Brand refresh Q1',
            context: 'Marketing campaign',
          },
        },
      ];

      const result = toDTCG(tokens, { applyTypesToGroup: false });
      const token = (result.color as Record<string, unknown>).primary as Record<string, unknown>;
      const rafters = (token.$extensions as Record<string, unknown>).rafters as Record<
        string,
        unknown
      >;

      expect(rafters.userOverride).toEqual({
        previousValue: 'oklch(0.5 0.15 260)',
        reason: 'Brand refresh Q1',
        context: 'Marketing campaign',
      });
    });

    it('should include computedValue as converted value', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-8',
          value: '2rem',
          category: 'spacing',
          namespace: 'spacing',
          computedValue: '32px',
        },
      ];

      const result = toDTCG(tokens);
      const token = (result.spacing as Record<string, unknown>)['8'] as Record<string, unknown>;
      const rafters = (token.$extensions as Record<string, unknown>).rafters as Record<
        string,
        unknown
      >;

      expect(rafters.computedValue).toBe('32px');
    });

    it('should include generationRule string', () => {
      const tokens: Token[] = [
        {
          name: 'spacing-8',
          value: '2rem',
          category: 'spacing',
          namespace: 'spacing',
          generationRule: 'calc({spacing-base}*8)',
        },
      ];

      const result = toDTCG(tokens);
      const token = (result.spacing as Record<string, unknown>)['8'] as Record<string, unknown>;
      const rafters = (token.$extensions as Record<string, unknown>).rafters as Record<
        string,
        unknown
      >;

      expect(rafters.generationRule).toBe('calc({spacing-base}*8)');
    });
  });

  describe('relationship extensions', () => {
    it('should include pairedWith and conflictsWith arrays', () => {
      const tokens: Token[] = [
        {
          name: 'color-primary',
          value: 'blue',
          category: 'color',
          namespace: 'color',
          pairedWith: ['color-on-primary'],
          conflictsWith: ['color-secondary'],
        },
      ];

      const result = toDTCG(tokens, { applyTypesToGroup: false });
      const token = (result.color as Record<string, unknown>).primary as Record<string, unknown>;
      const rafters = (token.$extensions as Record<string, unknown>).rafters as Record<
        string,
        unknown
      >;

      expect(rafters.pairedWith).toEqual(['color-on-primary']);
      expect(rafters.conflictsWith).toEqual(['color-secondary']);
    });

    it('should not include empty relationship arrays', () => {
      const tokens: Token[] = [
        {
          name: 'color-primary',
          value: 'blue',
          category: 'color',
          namespace: 'color',
          pairedWith: [],
          conflictsWith: [],
          applicableComponents: [],
          requiredForComponents: [],
        },
      ];

      const result = toDTCG(tokens, { applyTypesToGroup: false });
      const token = (result.color as Record<string, unknown>).primary as Record<string, unknown>;

      // No extensions at all since everything is empty
      expect(token.$extensions).toBeUndefined();
    });
  });

  describe('type inheritance', () => {
    it('should apply $type to groups when all children share same type', () => {
      const tokens: Token[] = [
        { name: 'color-primary', value: 'blue', category: 'color', namespace: 'color' },
        { name: 'color-secondary', value: 'green', category: 'color', namespace: 'color' },
      ];

      const result = toDTCG(tokens, { applyTypesToGroup: true });
      const colorGroup = result.color as Record<string, unknown>;

      expect(colorGroup.$type).toBe('color');
      // Individual tokens should not have $type since it's on the group
      expect((colorGroup.primary as Record<string, unknown>).$type).toBeUndefined();
    });
  });

  describe('deprecated tokens', () => {
    it('should include $deprecated marker', () => {
      const tokens: Token[] = [
        {
          name: 'old-spacing',
          value: '1rem',
          category: 'spacing',
          namespace: 'spacing',
          deprecated: true,
        },
      ];

      const result = toDTCG(tokens);
      const token = (result.old as Record<string, unknown>).spacing as Record<string, unknown>;

      expect(token.$deprecated).toBe(true);
    });
  });
});

describe('toDTCGByNamespace', () => {
  it('should convert tokens organized by namespace', () => {
    const byNamespace = new Map<string, Token[]>([
      ['color', [{ name: 'color-primary', value: 'blue', category: 'color', namespace: 'color' }]],
      [
        'spacing',
        [{ name: 'spacing-4', value: '1rem', category: 'spacing', namespace: 'spacing' }],
      ],
    ]);

    const result = toDTCGByNamespace(byNamespace);

    expect(result.size).toBe(2);
    expect(result.has('color')).toBe(true);
    expect(result.has('spacing')).toBe(true);
  });
});
