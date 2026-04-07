/**
 * Fill token generator tests
 */

import { describe, expect, it } from 'vitest';
import type { FillDef } from '../../src/generators/defaults';
import { generateFillTokens } from '../../src/generators/fill';
import { DEFAULT_SYSTEM_CONFIG, resolveConfig } from '../../src/generators/types';

const config = resolveConfig(DEFAULT_SYSTEM_CONFIG);

describe('generateFillTokens', () => {
  it('generates tokens from default definitions', () => {
    const defs: Record<string, FillDef> = {
      surface: {
        color: 'neutral-900',
        foreground: 'neutral-100',
        meaning: 'Primary content surface',
        contexts: ['surface'],
      },
      overlay: {
        color: 'neutral-950',
        opacity: 0.8,
        backdropBlur: 'sm',
        foreground: 'neutral-50',
        meaning: 'Modal backdrop',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);

    expect(result.namespace).toBe('fill');
    expect(result.tokens).toHaveLength(2);
    expect(result.tokens[0].name).toBe('fill-surface');
    expect(result.tokens[1].name).toBe('fill-overlay');
  });

  it('sets correct namespace and category on all tokens', () => {
    const defs: Record<string, FillDef> = {
      surface: {
        color: 'neutral-900',
        meaning: 'Surface',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    expect(token.namespace).toBe('fill');
    expect(token.category).toBe('fill');
  });

  it('stores fill metadata as JSON in token value', () => {
    const defs: Record<string, FillDef> = {
      glass: {
        color: 'neutral-900',
        opacity: 0.6,
        backdropBlur: 'md',
        foreground: 'neutral-100',
        meaning: 'Glass morphism',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    const parsed = JSON.parse(token.value as string);
    expect(parsed.color).toBe('neutral-900');
    expect(parsed.opacity).toBe(0.6);
    expect(parsed.backdropBlur).toBe('md');
    expect(parsed.foreground).toBe('neutral-100');
  });

  it('generates gradient fill tokens', () => {
    const defs: Record<string, FillDef> = {
      hero: {
        gradient: {
          direction: 'to-b',
          stops: [{ color: 'primary' }, { color: 'primary', opacity: 0 }],
        },
        foreground: 'primary-foreground',
        meaning: 'Hero fade gradient',
        contexts: ['surface', 'text'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    const parsed = JSON.parse(token.value as string);
    expect(parsed.gradient.direction).toBe('to-b');
    expect(parsed.gradient.stops).toHaveLength(2);
    expect(parsed.gradient.stops[0].color).toBe('primary');
    expect(parsed.gradient.stops[1].opacity).toBe(0);
  });

  it('tracks color dependencies in dependsOn', () => {
    const defs: Record<string, FillDef> = {
      surface: {
        color: 'neutral-900',
        foreground: 'neutral-100',
        meaning: 'Surface',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    expect(token.dependsOn).toContain('neutral-900');
    expect(token.dependsOn).toContain('neutral-100');
  });

  it('tracks gradient stop dependencies', () => {
    const defs: Record<string, FillDef> = {
      hero: {
        gradient: {
          direction: 'to-b',
          stops: [{ color: 'primary' }, { color: 'accent' }],
        },
        meaning: 'Hero',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    expect(token.dependsOn).toContain('primary');
    expect(token.dependsOn).toContain('accent');
  });

  it('includes semantic meaning and usage context', () => {
    const defs: Record<string, FillDef> = {
      panel: {
        color: 'neutral-800',
        meaning: 'Elevated panel',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    expect(token.semanticMeaning).toBe('Elevated panel');
    expect(token.usageContext).toEqual(['surface']);
  });

  it('includes usage patterns with do/never', () => {
    const defs: Record<string, FillDef> = {
      surface: {
        color: 'neutral-900',
        meaning: 'Primary content surface',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    const token = result.tokens[0];

    expect(token.usagePatterns?.do).toBeDefined();
    expect(token.usagePatterns?.never).toBeDefined();
    expect(token.usagePatterns?.do?.length).toBeGreaterThan(0);
    expect(token.usagePatterns?.never?.length).toBeGreaterThan(0);
  });

  it('rejects fill with no color and no gradient', () => {
    const defs: Record<string, FillDef> = {
      invalid: {
        meaning: 'Bad fill',
        contexts: ['surface'],
      },
    };

    expect(() => generateFillTokens(config, defs)).toThrow(
      'Fill "invalid" must have either a color or gradient field',
    );
  });

  it('rejects gradient with fewer than 2 stops', () => {
    const defs: Record<string, FillDef> = {
      bad: {
        gradient: {
          direction: 'to-b',
          stops: [{ color: 'primary' }],
        },
        meaning: 'Bad gradient',
        contexts: ['surface'],
      },
    };

    expect(() => generateFillTokens(config, defs)).toThrow(
      'Fill "bad" gradient must have at least 2 stops',
    );
  });

  it('rejects invalid opacity values', () => {
    const defs: Record<string, FillDef> = {
      bad: {
        color: 'primary',
        opacity: 1.5,
        meaning: 'Bad opacity',
        contexts: ['surface'],
      },
    };

    expect(() => generateFillTokens(config, defs)).toThrow(
      'Fill "bad" opacity must be between 0 and 1',
    );
  });

  it('rejects invalid backdrop-blur sizes', () => {
    const defs: Record<string, FillDef> = {
      bad: {
        color: 'primary',
        backdropBlur: 'huge' as 'sm',
        meaning: 'Bad blur',
        contexts: ['surface'],
      },
    };

    expect(() => generateFillTokens(config, defs)).toThrow(
      'Fill "bad" backdropBlur must be one of',
    );
  });

  it('sets containerQueryAware to true', () => {
    const defs: Record<string, FillDef> = {
      surface: {
        color: 'neutral-900',
        meaning: 'Surface',
        contexts: ['surface'],
      },
    };

    const result = generateFillTokens(config, defs);
    expect(result.tokens[0].containerQueryAware).toBe(true);
  });

  it('generates correct scale positions', () => {
    const defs: Record<string, FillDef> = {
      surface: { color: 'neutral-900', meaning: 'Surface', contexts: ['surface'] },
      panel: { color: 'neutral-800', meaning: 'Panel', contexts: ['surface'] },
      overlay: { color: 'neutral-950', meaning: 'Overlay', contexts: ['surface'] },
    };

    const result = generateFillTokens(config, defs);

    expect(result.tokens[0].scalePosition).toBe(0);
    expect(result.tokens[1].scalePosition).toBe(1);
    expect(result.tokens[2].scalePosition).toBe(2);
  });
});
