/**
 * Reference tests for the graph primitive's d3 ports.
 *
 * `ticks` and `bandScale` are hand-ported from d3-array/d3-scale (see the math
 * authority note in packages/ui/src/primitives/graph.ts). These tests diff our
 * output against the real d3 packages over thousands of seeded random cases, so
 * behavior tracks d3 rather than a hand-rolled approximation of it. d3-array,
 * d3-scale, and d3-shape are devDependencies of this package only -- reference
 * oracles for tests, never runtime dependencies of the shipped primitive.
 *
 * Two deliberate divergences from d3, so nobody re-reports them:
 * - `ticks(a, b, 0)` returns `[a]` here (a single anchor tick); d3-array's
 *   `ticks(a, b, 0)` returns `[]`. Covered by the "handles zero count" case in
 *   graph.test.ts.
 * - A reversed domain (`a > b`) returns `[]` here; d3-array returns the
 *   descending tick sequence. rafters callers always pass a forward domain
 *   (min, max), so a reversed pair is out of contract rather than emulated.
 */

import { ticks as d3Ticks } from 'd3-array';
import { scaleBand } from 'd3-scale';
import { describe, expect, it } from 'vitest';
import { bandScale, ticks } from '../../src/primitives/graph';

/** Deterministic linear congruential generator -- no new dependency for seeded randomness. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** Absolute tolerance for near-zero values, relative tolerance otherwise. */
function assertClose(ours: number, theirs: number, message: string): void {
  const diff = Math.abs(ours - theirs);
  if (diff < 1e-9) return;
  expect(diff / Math.abs(theirs), message).toBeLessThan(1e-9);
}

describe('ticks matches d3-array', () => {
  it('matches ticks(a, b, count) over 5,200 random forward domains', () => {
    const rng = makeRng(20260901);
    const cases = 5200;

    for (let i = 0; i < cases; i++) {
      // Magnitude spans 1e-3 to 1e5.
      const magExp = -3 + Math.floor(rng() * 9);
      const magnitude = 10 ** magExp;
      const quarterRounded = i % 3 === 0;

      let a = (rng() - 0.5) * magnitude * 20;
      let b = a + (rng() * 0.98 + 0.02) * magnitude * 10; // span always positive -> a < b

      if (quarterRounded) {
        const q = magnitude / 4;
        a = Math.round(a / q) * q;
        b = Math.round(b / q) * q;
        if (b <= a) b += q;
      }

      const count = 1 + (i % 12); // counts 1 through 12

      const ours = ticks(a, b, count);
      const theirs = d3Ticks(a, b, count);
      const label = `case ${i}: ticks(${a}, ${b}, ${count})`;

      expect(ours.length, label).toBe(theirs.length);
      for (let j = 0; j < ours.length; j++) {
        assertClose(ours[j] as number, theirs[j] as number, `${label} idx ${j}`);
      }
    }
  });
});

describe('bandScale matches d3-scale scaleBand', () => {
  it('matches every position, bandwidth(), and step() over 2,200 random cases', () => {
    const rng = makeRng(20260902);
    const cases = 2200;

    for (let i = 0; i < cases; i++) {
      const n = 1 + Math.floor(rng() * 12);
      const domain = Array.from({ length: n }, (_, k) => `k${k}`);
      const r0 = (rng() - 0.5) * 1000;
      const r1 = r0 + rng() * 990 + 10;
      const paddingInner = rng();
      const paddingOuter = rng();
      const align = rng();

      const ours = bandScale(domain, [r0, r1], { paddingInner, paddingOuter, align });
      const theirs = scaleBand<string>()
        .domain(domain)
        .range([r0, r1])
        .paddingInner(paddingInner)
        .paddingOuter(paddingOuter)
        .align(align);

      const label = `case ${i}: n=${n} range=[${r0},${r1}] pi=${paddingInner} po=${paddingOuter} align=${align}`;

      assertClose(ours.bandwidth(), theirs.bandwidth(), `${label} bandwidth`);
      assertClose(ours.step(), theirs.step(), `${label} step`);
      for (const key of domain) {
        assertClose(ours.scale(key), theirs(key) as number, `${label} key=${key}`);
      }
    }
  });
});
