import { describe, expect, it, vi } from 'vitest';
import {
  COLOR,
  resolveTypography,
  tokenPropsToClasses,
  typographyClasses,
} from '../../../src/components/typography/typography.classes';

describe('resolveTypography variant defaults', () => {
  it('h1 carries its dimensional defaults and the CQ upscale', () => {
    const h1 = resolveTypography('h1');
    expect(h1).toContain('text-4xl');
    expect(h1).toContain('font-bold');
    expect(h1).toContain('tracking-tight');
    expect(h1).toContain('scroll-m-20');
    expect(h1).toContain('@lg:text-5xl');
  });

  it('p is body flow, small tightens its leading', () => {
    expect(resolveTypography('p')).toContain('leading-7');
    expect(resolveTypography('small')).toContain('text-sm');
    expect(resolveTypography('small')).toContain('leading-none');
  });

  it('code and codeblock are monospace surfaces', () => {
    const code = resolveTypography('code');
    expect(code).toContain('font-mono');
    expect(code).toContain('bg-muted');
    expect(resolveTypography('codeblock')).toContain('overflow-x-auto');
  });

  it('lists carry their marker layout', () => {
    expect(resolveTypography('ul')).toContain('list-disc');
    expect(resolveTypography('ol')).toContain('list-decimal');
  });
});

describe('token-prop overrides', () => {
  it('replace the matching dimension, not append to it', () => {
    const h1 = resolveTypography('h1', { size: '2xl' });
    expect(h1).toContain('text-2xl');
    expect(h1).not.toContain('text-4xl');
  });

  it('a size override suppresses the CQ default on the same dimension', () => {
    const h1 = resolveTypography('h1', { size: '2xl' });
    expect(h1).not.toContain('@lg:text-5xl');
  });

  it('a non-size override leaves the CQ default surviving', () => {
    const h1 = resolveTypography('h1', { weight: 'black' });
    expect(h1).toContain('font-black');
    expect(h1).not.toContain('font-bold');
    expect(h1).toContain('@lg:text-5xl');
  });
});

describe('color resolves through a literal map', () => {
  it('a mapped colour emits its whole text class', () => {
    expect(resolveTypography('p', { color: 'muted-foreground' }).split(' ')).toContain(
      'text-muted-foreground',
    );
  });

  it('an unmapped value, a retired v2 signature included, emits no colour class', () => {
    for (const value of ['muted', 'muted/50', 'primary-to-accent', 'accent']) {
      expect(tokenPropsToClasses({ color: value })).toBe('');
    }
  });
});

describe('text colour inherits unless the variant paints a background (#2888)', () => {
  const textColour = (classes: string) =>
    classes.split(' ').filter((c) => Object.values(COLOR).includes(c));

  it('a variant with no background sets no text colour', () => {
    const inheriting = [
      'h1',
      'h2',
      'h3',
      'h4',
      'p',
      'lead',
      'large',
      'small',
      'blockquote',
      'ul',
      'ol',
      'li',
      'abbr',
    ] as const;
    for (const variant of inheriting) {
      expect(textColour(resolveTypography(variant)), variant).toEqual([]);
    }
  });

  it('a variant that paints a background keeps its paired foreground', () => {
    expect(textColour(resolveTypography('code'))).toEqual(['text-foreground']);
    expect(textColour(resolveTypography('codeblock'))).toEqual(['text-foreground']);
    expect(textColour(resolveTypography('mark'))).toEqual(['text-accent-foreground']);
  });

  it('muted keeps muted-foreground', () => {
    expect(textColour(resolveTypography('muted'))).toEqual(['text-muted-foreground']);
  });

  it('the color prop sets the colour on every variant', () => {
    for (const variant of Object.keys(typographyClasses) as (keyof typeof typographyClasses)[]) {
      expect(textColour(resolveTypography(variant, { color: 'primary' })), variant).toEqual([
        'text-primary',
      ]);
    }
  });
});

describe('fill, then color, then the variant default (#2860)', () => {
  const VARIANTS = Object.keys(typographyClasses) as (keyof typeof typographyClasses)[];
  const textColour = (classes: string) =>
    classes.split(' ').filter((c) => Object.values(COLOR).includes(c));

  it('a fill replaces the variant default colour on every variant', () => {
    for (const variant of VARIANTS) {
      const classes = resolveTypography(variant, { fill: 'bg-fill-blaze' });
      expect(classes.split(' '), variant).toContain('bg-fill-blaze');
      expect(textColour(classes), variant).toEqual([]);
    }
  });

  it('a fill wins over the color prop', () => {
    const classes = resolveTypography('h1', { fill: 'bg-fill-blaze', color: 'primary' });
    expect(classes.split(' ')).toContain('bg-fill-blaze');
    expect(textColour(classes)).toEqual([]);
  });

  it('a fill replaces the variant surface and keeps its other dimensions', () => {
    const mark = resolveTypography('mark', { fill: 'bg-fill-blaze' }).split(' ');
    expect(mark).not.toContain('bg-accent');
    expect(mark).toContain('px-1');
    const code = resolveTypography('code', { fill: 'bg-fill-blaze' }).split(' ');
    expect(code).not.toContain('bg-muted');
    expect(code).toContain('font-mono');
  });

  it('a value that is not one bg-fill- token is dropped and the colour stands', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const classes = resolveTypography('h1', { fill: 'bg-red-500', color: 'primary' }).split(' ');
    expect(classes).not.toContain('bg-red-500');
    expect(classes).toContain('text-primary');
    expect(resolveTypography('mark', { fill: 'muted/50' })).toBe(resolveTypography('mark'));
    warn.mockRestore();
  });
});

describe('emit path in isolation', () => {
  it('tokenPropsToClasses emits only the given dimensions, no defaults', () => {
    expect(tokenPropsToClasses({ size: 'lg', weight: 'bold' })).toBe('text-lg font-bold');
    expect(tokenPropsToClasses({})).toBe('');
  });

  it('typographyClasses is the baseline map with no overrides', () => {
    expect(typographyClasses.p).toBe(resolveTypography('p'));
    expect(typographyClasses.h1).toContain('text-4xl');
  });
});
