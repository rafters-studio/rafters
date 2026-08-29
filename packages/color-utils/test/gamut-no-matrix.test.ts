/**
 * Structural guard: the hand-rolled gamut matrices must never come back.
 *
 * sRGB/P3 gamut math is colorjs.io's job. `src/gamut.ts` wraps it; nothing in
 * this package or in `@rafters/ui` carries its own OKLCH -> linear-RGB or
 * XYZ -> P3/sRGB coefficients. The deleted `packages/ui/src/primitives/
 * oklch-gamut.ts` did, and one of its rows (the P3 blue row) was a copy-paste
 * of the wrong matrix, which is exactly the class of bug a second copy of a
 * matrix produces. This test fingerprints those coefficient literals and fails
 * naming the offending file if one reappears.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Coefficient literals unique to the deleted hand-rolled matrices: the Oklab
 * LMS-to-linear-sRGB rows and the LMS-to-linear-P3 rows. Matched as substrings
 * so a re-typed literal with more or fewer trailing digits is still caught.
 */
const MATRIX_COEFFICIENTS = [
  // LMS -> linear sRGB
  '4.0767',
  '3.3077',
  '0.2309',
  '1.2684',
  '2.6097',
  '0.3413',
  '0.7034',
  '1.7076',
  // LMS -> linear Display P3
  '3.1277',
  '2.2571',
  '0.1294',
  '1.0910',
  '2.4133',
  '0.3222',
  '0.0260',
  '1.7296',
];

/** Repo root: packages/color-utils/test/ -> three levels up. */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * `packages/ui/src/old/` is the quarantined pre-rewrite tree -- outside the
 * delivered surface, excluded from the ui tsconfig and from vitest discovery,
 * and under a standing no-edits rule. A finding there could not be fixed, so
 * scanning it would only produce an unfixable failure.
 */
const QUARANTINED = join(repoRoot, 'packages/ui/src/old');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === QUARANTINED) continue;
      yield* sourceFiles(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

/** Every `<relative path>: <matched literal>` a hand-rolled matrix would produce. */
function findHandRolledMatrices(trees: readonly string[]): string[] {
  const offenders: string[] = [];
  for (const tree of trees) {
    for (const file of sourceFiles(join(repoRoot, tree))) {
      const content = readFileSync(file, 'utf-8');
      for (const coefficient of MATRIX_COEFFICIENTS) {
        if (content.includes(coefficient)) {
          offenders.push(`${relative(repoRoot, file)}: ${coefficient}`);
        }
      }
    }
  }
  return offenders;
}

describe('no hand-rolled RGB gamut matrix', () => {
  it('no file under packages/ui/src or packages/color-utils/src declares one', () => {
    const offenders = findHandRolledMatrices(['packages/ui/src', 'packages/color-utils/src']);
    expect(
      offenders,
      `hand-rolled gamut matrix coefficients found -- gamut math belongs to colorjs.io:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
