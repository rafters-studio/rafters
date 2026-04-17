/**
 * Tests for typography.styles.ts
 *
 * Assertions target the CSS text produced by typographyStylesheet -- we
 * verify the var() references exist, not that they resolve to real values.
 * Resolver wiring lives in resolve-tokens.ts and is covered separately.
 */

import { describe, expect, it } from 'vitest';
import {
  resolveVariant,
  type TypographyVariant,
  tokenOverridesToProperties,
  typographyStylesheet,
  variantToCompositeRole,
  variantToTag,
} from './typography.styles';

describe('typographyStylesheet', () => {
  it('defaults to variant p when no options provided', () => {
    const css = typographyStylesheet();
    expect(css).toContain(':host {');
    expect(css).toContain('display: block');
    expect(css).toContain('var(--font-body-medium-size)');
  });

  it('emits :host display block for h1', () => {
    expect(typographyStylesheet({ variant: 'h1' })).toContain('display: block');
  });

  it('emits :host display inline for small', () => {
    expect(typographyStylesheet({ variant: 'small' })).toContain('display: inline');
  });

  it('emits :host display inline for code, mark, abbr', () => {
    for (const variant of ['code', 'mark', 'abbr'] as const) {
      expect(typographyStylesheet({ variant })).toContain('display: inline');
    }
  });

  it('emits :host display block for p, h2, h3, h4, blockquote, ul, ol, li, codeblock, lead, large, muted', () => {
    for (const variant of [
      'p',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'ul',
      'ol',
      'li',
      'codeblock',
      'lead',
      'large',
      'muted',
    ] as const) {
      expect(typographyStylesheet({ variant })).toContain('display: block');
    }
  });

  it('h1 references display-large composite tokens', () => {
    const css = typographyStylesheet({ variant: 'h1' });
    expect(css).toContain('var(--font-display-large-family)');
    expect(css).toContain('var(--font-display-large-size)');
    expect(css).toContain('var(--font-display-large-weight)');
    expect(css).toContain('var(--font-display-large-line-height)');
    expect(css).toContain('var(--font-display-large-letter-spacing)');
  });

  it('h2 references display-medium composite tokens', () => {
    const css = typographyStylesheet({ variant: 'h2' });
    expect(css).toContain('var(--font-display-medium-family)');
    expect(css).toContain('var(--font-display-medium-size)');
    expect(css).toContain('var(--font-display-medium-weight)');
    expect(css).toContain('var(--font-display-medium-line-height)');
    expect(css).toContain('var(--font-display-medium-letter-spacing)');
  });

  it('h3 references title-large composite tokens', () => {
    const css = typographyStylesheet({ variant: 'h3' });
    expect(css).toContain('var(--font-title-large-family)');
    expect(css).toContain('var(--font-title-large-size)');
  });

  it('h4 references title-medium composite tokens', () => {
    const css = typographyStylesheet({ variant: 'h4' });
    expect(css).toContain('var(--font-title-medium-family)');
    expect(css).toContain('var(--font-title-medium-size)');
  });

  it('lead references body-large composite tokens and uses muted foreground', () => {
    const css = typographyStylesheet({ variant: 'lead' });
    expect(css).toContain('var(--font-body-large-size)');
    expect(css).toContain('var(--color-muted-foreground)');
  });

  it('large references body-large composite tokens with semibold weight override', () => {
    const css = typographyStylesheet({ variant: 'large' });
    expect(css).toContain('var(--font-body-large-size)');
    expect(css).toContain('var(--font-weight-semibold)');
  });

  it('small references body-small composite tokens with medium weight override', () => {
    const css = typographyStylesheet({ variant: 'small' });
    expect(css).toContain('var(--font-body-small-size)');
    expect(css).toContain('var(--font-weight-medium)');
  });

  it('muted references body-small composite tokens and uses muted foreground', () => {
    const css = typographyStylesheet({ variant: 'muted' });
    expect(css).toContain('var(--font-body-small-size)');
    expect(css).toContain('var(--color-muted-foreground)');
  });

  it('code references code-small composite tokens and emits muted background', () => {
    const css = typographyStylesheet({ variant: 'code' });
    expect(css).toContain('var(--font-code-small-size)');
    expect(css).toContain('var(--color-muted)');
  });

  it('blockquote variant adds border-left and italic', () => {
    const css = typographyStylesheet({ variant: 'blockquote' });
    expect(css).toContain('font-style: italic');
    expect(css).toContain('border-left');
    expect(css).toContain('var(--color-border)');
  });

  it('ul variant sets list-style-type disc', () => {
    const css = typographyStylesheet({ variant: 'ul' });
    expect(css).toContain('list-style-type: disc');
  });

  it('ol variant sets list-style-type decimal', () => {
    const css = typographyStylesheet({ variant: 'ol' });
    expect(css).toContain('list-style-type: decimal');
  });

  it('li variant references body-medium composite tokens', () => {
    const css = typographyStylesheet({ variant: 'li' });
    expect(css).toContain('var(--font-body-medium-size)');
  });

  it('codeblock variant uses pre styling with overflow', () => {
    const css = typographyStylesheet({ variant: 'codeblock' });
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('var(--color-muted)');
  });

  it('mark variant uses accent background', () => {
    const css = typographyStylesheet({ variant: 'mark' });
    expect(css).toContain('var(--color-accent)');
    expect(css).toContain('var(--color-accent-foreground)');
  });

  it('abbr variant sets cursor help and dotted underline', () => {
    const css = typographyStylesheet({ variant: 'abbr' });
    expect(css).toContain('cursor: help');
    expect(css).toContain('text-decoration-style: dotted');
  });

  it('size override emits font-size after the composite block', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { size: 'xl' } });
    const composite = css.indexOf('var(--font-body-medium-size)');
    const override = css.lastIndexOf('var(--font-size-xl)');
    expect(composite).toBeGreaterThanOrEqual(0);
    expect(override).toBeGreaterThan(composite);
  });

  it('weight override resolves to font-weight token reference', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { weight: 'bold' } });
    expect(css).toContain('var(--font-weight-bold)');
  });

  it('color override resolves bare token names', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { color: 'muted-foreground' } });
    expect(css).toContain('var(--color-muted-foreground)');
  });

  it('line override resolves to line-height token reference', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { line: 'relaxed' } });
    expect(css).toContain('var(--line-height-relaxed)');
  });

  it('tracking override resolves to letter-spacing token reference', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { tracking: 'tight' } });
    expect(css).toContain('var(--letter-spacing-tight)');
  });

  it('family override resolves to font-{role} token reference', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { family: 'heading' } });
    expect(css).toContain('var(--font-heading)');
  });

  it('align override emits literal text-align value, not a token reference', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { align: 'center' } });
    expect(css).toContain('text-align: center');
    expect(css).not.toContain('var(--text-align');
  });

  it('transform override emits literal text-transform value', () => {
    const css = typographyStylesheet({ variant: 'p', overrides: { transform: 'uppercase' } });
    expect(css).toContain('text-transform: uppercase');
    expect(css).not.toContain('var(--text-transform');
  });

  it('variantToCompositeRole maps every variant to a non-empty role', () => {
    for (const role of Object.values(variantToCompositeRole)) {
      expect(role).toBeTruthy();
    }
  });

  it('variantToCompositeRole covers every declared variant', () => {
    const variants: TypographyVariant[] = [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'lead',
      'large',
      'small',
      'muted',
      'code',
      'blockquote',
      'ul',
      'ol',
      'li',
      'codeblock',
      'mark',
      'abbr',
    ];
    for (const v of variants) {
      expect(variantToCompositeRole[v]).toBeTruthy();
      expect(variantToTag[v]).toBeTruthy();
    }
  });

  it('unknown variant falls back to p without throwing', () => {
    // Cast guards exist for runtime safety -- we test that path directly.
    const css = typographyStylesheet({ variant: 'bogus' as unknown as TypographyVariant });
    expect(css).toContain('var(--font-body-medium-size)');
    expect(css).toContain('display: block');
  });

  it('codeblock variant picks <pre> tag in variantToTag', () => {
    expect(variantToTag.codeblock).toBe('pre');
  });

  it('emits CSS without any raw --duration-* or --ease-* references', () => {
    const variants: TypographyVariant[] = [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'lead',
      'large',
      'small',
      'muted',
      'code',
      'blockquote',
      'ul',
      'ol',
      'li',
      'codeblock',
      'mark',
      'abbr',
    ];
    for (const v of variants) {
      const css = typographyStylesheet({ variant: v });
      expect(css).not.toMatch(/var\(--duration-/);
      expect(css).not.toMatch(/var\(--ease-/);
    }
  });
});

