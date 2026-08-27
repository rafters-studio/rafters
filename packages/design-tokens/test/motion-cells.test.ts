import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DEFAULT_ANIMATION_DEFINITIONS,
  DEFAULT_DELAY_NAMESPACE,
  DEFAULT_DURATION_DEFINITIONS,
  DEFAULT_EASING_DEFINITIONS,
  DEFAULT_EXTENT_NAMESPACE,
  DEFAULT_KEYFRAME_DEFINITIONS,
  DEFAULT_MOTION_CELL_ANIMATIONS,
  DEFAULT_MOTION_COMPOSITE_PRESETS,
  DEFAULT_MOTION_SEMANTIC_MAPPINGS,
  DEFAULT_PERIOD_NAMESPACE,
  type MotionCellAnimation,
} from '../src/generators/defaults.js';
import { generateMotionTokens } from '../src/generators/motion.js';
import type { ResolvedSystemConfig } from '../src/generators/types.js';

/**
 * THE TWO DURATION FORMS A MOTION CELL CAN TAKE (#2154).
 *
 * `motion.jsonl` states duration as a tagged union: a transition names a
 * perceptual TIER and runs once, a loop names a PERIOD and runs forever. Before
 * this issue the generator could only represent the first, so the four looping
 * cells -- skeleton waiting, spinner busy, progress indeterminate, input-otp
 * caret idle -- had no representation at all and no CSS to compile to.
 *
 * These are generator-layer assertions: the token spec, its dependency edges and
 * the reduced-motion metadata. The CSS proof is at the compiled layer in
 * `test/exporters/motion-utilities.test.ts`, because a generator-text proof does
 * not transfer (reflection 019fc544).
 */

const CONFIG = {
  baseTransitionDuration: 150,
  progressionRatio: 'minor-third',
} as unknown as ResolvedSystemConfig;

function emitMotion(cells: Record<string, MotionCellAnimation> = DEFAULT_MOTION_CELL_ANIMATIONS) {
  return generateMotionTokens(
    CONFIG,
    DEFAULT_DURATION_DEFINITIONS,
    DEFAULT_EASING_DEFINITIONS,
    DEFAULT_DELAY_NAMESPACE,
    DEFAULT_EXTENT_NAMESPACE,
    DEFAULT_PERIOD_NAMESPACE,
    DEFAULT_MOTION_SEMANTIC_MAPPINGS,
    DEFAULT_KEYFRAME_DEFINITIONS,
    DEFAULT_ANIMATION_DEFINITIONS,
    DEFAULT_MOTION_COMPOSITE_PRESETS,
    cells,
  );
}

function cellToken(name: string) {
  const token = emitMotion().tokens.find((t) => t.name === `motion-cell-${name}`);
  if (!token) throw new Error(`no motion-cell token named "${name}"`);
  return token;
}

/** The spec a cell token carries, as the exporter reads it. */
const CellSpecSchema = z.object({
  keyframe: z.string(),
  duration: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('tier'), tier: z.string() }),
    z.object({ kind: z.literal('period'), period: z.string() }),
  ]),
  curve: z.string().optional(),
});

function specOf(name: string): z.infer<typeof CellSpecSchema> {
  const value = cellToken(name).value;
  expect(typeof value).toBe('string');
  return CellSpecSchema.parse(JSON.parse(String(value)));
}

describe('motion cells: the period form (#2154)', () => {
  it('a looping cell carries a period, not a tier, and names no curve', () => {
    const spec = specOf('skeleton-root-waiting');
    expect(spec.duration).toEqual({ kind: 'period', period: 'shimmer' });
    // Every period row in the matrix declares curve {"kind":"none"}. A curve
    // here would be an assignment no cell made -- the class of error the
    // `scaleStart = 1/ratio^0.25` deletion is on record for.
    expect(spec.curve).toBeUndefined();
  });

  it('a looping cell depends on the period leaf and on no duration or ease leaf', () => {
    const token = cellToken('spinner-root-busy');
    expect(token.dependsOn).toEqual(['motion-keyframe-spin', 'rafters-period-spin']);
  });

  it('a looping cell is NOT reduced-motion aware -- loops slow, they never stop', () => {
    // The metadata has to agree with the CSS. The exporter reads this field to
    // decide whether the zeroing block is attached, including on a pinned cell
    // whose JSON spec has been overwritten with a shorthand.
    expect(cellToken('spinner-root-busy').reducedMotionAware).toBe(false);
    expect(cellToken('progress-root-indeterminate').reducedMotionAware).toBe(false);
    expect(cellToken('input-otp-caret-idle').reducedMotionAware).toBe(false);
    expect(cellToken('skeleton-root-waiting').reducedMotionAware).toBe(false);
  });

  it('a tier cell still carries its tier and curve, and stays reduced-motion aware', () => {
    const spec = specOf('dialog-content-open');
    expect(spec.duration).toEqual({ kind: 'tier', tier: 'normal' });
    expect(spec.curve).toBe('enter');
    expect(cellToken('dialog-content-open').reducedMotionAware).toBe(true);
    expect(cellToken('dialog-content-open').dependsOn).toEqual([
      'motion-keyframe-scale-in',
      'rafters-duration-normal',
      'rafters-ease-enter',
    ]);
  });
});

