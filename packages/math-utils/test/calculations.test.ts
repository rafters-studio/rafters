import { describe, expect, it } from 'vitest';

import { evaluateExpression } from '../src/calculations';
import { ratioValue, resolveRatio } from '../src/ratios';

const golden = resolveRatio('golden');
const minorThird = resolveRatio('minor-third');

describe('math-utils: evaluateExpression', () => {
  it('evaluates basic arithmetic and operator precedence', () => {
    expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
  });

  it('substitutes named ratios from the default registry', () => {
    expect(evaluateExpression('16 * golden')).toBeCloseTo(16 * ratioValue(golden), 6);
    expect(evaluateExpression('{base} * minor-third', { variables: { base: 16 } })).toBeCloseTo(
      16 * ratioValue(minorThird),
      6,
    );
  });

  it('substitutes named ratios from a caller-supplied registry', () => {
    const custom = [{ name: 'spice', a: 7, b: 4 }];
    expect(evaluateExpression('8 * spice', { ratios: custom })).toBeCloseTo(8 * (7 / 4), 6);
  });
});
