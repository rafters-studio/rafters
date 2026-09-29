import type { Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { generateStaggerUtility, tokensToTailwind } from '../../src/exporters/tailwind.js';
import { generateBaseSystem } from '../../src/generators/index.js';

const allTokens: Token[] = generateBaseSystem({}).allTokens;
const motionTokens: Token[] = allTokens.filter((t) => t.namespace === 'motion');

describe('generateStaggerUtility', () => {
  it('reads the stagger-step leaf from the motion tokens it is given', () => {
    expect(motionTokens.some((t) => t.name === 'rafters-delay-stagger-step')).toBe(true);
  });

  it('emits calc(n * var(--rafters-delay-stagger-step)) for position 3', () => {
    const css = generateStaggerUtility(motionTokens);
    expect(css).toContain(
      '& > *:nth-child(3) {\n    animation-delay: calc(3 * var(--rafters-delay-stagger-step));',
    );
  });

  it('saturates at the position-12 multiplier for the fallback rule', () => {
    const css = generateStaggerUtility(motionTokens);
    expect(css).toContain(
      '& > * {\n    animation-delay: calc(12 * var(--rafters-delay-stagger-step));',
    );
    expect(css).toContain(
      '& > *:nth-child(12) {\n    animation-delay: calc(12 * var(--rafters-delay-stagger-step));',
    );
  });

  it('emits exactly one block with nth-child rules 1..12 and nothing past 12', () => {
    const css = generateStaggerUtility(motionTokens);
    expect(css.match(/@utility stagger-items \{/g)).toHaveLength(1);
    const positions = [...css.matchAll(/:nth-child\((\d+)\)/g)].map((m) => Number(m[1]));
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const n of positions) {
      expect(css).toContain(
        `& > *:nth-child(${n}) {\n    animation-delay: calc(${n} * var(--rafters-delay-stagger-step));`,
      );
    }
  });

  it('never writes a literal duration outside the reduced-motion zero', () => {
    const css = generateStaggerUtility(motionTokens);
    const delays = [...css.matchAll(/animation-delay: ([^;]+);/g)].map((m) => m[1]);
    expect(
      delays.filter((d) => d !== '0ms').every((d) => /^calc\(\d+ \* var\(/.test(d ?? '')),
    ).toBe(true);
  });

  it('zeroes animation-delay under prefers-reduced-motion: reduce', () => {
    const css = generateStaggerUtility(motionTokens);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toMatch(/animation-delay: 0ms;/);
  });

  it('emits nothing when the stagger-step leaf is not declared', () => {
    const without = motionTokens.filter((t) => t.name !== 'rafters-delay-stagger-step');
    expect(generateStaggerUtility(without)).toBe('');
  });

  it('is wired into tokensToTailwind', () => {
    const css = tokensToTailwind(allTokens, { includeImport: false }, []);
    expect(css).toContain(generateStaggerUtility(motionTokens));
  });

  it('is byte-identical across a retune of the stagger-step token', () => {
    const retuned = motionTokens.map((t) =>
      t.name === 'rafters-delay-stagger-step' ? { ...t, value: '40ms' } : t,
    );
    expect(generateStaggerUtility(retuned)).toBe(generateStaggerUtility(motionTokens));
  });
});
