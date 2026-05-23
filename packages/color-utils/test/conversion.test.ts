import { describe, expect, it } from 'vitest';
import { hexToOKLCH, roundOKLCH } from '../src/conversion.js';

describe('hexToOKLCH', () => {
  it('converts a standard color', () => {
    const result = hexToOKLCH('#2563eb');
    expect(result.l).toBeGreaterThan(0);
    expect(result.c).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(result.alpha).toBe(1);
  });

  it('handles pure black', () => {
    const result = hexToOKLCH('#000000');
    expect(result.l).toBeCloseTo(0, 1);
    expect(result.c).toBeCloseTo(0, 1);
    expect(Number.isNaN(result.h)).toBe(false);
  });

  it('handles pure white', () => {
    const result = hexToOKLCH('#ffffff');
    expect(result.l).toBeCloseTo(1, 1);
    expect(result.c).toBeCloseTo(0, 1);
    expect(Number.isNaN(result.h)).toBe(false);
  });

  it('handles pure gray without NaN hue', () => {
    const result = hexToOKLCH('#9D9D9D');
    expect(result.l).toBeGreaterThan(0);
    expect(result.c).toBeCloseTo(0, 2);
    // Achromatic colors must not have NaN hue
    expect(Number.isNaN(result.h)).toBe(false);
    expect(result.h).toBe(0);
  });

  it('handles mid-gray #808080', () => {
    const result = hexToOKLCH('#808080');
    expect(Number.isNaN(result.h)).toBe(false);
    expect(result.h).toBe(0);
  });

  it('parses rgb() format', () => {
    const result = hexToOKLCH('rgb(220, 38, 38)');
    expect(result.l).toBeGreaterThan(0);
    expect(result.c).toBeGreaterThan(0);
  });

  it('parses hsl() format', () => {
    const result = hexToOKLCH('hsl(142, 71%, 45%)');
    expect(result.l).toBeGreaterThan(0);
    expect(result.c).toBeGreaterThan(0);
  });

  it('parses oklch() format', () => {
    const result = hexToOKLCH('oklch(0.55 0.2 250)');
    expect(result.l).toBeCloseTo(0.55, 1);
    expect(result.c).toBeCloseTo(0.2, 1);
    expect(result.h).toBeCloseTo(250, 0);
  });

  it('returns primitive numbers for oklch() literal input (not boxed Number)', () => {
    // Regression for boxed-Number leak: colorjs.io returns Number objects
    // for some input formats (oklch literals among them). Downstream Zod
    // schemas reject `typeof === 'object'` even when `toBeCloseTo` passes
    // (the matcher coerces, hiding the divergence). Asserting `typeof`
    // catches a future refactor that drops the Number() coercion in
    // conversion.ts.
    const result = hexToOKLCH('oklch(0.5 0.2 30)');
    expect(typeof result.l).toBe('number');
    expect(typeof result.c).toBe('number');
    expect(typeof result.h).toBe('number');
    expect(typeof result.alpha).toBe('number');
  });

  it('throws on invalid input', () => {
    expect(() => hexToOKLCH('not-a-color')).toThrow();
  });
});

describe('roundOKLCH', () => {
  it('rounds to standard precision', () => {
    const result = roundOKLCH({ l: 0.55123, c: 0.19876, h: 249.7, alpha: 1 });
    expect(result.l).toBe(0.551);
    expect(result.c).toBe(0.199);
    expect(result.h).toBe(250);
    expect(result.alpha).toBe(1);
  });

  it('handles NaN hue from achromatic colors', () => {
    const result = roundOKLCH({ l: 0.5, c: 0, h: Number.NaN, alpha: 1 });
    expect(Number.isNaN(result.h)).toBe(false);
    expect(result.h).toBe(0);
  });
});
