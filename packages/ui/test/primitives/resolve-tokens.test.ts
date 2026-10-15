import { describe, expect, it } from 'vitest';
import {
  createResolver,
  MAX_REFERENCE_DEPTH,
  TokenResolver,
} from '../../src/primitives/resolve-tokens';

const sampleDTCG = {
  'font-size-sm': { $value: '0.875rem', $type: 'dimension' },
  'font-size-base': { $value: '1rem', $type: 'dimension' },
  'font-size-lg': { $value: '1.125rem', $type: 'dimension' },
  'font-weight-normal': { $value: '400', $type: 'fontWeight' },
  'font-weight-bold': { $value: '700', $type: 'fontWeight' },
  'font-sans': { $value: 'Inter, system-ui, sans-serif', $type: 'fontFamily' },
  'font-mono': { $value: 'JetBrains Mono, monospace', $type: 'fontFamily' },
  'line-height-tight': { $value: '1.25', $type: 'number' },
  'letter-spacing-wide': { $value: '0.025em', $type: 'dimension' },
  'spacing-4': { $value: '1rem', $type: 'dimension' },
  'spacing-8': { $value: '2rem', $type: 'dimension' },
  'radius-sm': { $value: '0.25rem', $type: 'dimension' },
  'radius-lg': { $value: '0.5rem', $type: 'dimension' },
  'shadow-sm': { $value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', $type: 'shadow' },
  'color-primary': { $value: 'oklch(0.208 0.042 266)', $type: 'color' },
  'color-card': { $value: 'oklch(0.985 0 0)', $type: 'color' },
};

describe('TokenResolver', () => {
  const resolver = createResolver(sampleDTCG);

  describe('get', () => {
    it('returns raw value for existing token', () => {
      expect(resolver.get('spacing-4')).toBe('1rem');
    });

    it('returns undefined for missing token', () => {
      expect(resolver.get('nonexistent')).toBeUndefined();
    });
  });

  describe('type', () => {
    it('returns DTCG type for existing token', () => {
      expect(resolver.type('color-primary')).toBe('color');
    });

    it('returns undefined for missing token', () => {
      expect(resolver.type('nonexistent')).toBeUndefined();
    });
  });

  describe('resolve', () => {
    it('resolves font-size token to CSS property-value pair', () => {
      expect(resolver.resolve('font-size-sm')).toEqual({
        property: 'font-size',
        value: '0.875rem',
      });
    });

    it('resolves font-weight token', () => {
      expect(resolver.resolve('font-weight-bold')).toEqual({
        property: 'font-weight',
        value: '700',
      });
    });

    it('resolves font-family token', () => {
      expect(resolver.resolve('font-sans')).toEqual({
        property: 'font-family',
        value: 'Inter, system-ui, sans-serif',
      });
    });

    it('resolves spacing token', () => {
      expect(resolver.resolve('spacing-4')).toEqual({
        property: 'gap',
        value: '1rem',
      });
    });

    it('resolves radius token', () => {
      expect(resolver.resolve('radius-lg')).toEqual({
        property: 'border-radius',
        value: '0.5rem',
      });
    });

    it('resolves shadow token', () => {
      expect(resolver.resolve('shadow-sm')).toEqual({
        property: 'box-shadow',
        value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      });
    });

    it('returns null for color tokens (no CSS property mapping)', () => {
      expect(resolver.resolve('color-primary')).toBeNull();
    });

    it('returns null for nonexistent token', () => {
      expect(resolver.resolve('nonexistent')).toBeNull();
    });
  });

  describe('resolveColor', () => {
    it('resolves color token to OKLCH string', () => {
      expect(resolver.resolveColor('color-primary')).toBe('oklch(0.208 0.042 266)');
    });

    it('returns null for missing color', () => {
      expect(resolver.resolveColor('color-nonexistent')).toBeNull();
    });
  });

  describe('resolveSpacing', () => {
    it('resolves spacing by short name', () => {
      expect(resolver.resolveSpacing('4')).toBe('1rem');
    });

    it('resolves spacing by full name', () => {
      expect(resolver.resolveSpacing('spacing-8')).toBe('2rem');
    });

    it('returns null for missing spacing', () => {
      expect(resolver.resolveSpacing('99')).toBeNull();
    });
  });

  describe('resolveRadius', () => {
    it('resolves radius by short name', () => {
      expect(resolver.resolveRadius('sm')).toBe('0.25rem');
    });

    it('resolves radius by full name', () => {
      expect(resolver.resolveRadius('radius-lg')).toBe('0.5rem');
    });

    it('returns null for missing radius', () => {
      expect(resolver.resolveRadius('xxxl')).toBeNull();
    });
  });

  describe('toCSS', () => {
    it('renders multiple tokens as CSS declarations', () => {
      const css = resolver.toCSS(['font-size-base', 'font-weight-bold', 'radius-lg']);
      expect(css).toContain('font-size: 1rem;');
      expect(css).toContain('font-weight: 700;');
      expect(css).toContain('border-radius: 0.5rem;');
    });

    it('skips unresolvable tokens', () => {
      const css = resolver.toCSS(['font-size-sm', 'nonexistent', 'radius-sm']);
      expect(css).toContain('font-size: 0.875rem;');
      expect(css).toContain('border-radius: 0.25rem;');
      expect(css).not.toContain('nonexistent');
    });

    it('returns empty string for no resolvable tokens', () => {
      expect(resolver.toCSS(['color-primary', 'nonexistent'])).toBe('');
    });
  });

  describe('has', () => {
    it('returns true for existing tokens', () => {
      expect(resolver.has('spacing-4')).toBe(true);
    });

    it('returns false for missing tokens', () => {
      expect(resolver.has('nonexistent')).toBe(false);
    });
  });

  describe('names', () => {
    it('returns all token names', () => {
      const names = resolver.names();
      expect(names).toContain('spacing-4');
      expect(names).toContain('color-primary');
      expect(names.length).toBe(Object.keys(sampleDTCG).length);
    });
  });
});

describe('createResolver', () => {
  it('creates a TokenResolver instance', () => {
    const resolver = createResolver(sampleDTCG);
    expect(resolver).toBeInstanceOf(TokenResolver);
  });

  it('works with empty DTCG input', () => {
    const resolver = createResolver({});
    expect(resolver.names()).toEqual([]);
    expect(resolver.get('anything')).toBeUndefined();
  });
});

describe('MAX_REFERENCE_DEPTH', () => {
  it('is exported as 16', () => {
    expect(MAX_REFERENCE_DEPTH).toBe(16);
  });
});

describe('resolveComposite', () => {
  it('resolves a typography composite to a CSS property map', () => {
    const dtcg = {
      'typography-h1': {
        $type: 'typography',
        $value: JSON.stringify({
          fontFamily: 'sans',
          fontSize: 'lg',
          fontWeight: 'bold',
          lineHeight: 'tight',
          letterSpacing: 'wide',
        }),
      },
      'font-sans': { $value: 'Inter, system-ui, sans-serif', $type: 'fontFamily' },
      'font-size-lg': { $value: '1.125rem', $type: 'dimension' },
      'font-weight-bold': { $value: '700', $type: 'fontWeight' },
      'line-height-tight': { $value: '1.25', $type: 'number' },
      'letter-spacing-wide': { $value: '0.025em', $type: 'dimension' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveComposite('typography-h1')).toEqual({
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': '1.125rem',
      'font-weight': '700',
      'line-height': '1.25',
      'letter-spacing': '0.025em',
    });
  });

  it('omits members whose target token is missing', () => {
    const dtcg = {
      'typography-h2': {
        $type: 'typography',
        $value: JSON.stringify({
          fontFamily: 'sans',
          fontSize: 'lg',
          fontWeight: 'bold',
          lineHeight: 'tight',
          letterSpacing: 'wide',
        }),
      },
      'font-size-lg': { $value: '1.125rem', $type: 'dimension' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveComposite('typography-h2')).toEqual({
      'font-size': '1.125rem',
    });
  });

  it('returns null when the composite root is missing', () => {
    const resolver = createResolver({});
    expect(resolver.resolveComposite('typography-h1')).toBeNull();
  });

  it('returns null when the target token is not a typography composite', () => {
    const resolver = createResolver({
      'font-size-sm': { $value: '0.875rem', $type: 'dimension' },
    });
    expect(resolver.resolveComposite('font-size-sm')).toBeNull();
  });

  it('walks DTCG references inside composite members', () => {
    const dtcg = {
      'typography-body': {
        $type: 'typography',
        $value: JSON.stringify({
          fontFamily: 'sans',
          fontSize: 'base',
          fontWeight: 'normal',
          lineHeight: 'normal',
          letterSpacing: 'normal',
        }),
      },
      'font-sans': { $value: '{font.family.inter}', $type: 'fontFamily' },
      'font-family-inter': { $value: 'Inter, system-ui, sans-serif', $type: 'fontFamily' },
      'font-size-base': { $value: '1rem', $type: 'dimension' },
      'font-weight-normal': { $value: '400', $type: 'fontWeight' },
      'line-height-normal': { $value: '1.5', $type: 'number' },
      'letter-spacing-normal': { $value: '0em', $type: 'dimension' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveComposite('typography-body')).toEqual({
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': '1rem',
      'font-weight': '400',
      'line-height': '1.5',
      'letter-spacing': '0em',
    });
  });

  it('throws structured invalid-composite error on bad JSON', () => {
    const dtcg = { 'typography-broken': { $type: 'typography', $value: 'not-json' } };
    const resolver = createResolver(dtcg);
    expect(() => resolver.resolveComposite('typography-broken')).toThrow(
      expect.objectContaining({ kind: 'invalid-composite', name: 'typography-broken' }),
    );
  });

  it('throws structured invalid-composite error when required keys missing', () => {
    const dtcg = {
      'typography-partial': {
        $type: 'typography',
        $value: JSON.stringify({ fontFamily: 'sans', fontSize: 'lg' }),
      },
    };
    const resolver = createResolver(dtcg);
    expect(() => resolver.resolveComposite('typography-partial')).toThrow(
      expect.objectContaining({ kind: 'invalid-composite', name: 'typography-partial' }),
    );
  });

  it('routing: resolve() returns null for a typography composite', () => {
    const dtcg = {
      'typography-h1': {
        $type: 'typography',
        $value: JSON.stringify({
          fontFamily: 'sans',
          fontSize: 'lg',
          fontWeight: 'bold',
          lineHeight: 'tight',
          letterSpacing: 'wide',
        }),
      },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolve('typography-h1')).toBeNull();
  });
});

describe('resolveReference', () => {
  it('walks a DTCG reference to its leaf value', () => {
    const dtcg = {
      'color-primary-500': { $value: 'oklch(0.6 0.2 250)', $type: 'color' },
      'color-button-bg': { $value: '{color.primary.500}', $type: 'color' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveReference('{color.button.bg}')).toBe('oklch(0.6 0.2 250)');
  });

  it('returns null for a non-reference value', () => {
    const resolver = createResolver({});
    expect(resolver.resolveReference('plain string')).toBeNull();
    expect(resolver.resolveReference(42)).toBeNull();
  });

  it('returns null when the reference target is missing', () => {
    const resolver = createResolver({});
    expect(resolver.resolveReference('{color.missing.500}')).toBeNull();
  });

  it('throws structured cycle error on a reference cycle', () => {
    const dtcg = {
      'a-x': { $value: '{b.x}' },
      'b-x': { $value: '{a.x}' },
    };
    const resolver = createResolver(dtcg);
    expect(() => resolver.resolveReference('{a.x}')).toThrow(
      expect.objectContaining({ kind: 'cycle', chain: expect.arrayContaining(['a-x', 'b-x']) }),
    );
  });

  it('throws structured max-depth error past MAX_REFERENCE_DEPTH', () => {
    const dtcg: Record<string, { $value: string }> = { leaf: { $value: 'final' } };
    for (let i = 0; i < 20; i++) {
      dtcg[`chain-${i}`] = { $value: i === 19 ? '{leaf}' : `{chain.${i + 1}}` };
    }
    const resolver = createResolver(dtcg);
    expect(() => resolver.resolveReference('{chain.0}')).toThrow(
      expect.objectContaining({ kind: 'max-depth', depth: 16 }),
    );
  });

  it('returns the leaf when a short chain terminates before MAX_REFERENCE_DEPTH', () => {
    const dtcg = {
      leaf: { $value: 'done' },
      'hop-2': { $value: '{leaf}' },
      'hop-1': { $value: '{hop.2}' },
      'hop-0': { $value: '{hop.1}' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveReference('{hop.0}')).toBe('done');
  });
});

describe('resolve with references', () => {
  it('walks references when resolving a single property token', () => {
    const dtcg = {
      'spacing-base': { $value: '1rem', $type: 'dimension' },
      'spacing-page': { $value: '{spacing.base}', $type: 'dimension' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolve('spacing-page')).toEqual({ property: 'gap', value: '1rem' });
  });

  it('returns null when the reference target is missing', () => {
    const dtcg = {
      'spacing-page': { $value: '{spacing.base}', $type: 'dimension' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolve('spacing-page')).toBeNull();
  });
});

describe('resolveColor with references', () => {
  it('walks references when resolving a color token', () => {
    const dtcg = {
      'color-primary-500': { $value: 'oklch(0.6 0.2 250)', $type: 'color' },
      'color-button-bg': { $value: '{color.primary.500}', $type: 'color' },
    };
    const resolver = createResolver(dtcg);
    expect(resolver.resolveColor('color-button-bg')).toBe('oklch(0.6 0.2 250)');
  });
});
