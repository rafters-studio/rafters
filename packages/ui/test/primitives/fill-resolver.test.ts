/**
 * Fill resolver tests -- dual-context resolution
 */

import { describe, expect, it } from 'vitest';
import {
  getFillMetadata,
  parseFillValue,
  registerFill,
  resolveFillClasses,
  resolveFillName,
} from '../../src/primitives/fill-resolver';

describe('parseFillValue', () => {
  it('parses valid JSON fill metadata', () => {
    const json = JSON.stringify({ color: 'neutral-900', opacity: 0.8 });
    const result = parseFillValue(json);

    expect(result).toEqual({ color: 'neutral-900', opacity: 0.8 });
  });

  it('returns null for invalid JSON', () => {
    expect(parseFillValue('not-json')).toBeNull();
  });
});

describe('resolveFillClasses - surface context', () => {
  it('resolves solid color fill', () => {
    const fill = { color: 'neutral-900', foreground: 'neutral-100' };
    expect(resolveFillClasses(fill, 'surface')).toBe('bg-neutral-900 text-neutral-100');
  });

  it('resolves color with opacity', () => {
    const fill = { color: 'neutral-900', opacity: 0.6, foreground: 'neutral-100' };
    expect(resolveFillClasses(fill, 'surface')).toBe('bg-neutral-900/60 text-neutral-100');
  });

  it('resolves color with opacity and backdrop blur', () => {
    const fill = {
      color: 'neutral-900',
      opacity: 0.6,
      backdropBlur: 'md',
      foreground: 'neutral-100',
    };
    expect(resolveFillClasses(fill, 'surface')).toBe(
      'bg-neutral-900/60 backdrop-blur-md text-neutral-100',
    );
  });

  it('resolves backdrop blur without opacity', () => {
    const fill = { color: 'neutral-950', backdropBlur: 'sm', foreground: 'neutral-50' };
    expect(resolveFillClasses(fill, 'surface')).toBe(
      'bg-neutral-950 backdrop-blur-sm text-neutral-50',
    );
  });

  it('resolves gradient fill', () => {
    const fill = {
      gradient: {
        direction: 'to-b',
        stops: [{ color: 'primary' }, { color: 'primary', opacity: 0 }],
      },
      foreground: 'primary-foreground',
    };
    expect(resolveFillClasses(fill, 'surface')).toBe(
      'bg-gradient-to-b from-primary to-primary/0 text-primary-foreground',
    );
  });

  it('resolves gradient with 3 stops', () => {
    const fill = {
      gradient: {
        direction: 'to-r',
        stops: [{ color: 'primary' }, { color: 'accent' }, { color: 'secondary' }],
      },
      foreground: 'primary-foreground',
    };
    expect(resolveFillClasses(fill, 'surface')).toBe(
      'bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground',
    );
  });

  it('resolves solid color without foreground', () => {
    const fill = { color: 'neutral-900' };
    expect(resolveFillClasses(fill, 'surface')).toBe('bg-neutral-900');
  });

  it('returns empty string for fill with no color or gradient', () => {
    expect(resolveFillClasses({}, 'surface')).toBe('');
  });

  it('resolves full opacity as solid (no /100 suffix)', () => {
    const fill = { color: 'primary', opacity: 1, foreground: 'primary-foreground' };
    expect(resolveFillClasses(fill, 'surface')).toBe('bg-primary text-primary-foreground');
  });
});

describe('resolveFillClasses - text context', () => {
  it('resolves simple color as text class', () => {
    const fill = { color: 'primary' };
    expect(resolveFillClasses(fill, 'text')).toBe('text-primary');
  });

  it('resolves color with opacity as text class', () => {
    const fill = { color: 'neutral-900', opacity: 0.6 };
    expect(resolveFillClasses(fill, 'text')).toBe('text-neutral-900/60');
  });

  it('resolves gradient as clipped text', () => {
    const fill = {
      gradient: {
        direction: 'to-r',
        stops: [{ color: 'primary' }, { color: 'primary', opacity: 0 }],
      },
    };
    expect(resolveFillClasses(fill, 'text')).toBe(
      'bg-gradient-to-r from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('ignores foreground and backdrop blur in text context', () => {
    const fill = {
      color: 'primary',
      foreground: 'primary-foreground',
      backdropBlur: 'md',
    };
    // Text context only produces text-* class, ignores surface properties
    expect(resolveFillClasses(fill, 'text')).toBe('text-primary');
  });
});

describe('resolveFillName - built-in registry', () => {
  it('resolves "surface" in surface context', () => {
    expect(resolveFillName('surface', 'surface')).toBe('bg-neutral-900 text-neutral-100');
  });

  it('resolves "panel" with opacity', () => {
    expect(resolveFillName('panel', 'surface')).toBe('bg-neutral-800/95 text-neutral-100');
  });

  it('resolves "overlay" with opacity and backdrop blur', () => {
    expect(resolveFillName('overlay', 'surface')).toBe(
      'bg-neutral-950/80 backdrop-blur-sm text-neutral-50',
    );
  });

  it('resolves "glass" with backdrop blur', () => {
    expect(resolveFillName('glass', 'surface')).toBe(
      'bg-neutral-900/60 backdrop-blur-md text-neutral-100',
    );
  });

  it('resolves "primary" in surface context', () => {
    expect(resolveFillName('primary', 'surface')).toBe('bg-primary text-primary-foreground');
  });

  it('resolves "hero" gradient in surface context', () => {
    expect(resolveFillName('hero', 'surface')).toBe(
      'bg-gradient-to-b from-primary to-primary/0 text-primary-foreground',
    );
  });

  it('resolves "hero" gradient in text context with bg-clip-text', () => {
    expect(resolveFillName('hero', 'text')).toBe(
      'bg-gradient-to-b from-primary to-primary/0 bg-clip-text text-transparent',
    );
  });

  it('resolves "primary" in text context to text-primary', () => {
    expect(resolveFillName('primary', 'text')).toBe('text-primary');
  });

  it('falls back to bg-{name} for unknown surface fill', () => {
    expect(resolveFillName('nope', 'surface')).toBe('bg-nope');
  });

  it('falls back to text-{name} for unknown text fill', () => {
    expect(resolveFillName('nope', 'text')).toBe('text-nope');
  });

  it('returns empty string for undefined name', () => {
    expect(resolveFillName(undefined, 'surface')).toBe('');
  });

  it('returns empty string for empty name', () => {
    expect(resolveFillName('', 'surface')).toBe('');
  });
});

describe('getFillMetadata', () => {
  it('returns metadata for known names', () => {
    expect(getFillMetadata('surface')).toEqual({
      color: 'neutral-900',
      foreground: 'neutral-100',
    });
  });

  it('returns undefined for unknown names', () => {
    expect(getFillMetadata('definitely-not-a-fill')).toBeUndefined();
  });
});

describe('registerFill', () => {
  it('registers a new fill that resolveFillName can find', () => {
    registerFill('custom-brand', { color: 'brand-500', foreground: 'brand-50' });
    expect(resolveFillName('custom-brand', 'surface')).toBe('bg-brand-500 text-brand-50');
    expect(getFillMetadata('custom-brand')).toEqual({
      color: 'brand-500',
      foreground: 'brand-50',
    });
  });

  it('overrides an existing fill registration', () => {
    registerFill('surface', { color: 'zinc-900', foreground: 'zinc-50' });
    expect(resolveFillName('surface', 'surface')).toBe('bg-zinc-900 text-zinc-50');
    // restore the default so subsequent tests are not affected
    registerFill('surface', { color: 'neutral-900', foreground: 'neutral-100' });
  });
});