describe('resolveVariant', () => {
  it('returns p for null', () => {
    expect(resolveVariant(null)).toBe('p');
  });

  it('returns p for empty string', () => {
    expect(resolveVariant('')).toBe('p');
  });

  it('returns p for unknown variant', () => {
    expect(resolveVariant('totally-bogus')).toBe('p');
  });

  it('returns the variant when known', () => {
    expect(resolveVariant('h1')).toBe('h1');
    expect(resolveVariant('codeblock')).toBe('codeblock');
  });

  it('never throws on unknown input', () => {
    expect(() => resolveVariant(undefined)).not.toThrow();
    expect(() => resolveVariant(42)).not.toThrow();
    expect(() => resolveVariant({})).not.toThrow();
  });
});

describe('tokenOverridesToProperties', () => {
  it('emits no properties for empty overrides', () => {
    const props = tokenOverridesToProperties({});
    expect(Object.keys(props).length).toBe(0);
  });

  it('maps all six token-backed keys to var() references', () => {
    const props = tokenOverridesToProperties({
      size: 'lg',
      weight: 'semibold',
      color: 'primary',
      line: 'relaxed',
      tracking: 'tight',
      family: 'heading',
    });
    expect(props['font-size']).toBe('var(--font-size-lg)');
    expect(props['font-weight']).toBe('var(--font-weight-semibold)');
    expect(props.color).toBe('var(--color-primary)');
    expect(props['line-height']).toBe('var(--line-height-relaxed)');
    expect(props['letter-spacing']).toBe('var(--letter-spacing-tight)');
    expect(props['font-family']).toBe('var(--font-heading)');
  });

  it('emits align and transform as literal values (no var())', () => {
    const props = tokenOverridesToProperties({ align: 'right', transform: 'lowercase' });
    expect(props['text-align']).toBe('right');
    expect(props['text-transform']).toBe('lowercase');
  });
});
