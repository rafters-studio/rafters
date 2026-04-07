import { describe, expect, it } from 'vitest';
import {
  atRule,
  composeDeclarations,
  mixin,
  pick,
  styleRule,
  stylesheet,
  tokenVar,
  transition,
  when,
} from './classy-wc';

describe('composeDeclarations', () => {
  it('renders a single property map', () => {
    const result = composeDeclarations({ display: 'block', color: 'red' });
    expect(result).toContain('display: block;');
    expect(result).toContain('color: red;');
  });

  it('merges multiple property maps (later wins)', () => {
    const result = composeDeclarations({ color: 'red', display: 'block' }, { color: 'blue' });
    expect(result).toContain('color: blue;');
    expect(result).toContain('display: block;');
    expect(result).not.toContain('color: red;');
  });

  it('handles raw CSS strings', () => {
    const result = composeDeclarations({ display: 'block' }, 'content: "";');
    expect(result).toContain('display: block;');
    expect(result).toContain('content: "";');
  });

  it('filters null, undefined, and false inputs', () => {
    const result = composeDeclarations(null, { display: 'block' }, undefined, false, {
      color: 'red',
    });
    expect(result).toContain('display: block;');
    expect(result).toContain('color: red;');
  });

  it('flattens nested arrays', () => {
    const result = composeDeclarations([
      { display: 'block' },
      [{ color: 'red' }, { 'font-size': '1rem' }],
    ]);
    expect(result).toContain('display: block;');
    expect(result).toContain('color: red;');
    expect(result).toContain('font-size: 1rem;');
  });

  it('returns empty string for all-null inputs', () => {
    const result = composeDeclarations(null, undefined, false);
    expect(result).toBe('');
  });
});

describe('styleRule', () => {
  it('wraps declarations in a selector block', () => {
    const result = styleRule(':host', { display: 'block' });
    expect(result).toBe(':host {\n  display: block;\n}');
  });

  it('composes multiple inputs', () => {
    const result = styleRule('.card', { 'background-color': 'white' }, { 'border-radius': '4px' });
    expect(result).toContain('.card {');
    expect(result).toContain('background-color: white;');
    expect(result).toContain('border-radius: 4px;');
    expect(result).toContain('}');
  });

  it('returns empty string when all inputs are null', () => {
    expect(styleRule(':host', null, false)).toBe('');
  });
});

describe('stylesheet', () => {
  it('joins multiple rules with blank lines', () => {
    const result = stylesheet(
      styleRule(':host', { display: 'block' }),
      styleRule('.inner', { color: 'red' }),
    );
    expect(result).toContain(':host {');
    expect(result).toContain('.inner {');
    expect(result).toContain('\n\n');
  });

  it('filters empty rules', () => {
    const result = stylesheet(
      styleRule(':host', { display: 'block' }),
      '',
      styleRule('.inner', { color: 'red' }),
    );
    const ruleCount = (result.match(/\{/g) ?? []).length;
    expect(ruleCount).toBe(2);
  });
});

describe('when', () => {
  it('returns inputs when condition is truthy', () => {
    const result = composeDeclarations({ display: 'block' }, when(true, { color: 'red' }));
    expect(result).toContain('color: red;');
  });

  it('returns null when condition is falsy', () => {
    const result = composeDeclarations({ display: 'block' }, when(false, { color: 'red' }));
    expect(result).not.toContain('color: red;');
  });

  it('works with undefined condition', () => {
    const result = composeDeclarations({ display: 'block' }, when(undefined, { color: 'red' }));
    expect(result).not.toContain('color: red;');
  });
});

describe('pick', () => {
  const variants = {
    primary: { 'background-color': 'blue', color: 'white' },
    destructive: { 'background-color': 'red', color: 'white' },
  };

  it('picks the matching variant', () => {
    const result = composeDeclarations(pick(variants, 'primary'));
    expect(result).toContain('background-color: blue;');
  });

  it('uses fallback when key is undefined', () => {
    const result = composeDeclarations(pick(variants, undefined as unknown as string, 'primary'));
    expect(result).toContain('background-color: blue;');
  });

  it('returns null for missing key without fallback', () => {
    const result = composeDeclarations(pick(variants, 'ghost' as 'primary'));
    expect(result).toBe('');
  });
});

describe('atRule', () => {
  it('wraps rules in an at-rule block', () => {
    const result = atRule(
      '@media (prefers-reduced-motion: reduce)',
      styleRule(':host', { transition: 'none' }),
    );
    expect(result).toContain('@media (prefers-reduced-motion: reduce) {');
    expect(result).toContain(':host {');
    expect(result).toContain('transition: none;');
  });

  it('returns empty string when inner rules are empty', () => {
    expect(atRule('@media print', '')).toBe('');
  });
});

describe('mixin', () => {
  it('returns the same properties object', () => {
    const props = { outline: 'none', 'box-shadow': '0 0 0 2px blue' };
    expect(mixin(props)).toBe(props);
  });

  it('composes into styleRule', () => {
    const focusRing = mixin({ outline: 'none', 'box-shadow': '0 0 0 2px blue' });
    const result = styleRule(':host(:focus-visible)', focusRing);
    expect(result).toContain('outline: none;');
    expect(result).toContain('box-shadow: 0 0 0 2px blue;');
  });
});

describe('tokenVar', () => {
  it('generates var() without fallback', () => {
    expect(tokenVar('color-primary')).toBe('var(--color-primary)');
  });

  it('generates var() with fallback', () => {
    expect(tokenVar('color-card', '#fff')).toBe('var(--color-card, #fff)');
  });
});

describe('transition', () => {
  it('builds transition shorthand', () => {
    const result = transition(['background-color', 'box-shadow'], '150ms');
    expect(result).toBe('background-color 150ms ease, box-shadow 150ms ease');
  });

  it('accepts custom easing', () => {
    const result = transition(['opacity'], '200ms', 'ease-in-out');
    expect(result).toBe('opacity 200ms ease-in-out');
  });
});

describe('integration: card-like stylesheet', () => {
  it('builds a complete component stylesheet', () => {
    const base = { 'background-color': 'var(--color-card)', 'border-radius': 'var(--radius-lg)' };
    const hover = { 'background-color': 'var(--color-card-hover)' };

    const css = stylesheet(
      styleRule(':host', { display: 'block' }),
      styleRule('.card', base),
      styleRule('.card:hover', hover),
      atRule('@media (prefers-reduced-motion: reduce)', styleRule('.card', { transition: 'none' })),
    );

    expect(css).toContain(':host {\n  display: block;\n}');
    expect(css).toContain('background-color: var(--color-card);');
    expect(css).toContain('.card:hover {');
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {');
  });
});
