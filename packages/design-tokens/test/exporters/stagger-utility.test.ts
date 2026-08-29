/**
 * `@utility stagger-items` -- the per-position stagger ladder (#2189).
 *
 * A component's `.classes.ts` selects this ONE class to give item N of a
 * collection an `animation-delay` proportional to its position, consuming
 * `--rafters-delay-stagger-step`, without any component-side file
 * constructing `calc()` or `:nth-child` itself
 * (`packages/ui/docs/spec/00-boundaries.md` Sec 6).
 */

import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import { tokensToTailwind } from '../../src/exporters/tailwind.js';

function emitCSS(): string {
  const tokens = generateBaseSystem({}).allTokens;
  return tokensToTailwind(tokens, { includeImport: false }, []);
}

describe('generateStaggerUtility', () => {
  it('emits calc(n * var(--rafters-delay-stagger-step)) for position 3', () => {
    const css = emitCSS();
    expect(css).toContain(
      '& > *:nth-child(3) {\n    animation-delay: calc(3 * var(--rafters-delay-stagger-step));',
    );
  });

  it('saturates at the position-12 multiplier for the fallback rule', () => {
    const css = emitCSS();
    expect(css).toContain(
      '& > * {\n    animation-delay: calc(12 * var(--rafters-delay-stagger-step));',
    );
  });

  it('zeroes animation-delay under prefers-reduced-motion: reduce', () => {
    const css = emitCSS();
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/animation-delay: 0ms;/);
  });

  it('emits exactly one @utility stagger-items block, and nothing past position 12', () => {
    const css = emitCSS();
    const occurrences = css.match(/@utility stagger-items \{/g) ?? [];
    expect(occurrences).toHaveLength(1);
    expect(css).not.toContain('nth-child(13)');
    expect(css).not.toContain('nth-child(0)');
  });

  it('declares positions 1 through 12, each multiplying by its own position', () => {
    const css = emitCSS();
    for (let position = 1; position <= 12; position++) {
      expect(css).toContain(
        `& > *:nth-child(${position}) {\n    animation-delay: calc(${position} * var(--rafters-delay-stagger-step));`,
      );
    }
  });

  it('never writes a literal duration -- every declaration goes through calc(var(...))', () => {
    const css = emitCSS();
    const blockStart = css.indexOf('@utility stagger-items {');
    expect(blockStart).toBeGreaterThan(-1);
    const blockEnd = css.indexOf('\n}', blockStart);
    const block = css.slice(blockStart, blockEnd);
    // The only bare literal permitted anywhere in the block is the
    // reduced-motion law's zero -- never a tuned duration.
    const delayLines = block.split('\n').filter((l) => l.includes('animation-delay:'));
    for (const line of delayLines) {
      expect(line).toMatch(
        /animation-delay: (calc\(\d+ \* var\(--rafters-delay-stagger-step\)\);|0ms;)/,
      );
    }
  });
});
