import { describe, expect, it } from 'vitest';
import {
  resolveCustomProperties,
  resolvePaletteStep,
} from '../../src/importers/custom-properties.js';

const byProperty = (css: string) =>
  new Map(resolveCustomProperties(css).map((r) => [r.property, r]));

describe('resolveCustomProperties', () => {
  it('follows a var() chain to a literal', () => {
    const r = byProperty(':root { --brand: var(--cc-blue); --cc-blue: oklch(0.55 0.15 250); }');
    expect(r.get('--brand')).toEqual({ property: '--brand', value: 'oklch(0.55 0.15 250)' });
  });

  it('substitutes var() inside a larger value', () => {
    const r = byProperty(':root { --u: 4px; --gap: calc(var(--u) * 2); }');
    expect(r.get('--gap')?.value).toBe('calc(4px * 2)');
  });

  it('uses the fallback when the referenced property is not declared', () => {
    const r = byProperty(':root { --a: var(--missing, 0.5rem); }');
    expect(r.get('--a')?.value).toBe('0.5rem');
  });

  it('reports an undeclared reference with no fallback as unresolved', () => {
    const r = byProperty(':root { --a: var(--missing); }');
    expect(r.get('--a')).toMatchObject({
      value: null,
      reason: expect.stringContaining('--missing'),
    });
  });

  it('reports a cycle as unresolved', () => {
    const r = byProperty(':root { --a: var(--b); --b: var(--a); }');
    expect(r.get('--a')).toMatchObject({ value: null, reason: expect.stringContaining('cycle') });
  });

  it('does not read a :root nested in an at-rule', () => {
    const r = byProperty(
      ':root { --bg: white; } @media (prefers-color-scheme: dark) { :root { --bg: black; --only-dark: red; } }',
    );
    expect(r.get('--bg')?.value).toBe('white');
    expect(r.has('--only-dark')).toBe(false);
  });

  it('reads @theme blocks and lets the last declaration win', () => {
    const r = byProperty(':root { --x: 1rem; } @theme { --x: 2rem; --y: red; }');
    expect(r.get('--x')?.value).toBe('2rem');
    expect(r.get('--y')?.value).toBe('red');
  });
});

describe('resolvePaletteStep (#2866)', () => {
  const css = `@theme { --color-mud-500: #3d5c5c; --color-quality-legendary-300: #f80; }
:root {
  --primary: var(--color-mud-500);
  --accent: var(--brand);
  --brand: var(--color-quality-legendary-300, red);
  --ink: oklch(0.4 0.1 20);
  --mixed: color-mix(in oklch, var(--color-mud-500), white);
  --gone: var(--color-sand-500);
  --loop-a: var(--loop-b);
  --loop-b: var(--loop-a);
}
@media (prefers-color-scheme: dark) { :root { --primary: var(--ink); } }`;

  it('reads a declared --color-<family>-<step> as that step', () => {
    expect(resolvePaletteStep(css, '--color-mud-500')).toEqual({ family: 'mud', position: '500' });
  });

  it('follows a bare var() to a step', () => {
    expect(resolvePaletteStep(css, '--primary')).toEqual({ family: 'mud', position: '500' });
  });

  it('follows a chain through other properties to a step of a hyphenated palette', () => {
    expect(resolvePaletteStep(css, '--accent')).toEqual({
      family: 'quality-legendary',
      position: '300',
    });
  });

  it('is null for a literal, a var() inside a larger value, an undeclared step, or a cycle', () => {
    for (const property of ['--ink', '--mixed', '--gone', '--loop-a', '--absent']) {
      expect(resolvePaletteStep(css, property), property).toBeNull();
    }
  });
});
