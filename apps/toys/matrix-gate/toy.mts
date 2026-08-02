/**
 * TOY 10 -- the matrix as data, gated both directions against behaviour.
 *
 * The 2026-08-02 direction (#1990): cell EXISTENCE comes from behaviour
 * declarations; the matrix only ASSIGNS generics to declared cells. The gate
 * fails loud both ways:
 *   (a) an assignment referencing a cell no behaviour declares
 *       -> the matrix invented a moment;
 *   (b) a declared cell with no assignment
 *       -> a moment nobody decided about (zero is an answer, absence is not).
 *
 * This toy also does the honest thing to the REAL artifact: it parses the
 * full grid out of motion.fixture.md (snapshot of
 * packages/ui/docs/spec/matrix/motion.md, wip/motion-intent-matrix) and
 * audits every duration/curve/delay/extent entry against the five-namespace
 * vocabulary. A typo in the hand-authored matrix should fail HERE, today,
 * not in a generator six weeks from now.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));

const VOCAB = {
  duration: ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'],
  ease: ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'],
  delay: ['hover-intent', 'linger', 'choreo-step', 'stagger-step', 'skip'],
  extent: ['pop', 'press', 'draw'],
  period: ['spin', 'pulse', 'blink', 'shimmer'],
} as const;

const CellSchema = z.object({
  component: z.string().min(1),
  part: z.string().min(1),
  transition: z.string().min(1),
  movement: z.string().min(1),
  duration: z.string(),
  curve: z.string(),
  delay: z.string(),
  extent: z.string(),
});
type Cell = z.infer<typeof CellSchema>;

/** Parse every 8-column grid row out of the markdown tables. */
function parseMatrix(md: string): Cell[] {
  const cells: Cell[] = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cols = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cols.length !== 8) continue; // vocabulary/namespace tables have other widths
    if (cols[0] === 'component' || cols[0]?.startsWith('---')) continue;
    const candidate = {
      component: cols[0] ?? '',
      part: cols[1] ?? '',
      transition: cols[2] ?? '',
      movement: cols[3] ?? '',
      duration: cols[4] ?? '',
      curve: cols[5] ?? '',
      delay: cols[6] ?? '',
      extent: cols[7] ?? '',
    };
    const parsed = CellSchema.safeParse(candidate);
    if (parsed.success) cells.push(parsed.data);
  }
  return cells;
}

const strip = (s: string) => s.replace(/\*$/, '').trim();
const NONE = new Set(['--', '']);

function auditCell(c: Cell): string[] {
  const problems: string[] = [];
  const dur = strip(c.duration);
  const okDuration =
    NONE.has(dur) ||
    (VOCAB.duration as readonly string[]).includes(dur) ||
    (dur.startsWith('period-') &&
      (VOCAB.period as readonly string[]).includes(dur.slice('period-'.length))) ||
    dur === 'pointer rule' ||
    dur.startsWith('same as');
  if (!okDuration) problems.push(`duration "${c.duration}"`);
  if (dur.startsWith('period-')) {
    const p = dur.slice('period-'.length);
    if (!(VOCAB.period as readonly string[]).includes(p)) problems.push(`period "${p}"`);
  }

  const curve = strip(c.curve);
  if (!NONE.has(curve) && !(VOCAB.ease as readonly string[]).includes(curve) && curve !== 'same')
    problems.push(`curve "${c.curve}"`);

  const delay = strip(c.delay);
  if (!NONE.has(delay)) {
    const bare = delay.replace(/^delay-/, '').replace(/\s*\(.*\)$/, '');
    if (!(VOCAB.delay as readonly string[]).includes(bare)) problems.push(`delay "${c.delay}"`);
  }

  const extent = strip(c.extent);
  if (!NONE.has(extent) && !extent.startsWith('structural')) {
    const bare = extent.replace(/^extent-/, '');
    if (!(VOCAB.extent as readonly string[]).includes(bare)) problems.push(`extent "${c.extent}"`);
  }
  return problems;
}

const md = readFileSync(join(here, 'motion.fixture.md'), 'utf8');
const cells = parseMatrix(md);
console.log(`--- parsed ${cells.length} cells from the real matrix`);

console.log('\n--- AUDIT: every entry against the five-namespace vocabulary');
let bad = 0;
for (const c of cells) {
  const problems = auditCell(c);
  if (problems.length) {
    bad++;
    console.log(`  ${c.component} | ${c.part} | ${c.transition}: ${problems.join(', ')}`);
  }
}
console.log(
  bad === 0
    ? '  CLEAN -- every generic named in the matrix exists'
    : `  ${bad} cells name unknown generics`,
);

/** Stub behaviour declarations for three components (dialog, checkbox, tooltip). */
const DECLARED: Record<string, Set<string>> = {
  dialog: new Set([
    'content|closed -> open',
    'content|open -> closed',
    'overlay|closed -> open',
    'overlay|open -> closed',
    'close button|hover',
  ]),
  checkbox: new Set([
    'indicator|unchecked <-> checked',
    'root|unchecked <-> checked',
    'root/indicator|check sequence',
    'root|press',
  ]),
  // The delay generic lives in the content open row's delay column -- the
  // matrix models hover intent as a property of the open transition, not a
  // separate root moment. The first draft of this stub declared root|hover
  // -> open and the gate flagged it: proof the gate catches representation
  // drift between behaviour and matrix, including the author's own.
  tooltip: new Set(['content|closed -> open', 'content|open -> closed']),
};

function gate(assignments: Cell[], declared: Record<string, Set<string>>): string[] {
  const errors: string[] = [];
  const assignedKeys = new Set<string>();
  for (const c of assignments) {
    if (!(c.component in declared)) continue; // components outside the stub scope
    const key = `${c.part}|${c.transition}`;
    assignedKeys.add(`${c.component}:${key}`);
    if (!declared[c.component]?.has(key))
      errors.push(
        `INVENTED MOMENT: matrix assigns ${c.component} ${key} but behaviour never declares it`,
      );
  }
  for (const [component, keys] of Object.entries(declared)) {
    for (const key of keys) {
      if (!assignedKeys.has(`${component}:${key}`))
        errors.push(
          `UNDECIDED MOMENT: behaviour declares ${component} ${key} but no assignment exists (zero must be GIVEN, not absent)`,
        );
    }
  }
  return errors;
}

console.log('\n--- GATE, green path: real matrix vs faithful declarations');
const green = gate(cells, DECLARED);
console.log(
  green.length === 0 ? '  PASSES both directions' : green.map((e) => `  ${e}`).join('\n'),
);

console.log('\n--- GATE, failure (a): matrix invents a moment');
const invented = [
  ...cells,
  { ...cells[0]!, component: 'dialog', part: 'content', transition: 'shake on error' },
];
for (const e of gate(invented, DECLARED)) console.log(`  ${e}`);

console.log('\n--- GATE, failure (b): behaviour declares, nobody decided');
const undecided = {
  ...DECLARED,
  checkbox: new Set([...DECLARED.checkbox!, 'label|hover']),
};
for (const e of gate(cells, undecided)) console.log(`  ${e}`);
