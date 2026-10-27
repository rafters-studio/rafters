import { describe, expect, it } from 'vitest';
import { analyzeCss, assertCssIsValid } from './css-validity.js';

/**
 * Smallest CSS shape that satisfies every assertion: includes the 5
 * canonical surface tokens declared and no dangling refs. Used as the
 * baseline; individual tests mutate to introduce failures.
 */
const CANONICAL_CSS = `
:root {
  --rafters-background: #fff;
  --rafters-foreground: #000;
  --rafters-primary: oklch(0.5 0.2 240);
  --rafters-destructive: oklch(0.5 0.2 30);
  --rafters-border: #ccc;
}
`;

describe('analyzeCss', () => {
  it('extracts --rafters-* declarations', () => {
    const report = analyzeCss(CANONICAL_CSS);
    expect(report.declared.has('--rafters-background')).toBe(true);
    expect(report.declared.has('--rafters-primary')).toBe(true);
    expect(report.declared.size).toBe(5);
  });

  it('extracts --color-* declarations alongside --rafters-*', () => {
    const css = `:root { --rafters-primary: var(--color-empire-500); --color-empire-500: oklch(0.5 0.2 240); }`;
    const report = analyzeCss(css);
    expect(report.declared.has('--color-empire-500')).toBe(true);
    expect(report.referenced.has('--color-empire-500')).toBe(true);
  });

  it('walks declarations inside @theme blocks (the css-tree walk gap)', () => {
    // Tailwind v4's @theme is not a standard CSS at-rule, so css-tree's
    // walk misses every declaration inside it. The regex shape catches it.
    const css = `
      @theme {
        --color-empire-50: oklch(0.97 0.02 240);
        --color-empire-500: oklch(0.58 0.20 240);
      }
    `;
    const report = analyzeCss(css);
    expect(report.declared.has('--color-empire-50')).toBe(true);
    expect(report.declared.has('--color-empire-500')).toBe(true);
  });

  it('flags dangling var() references', () => {
    const css = `
      ${CANONICAL_CSS}
      .x { color: var(--rafters-missing); }
    `;
    const report = analyzeCss(css);
    expect(report.danglingRefs).toEqual(['--rafters-missing']);
  });

  it('flags missing canonical tokens', () => {
    const css = `:root { --rafters-background: #fff; --rafters-foreground: #000; }`;
    const report = analyzeCss(css);
    expect(report.missingCanonicalTokens).toEqual([
      '--rafters-primary',
      '--rafters-destructive',
      '--rafters-border',
    ]);
  });

  it('does not extract custom-property names outside the two prefixes', () => {
    // --motion-*, --shadow, --radix-*: external systems. Not our concern.
    const css = `${CANONICAL_CSS} .x { animation: var(--motion-fade-in) ease; }`;
    const report = analyzeCss(css);
    expect(report.referenced.has('--motion-fade-in')).toBe(false);
    expect(report.danglingRefs).toEqual([]);
  });
});

describe('assertCssIsValid', () => {
  it('passes for valid CSS with all canonical tokens', () => {
    expect(() => assertCssIsValid(CANONICAL_CSS)).not.toThrow();
  });

  it('throws on dangling var() references', () => {
    const css = `${CANONICAL_CSS} .x { color: var(--rafters-missing); }`;
    expect(() => assertCssIsValid(css)).toThrow(/dangling var\(\) refs/);
  });

  it('throws when a canonical surface token is missing', () => {
    const css = `:root {
      --rafters-background: #fff;
      --rafters-foreground: #000;
      --rafters-primary: #444;
      --rafters-destructive: #c00;
    }`; // missing --rafters-border
    expect(() => assertCssIsValid(css)).toThrow(/missing canonical tokens.*--rafters-border/);
  });

  it('throws when declared count is below the expected range', () => {
    expect(() => assertCssIsValid(CANONICAL_CSS, [100, 500])).toThrow(
      /declared-token count 5 is outside expected range \[100, 500\]/,
    );
  });

  it('throws when declared count is above the expected range', () => {
    expect(() => assertCssIsValid(CANONICAL_CSS, [0, 3])).toThrow(
      /outside expected range \[0, 3\]/,
    );
  });

  it('accepts a count inside the expected range', () => {
    expect(() => assertCssIsValid(CANONICAL_CSS, [3, 10])).not.toThrow();
  });

  it('throws on unparseable CSS', () => {
    expect(() => assertCssIsValid(':root { --rafters-x: ; { invalid')).toThrow();
  });

  it('reports multiple failures in one error message', () => {
    const css = `:root {
      --rafters-background: #fff;
      .x { color: var(--rafters-missing); }
    }`; // missing 4 canonical tokens + dangling ref
    try {
      assertCssIsValid(css);
      throw new Error('expected assertCssIsValid to throw');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/dangling var\(\) refs/);
      expect(msg).toMatch(/missing canonical tokens/);
    }
  });
});
