import { describe, expect, it } from 'vitest';
import {
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
    expect(h1).toContain('text-foreground');
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

describe('color is a fill signature', () => {
  it('a plain word emits text-{word}', () => {
    expect(resolveTypography('p', { color: 'accent' })).toContain('text-accent');
  });

  it('an invalid signature emits nothing for the color dimension', () => {
    // Empty override string is skipped; the variant default still lands.
    expect(resolveTypography('p', { color: 'foreground' })).toContain('text-foreground');
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