describe('motion cells: a cell that cannot be represented fails the build', () => {
  const base = DEFAULT_MOTION_CELL_ANIMATIONS['dialog-content-open'] as MotionCellAnimation;

  it('throws on an unrecognized duration.kind, naming the cell coordinates', () => {
    // Silent fallback to a default duration is the failure this guards: an
    // unrepresented cell would compile as if it had a value.
    const malformed = {
      ...base,
      duration: { kind: 'ratio', ratio: 1.2 },
    } as unknown as MotionCellAnimation;

    let message = '';
    try {
      emitMotion({ malformed });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/duration\.kind/);
    expect(message).toContain('(dialog, content, closed -> open)');
    expect(message).toContain('period, tier');
  });

  it('throws on an unknown period member, the way an unknown tier already does', () => {
    const cells = {
      typo: {
        keyframe: 'spin',
        duration: { kind: 'period', period: 'shimmr' },
        cell: { component: 'spinner', part: 'root', transition: 'busy' },
        meaning: 'test',
        contexts: ['test'],
      },
    } satisfies Record<string, MotionCellAnimation>;
    expect(() => emitMotion(cells)).toThrowError(/unknown period "shimmr"/);
  });

  it('throws when a tier cell omits the curve -- only a loop may', () => {
    const cells = {
      curveless: {
        keyframe: 'fade-in',
        duration: { kind: 'tier', tier: 'fast' },
        cell: { component: 'alert', part: 'root', transition: 'appear' },
        meaning: 'test',
        contexts: ['test'],
      },
    } satisfies Record<string, MotionCellAnimation>;
    expect(() => emitMotion(cells)).toThrowError(/tier-kind cell with no curve/);
  });
});

// ===========================================================================
// MATRIX CONFORMANCE. The cells consumed here are read against the cells
// ASSIGNED in motion.jsonl, which is the source of record and is never edited
// from this side.
// ===========================================================================

const MATRIX_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../ui/docs/spec/matrix/motion.jsonl',
);

/** Only the columns this conformance check reads. The full schema lives in ui. */
const MatrixRowSchema = z.object({
  component: z.string(),
  part: z.string(),
  transition: z.string(),
  duration: z.looseObject({
    kind: z.string(),
    tier: z.string().optional(),
    period: z.string().optional(),
  }),
  curve: z.looseObject({ kind: z.string(), role: z.string().optional() }),
});

function matrixRows(): z.infer<typeof MatrixRowSchema>[] {
  const text = readFileSync(MATRIX_PATH, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const parsed: unknown = JSON.parse(line);
      const result = MatrixRowSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`motion.jsonl line ${index + 1}: ${result.error.issues[0]?.message ?? ''}`);
      }
      return result.data;
    });
}

const rowKey = (row: { component: string; part: string; transition: string }) =>
  `${row.component} | ${row.part} | ${row.transition}`;

describe('motion cells: matrix conformance', () => {
  it('every consumed cell names a row that exists in motion.jsonl', () => {
    // The direction that catches a transcription error: a cell invented here,
    // or one whose transition string drifted from the matrix's wording, would
    // emit a utility for a moment no component has.
    const assigned = new Set(matrixRows().map(rowKey));
    const orphans = Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)
      .filter(([, cell]) => !assigned.has(rowKey(cell.cell)))
      .map(([name]) => name);
    expect(orphans).toEqual([]);
  });

  it('every period-kind row in motion.jsonl is consumed', () => {
    // The other direction, closed for the loop set: four rows, four cells. The
    // tier-kind set is deliberately not closed here -- rows whose movement has
    // no existing keyframe shape (drawer's per-side slide, carousel travel, the
    // discrete swaps) are left uncovered rather than approximated, and the
    // predicate that decides is stated over DEFAULT_MOTION_CELL_ANIMATIONS.
    const consumed = new Set(
      Object.values(DEFAULT_MOTION_CELL_ANIMATIONS).map((cell) => rowKey(cell.cell)),
    );
    const missing = matrixRows()
      .filter((row) => row.duration.kind === 'period')
      .map(rowKey)
      .filter((key) => !consumed.has(key));
    expect(missing).toEqual([]);
  });

  it('every consumed cell carries the assignment its row declares, member for member', () => {
    // Reading the assignment off the row rather than trusting the entry. A
    // period row transcribed as a tier would run once and stop; a tier or curve
    // that drifted from the row is the #2012 defect returning by hand.
    const byKey = new Map(matrixRows().map((row) => [rowKey(row), row] as const));
    for (const [name, cell] of Object.entries(DEFAULT_MOTION_CELL_ANIMATIONS)) {
      const row = byKey.get(rowKey(cell.cell));
      expect(row, `${name} names no matrix row`).toBeDefined();
      if (!row) continue;
      expect(cell.duration.kind, `${name} disagrees with its row on duration kind`).toBe(
        row.duration.kind,
      );
      if (cell.duration.kind === 'tier') {
        expect(cell.duration.tier, `${name} is not on its assigned tier`).toBe(row.duration.tier);
        expect(cell.curve, `${name} is not on its assigned curve`).toBe(row.curve.role);
      } else {
        expect(cell.duration.period, `${name} is not on its assigned period`).toBe(
          row.duration.period,
        );
        // The row declares curve {"kind":"none"}, so there is nothing to name.
        expect(row.curve.kind, `${name}'s row declares a curve after all`).toBe('none');
        expect(cell.curve, `${name} invented a curve its row does not assign`).toBeUndefined();
      }
    }
  });
});
