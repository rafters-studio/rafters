import { generateNamespaces } from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import { isCarryableMotionValue } from '../../src/utils/motion-rebuild.js';
import { STALE_OVERRIDDEN_CELL } from '../fixtures/stale-motion.js';

/**
 * The carry gate is a SECOND declaration of the cell value shape -- the first
 * is the generator's, the third is the Tailwind exporter's `parseCellSpec`.
 * A second declaration drifts, and the drift is exactly what #2208 was: a cell
 * shape moved in 0.3.0 and the code that reads stored cell values did not.
 *
 * This suite is what holds the gate to the generator. The conformance case
 * below goes red the day the cell spec changes again without the gate
 * following, which is the failure mode the gate itself cannot detect.
 */
describe('isCarryableMotionValue (#2208)', () => {
  it('accepts every cell value the current generator emits', () => {
    const cells = generateNamespaces(['motion']).allTokens.filter((t) =>
      t.name.startsWith('motion-cell-'),
    );

    expect(cells.length).toBeGreaterThan(0);
    const rejected = cells
      .filter((t) => !isCarryableMotionValue(t.name, t.value))
      .map((t) => t.name);
    expect(rejected).toEqual([]);
  });

  it('rejects a 0.2.3-shaped cell value', () => {
    expect(isCarryableMotionValue(STALE_OVERRIDDEN_CELL.name, STALE_OVERRIDDEN_CELL.value)).toBe(
      false,
    );
  });

  it('rejects a cell value that is not a string at all', () => {
    expect(isCarryableMotionValue('motion-cell-dialog-content-open', { keyframe: 'fade-in' })).toBe(
      false,
    );
  });

  it('accepts an operator-pinned cell -- an animation shorthand, not JSON', () => {
    // `registry.set` on a cell writes a plain shorthand over the JSON spec, and
    // the exporter emits it verbatim. That is a value the system still accepts,
    // so the gate must not mistake it for a stale shape.
    expect(
      isCarryableMotionValue('motion-cell-dialog-content-open', 'scale-in 200ms ease-out'),
    ).toBe(true);
  });

  it('accepts a period-kind cell value', () => {
    expect(
      isCarryableMotionValue(
        'motion-cell-spinner-root-busy',
        JSON.stringify({ keyframe: 'spin', duration: { kind: 'period', period: 'spin' } }),
      ),
    ).toBe(true);
  });

  it('leaves every non-cell motion token carryable', () => {
    // Easings, durations, periods, keyframes and the semantic namespaces carry
    // plain strings with no composite shape to go stale.
    expect(isCarryableMotionValue('motion-easing-standard', 'cubic-bezier(0.2, 0, 0, 1)')).toBe(
      true,
    );
    expect(isCarryableMotionValue('motion-duration-normal', '200ms')).toBe(true);
  });
});
