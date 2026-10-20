import { describe, expect, it } from 'vitest';
import { resolveCustomProperties } from '../../src/importers/custom-properties.js';

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

  it('reads @theme blocks and lets the last declaration win', () => {
    const r = byProperty(':root { --x: 1rem; } @theme { --x: 2rem; --y: red; }');
    expect(r.get('--x')?.value).toBe('2rem');
    expect(r.get('--y')?.value).toBe('red');
  });
});
