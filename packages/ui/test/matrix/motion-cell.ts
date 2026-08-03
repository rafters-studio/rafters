/**
 * The motion matrix as data.
 *
 * `packages/ui/docs/spec/matrix/motion.jsonl` is the source of record for the
 * grid: one JSON line per `(component, part, transition)` cell. The markdown
 * sibling is a rendered view of it (see `render-motion-matrix.ts`).
 *
 * Two rules this module exists to enforce:
 *
 * 1. PROVENANCE IS A REAL FIELD. The markdown's `*` convention -- "proposed,
 *    unreviewed" -- does not survive machine reading, so every value-bearing
 *    dimension carries its own `provenance`. Nothing is ever presented as
 *    `measured` that was not measured.
 * 2. EVERY GENERIC NAMED EXISTS. Durations, curves, delays, extents and
 *    periods are drawn from five namespaces of equal rank. A typo fails loud
 *    here rather than resolving to nothing six weeks downstream.
 *
 * Dimensions that are NOT tunable carry no provenance: the pointer rule is a
 * law, a `structural` extent is geometry, and a `follows` value is whatever
 * the cell it follows resolved to. Giving those a provenance would imply
 * somebody could turn a knob on them.
 */
import { z } from 'zod';

export const SCHEMA_ID = 'rafters.motion-cell/1';

/** The five namespaces of equal rank. Nothing outside these is a generic. */
export const VOCABULARY = {
  duration: ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'],
  ease: ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'],
  delay: ['hover-intent', 'linger', 'choreo-step', 'stagger-step', 'skip'],
  extent: ['pop', 'press', 'draw'],
  period: ['spin', 'pulse', 'blink', 'shimmer'],
} as const satisfies Record<string, readonly string[]>;

export type Namespace = keyof typeof VOCABULARY;

/**
 * How a value got here. `baseline` is the July efficient baseline;
 * `proposed` is the markdown's `*` -- a starting position for the knobs,
 * never a measurement. `measured` and `tuned` arrive from knobs studies.
 */
export const ProvenanceSchema = z.enum(['baseline', 'proposed', 'measured', 'tuned']);
export type Provenance = z.infer<typeof ProvenanceSchema>;

const DurationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('tier'), tier: z.string().min(1), provenance: ProvenanceSchema }),
  z.object({ kind: z.literal('period'), period: z.string().min(1), provenance: ProvenanceSchema }),
  /** The pointer rule: the part tracks the pointer exactly. Not a tunable cell. */
  z.object({ kind: z.literal('pointer-rule') }),
  /** This cell takes whatever the cell it names resolved to. */
  z.object({ kind: z.literal('follows'), source: z.string().min(1) }),
]);

const CurveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({ kind: z.literal('role'), role: z.string().min(1), provenance: ProvenanceSchema }),
  z.object({ kind: z.literal('follows') }),
]);

const DelaySchema = z.object({
  generic: z.string().min(1),
  provenance: ProvenanceSchema,
});

const ExtentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('generic'),
    generic: z.string().min(1),
    provenance: ProvenanceSchema,
  }),
  /** Geometry, not a token: percent of own size, a fixed angle, a step distance. */
  z.object({ kind: z.literal('structural'), detail: z.string().min(1).optional() }),
]);

export const MotionCellSchema = z.object({
  schema: z.literal(SCHEMA_ID),
  /** Grid section the cell renders under. */
  section: z.string().min(1),
  component: z.string().min(1),
  /** Collection popups (the markdown's `C` marker) carry a staggered items row. */
  collection: z.literal(true).optional(),
  part: z.string().min(1),
  transition: z.string().min(1),
  /** Mechanics, verbatim as the grid states them. */
  movement: z.string().min(1),
  /** What the movement animates, resolved from the movement vocabulary. */
  properties: z.array(z.string().min(1)),
  duration: DurationSchema,
  curve: CurveSchema,
  delays: z.array(DelaySchema),
  extent: ExtentSchema,
  notes: z.string(),
});

export type MotionCell = z.infer<typeof MotionCellSchema>;

export function parseMotionCells(jsonl: string): MotionCell[] {
  const cells: MotionCell[] = [];
  for (const [index, line] of jsonl.split('\n').entries()) {
    if (line.trim() === '') continue;
    const parsed: unknown = JSON.parse(line);
    const result = MotionCellSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `motion.jsonl line ${index + 1}: ${result.error.issues[0]?.message ?? 'invalid'}`,
      );
    }
    cells.push(result.data);
  }
  return cells;
}

export interface VocabularyViolation {
  readonly cell: string;
  readonly dimension: 'duration' | 'curve' | 'delay' | 'extent';
  readonly namespace: Namespace;
  readonly name: string;
}

export function cellKey(cell: MotionCell): string {
  return `${cell.component} | ${cell.part} | ${cell.transition}`;
}

function member(namespace: Namespace, name: string): boolean {
  return (VOCABULARY[namespace] as readonly string[]).includes(name);
}

/**
 * Every tier, role, delay and extent generic a cell names must exist in the
 * five namespaces. Movement names are deliberately NOT validated here --
 * movements are mechanics, not tokens, and the grid describes them in prose.
 */
export function auditVocabulary(cells: readonly MotionCell[]): VocabularyViolation[] {
  const violations: VocabularyViolation[] = [];
  for (const cell of cells) {
    const key = cellKey(cell);
    if (cell.duration.kind === 'tier' && !member('duration', cell.duration.tier)) {
      violations.push({
        cell: key,
        dimension: 'duration',
        namespace: 'duration',
        name: cell.duration.tier,
      });
    }
    if (cell.duration.kind === 'period' && !member('period', cell.duration.period)) {
      violations.push({
        cell: key,
        dimension: 'duration',
        namespace: 'period',
        name: cell.duration.period,
      });
    }
    if (cell.curve.kind === 'role' && !member('ease', cell.curve.role)) {
      violations.push({ cell: key, dimension: 'curve', namespace: 'ease', name: cell.curve.role });
    }
    for (const delay of cell.delays) {
      if (!member('delay', delay.generic)) {
        violations.push({ cell: key, dimension: 'delay', namespace: 'delay', name: delay.generic });
      }
    }
    if (cell.extent.kind === 'generic' && !member('extent', cell.extent.generic)) {
      violations.push({
        cell: key,
        dimension: 'extent',
        namespace: 'extent',
        name: cell.extent.generic,
      });
    }
  }
  return violations;
}

export function formatViolation(violation: VocabularyViolation): string {
  return `${violation.cell}: ${violation.dimension} "${violation.name}" is not in the ${violation.namespace}-* namespace`;
}
