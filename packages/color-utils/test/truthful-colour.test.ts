/**
 * #2672 functional tests, as the issue states them: stored steps sit in sRGB,
 * lightness falls strictly, and every pair's standard is its measured one;
 * isLightColor corrects for chroma in the right direction.
 */

import { expect, it } from 'vitest';
import type { OKLCH } from '@rafters/shared';
import {
  buildColorValue,
  calculateWCAGContrast,
  getGamutTier,
  isLightColor,
  SCALE_POSITIONS,
  semanticFor,
  STATE_USES,
} from '../src/index.js';

const seeds: OKLCH[] = [
  { l: 0.55, c: 0.2, h: 0, alpha: 1 },
  { l: 0.55, c: 0.2, h: 260, alpha: 1 },
  { l: 0.55, c: 0.12, h: 210, alpha: 1 },
  { l: 0.55, c: 0.12, h: 90, alpha: 1 },
];
const meets = (r: number): 'AAA' | 'AA' | 'none' => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : 'none');
const step = (scale: readonly OKLCH[], pos: string): OKLCH =>
  scale[SCALE_POSITIONS.indexOf(pos as (typeof SCALE_POSITIONS)[number])]!;

it('keeps scales in sRGB, ordered, and labels pairs by measurement', () => {
  for (const s of seeds) {
    const v = buildColorValue(s);
    for (const [i, o] of v.scale.entries()) {
      expect(getGamutTier(o)).toBe('srgb');
      expect(v.gamut?.[i]).toBe('srgb');
      if (i > 0) expect(o.l).toBeLessThan(v.scale[i - 1]!.l);
    }
    const sem = semanticFor(v);
    for (const from of SCALE_POSITIONS) {
      for (const p of [
        sem.pair({ use: 'foreground', from }),
        ...STATE_USES.map((use) => sem.pair({ use, from })),
      ]) {
        expect(p.standard).toBe(
          meets(calculateWCAGContrast(step(v.scale, from), step(v.scale, p.to.position))),
        );
      }
    }
  }
});
it('corrects for chroma in the right direction', () => {
  const count = (c: number) =>
    Array.from({ length: 31 }, (_, i) => 0.4 + i * 0.01).filter((l) =>
      isLightColor({ l, c, h: 30, alpha: 1 }),
    ).length;
  expect(count(0.25)).toBeGreaterThanOrEqual(count(0.05));
});

it('labels AA requests, dark states, inversions and same-family references by measurement', () => {
  for (const s of [...seeds, { l: 0.55, c: 0.01, h: 260, alpha: 1 }]) {
    const v = buildColorValue(s);
    const sem = semanticFor(v, { name: 'fam' });
    const measured = (from: string, to: string) =>
      meets(calculateWCAGContrast(step(v.scale, from), step(v.scale, to)));
    for (const from of SCALE_POSITIONS) {
      const aa = sem.pair({ use: 'foreground', from, level: 'AA' });
      expect(aa.standard).toBe(measured(from, aa.to.position));
      for (const p of Object.values(sem.states(from, true))) {
        expect(p.standard).toBe(measured(from, p.to.position));
      }
      const inverted = sem.invert(sem.pair({ use: 'foreground', from }));
      expect(inverted.standard).toBe(measured(inverted.from.position, inverted.to.position));
    }
    const withRefs = {
      ...v,
      foregroundReferences: { auto: { family: 'fam', position: '50' } },
      stateReferences: { hover: { family: 'fam', position: '700' } },
    };
    const refSem = semanticFor(withRefs, { name: 'fam' });
    const fg = refSem.pair({ use: 'foreground', from: '600' });
    expect(fg.tier).toBe('reference');
    expect(fg.standard).toBe(measured('600', '50'));
    const hover = refSem.pair({ use: 'hover', from: '600' });
    expect(hover.tier).toBe('reference');
    expect(hover.standard).toBe(measured('600', '700'));

    // A reference naming the family by its own name, under an alias, is measured.
    const byOwnName = semanticFor(
      { ...v, foregroundReferences: { auto: { family: v.name, position: '50' } } },
      { name: 'alias' },
    );
    expect(byOwnName.pair({ use: 'foreground', from: '600' }).standard).toBe(measured('600', '50'));

    // A reference into a family whose colour this context does not hold is 'none'.
    const crossFamily = semanticFor(
      {
        ...v,
        foregroundReferences: { auto: { family: 'zinc', position: '50' } },
        stateReferences: { hover: { family: 'zinc', position: '700' } },
      },
      { name: 'fam' },
    );
    const crossFg = crossFamily.pair({ use: 'foreground', from: '600' });
    expect(crossFg.to).toEqual({ family: 'zinc', position: '50' });
    expect(crossFg.standard).toBe('none');
    expect(crossFamily.pair({ use: 'hover', from: '600' }).standard).toBe('none');
  }
});
