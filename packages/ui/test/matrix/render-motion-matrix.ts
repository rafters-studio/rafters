/**
 * Renders `motion.md` from `motion.jsonl`.
 *
 * The grid comes from the data; the laws and vocabulary prose come from
 * `motion-template.ts`. The markdown is a VIEW -- hand-editing it is how the
 * matrix drifts, which is the whole reason the jsonl exists.
 *
 * Run as a script to rewrite the markdown in place:
 *   pnpm --filter @rafters/ui matrix:motion
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MotionCell } from './motion-cell.ts';
import { parseMotionCells } from './motion-cell.ts';
import { EPILOGUE, GENERATED_HEADER, PREAMBLE, SECTIONS } from './motion-template.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const MATRIX_DIR = join(here, '../../docs/spec/matrix');
export const JSONL_PATH = join(MATRIX_DIR, 'motion.jsonl');
export const MARKDOWN_PATH = join(MATRIX_DIR, 'motion.md');

const NONE = '--';

function renderComponent(cell: MotionCell): string {
  return cell.collection === true ? `${cell.component} C` : cell.component;
}

function renderDuration(cell: MotionCell): string {
  const duration = cell.duration;
  switch (duration.kind) {
    case 'none':
      return NONE;
    case 'tier':
      return star(duration.tier, duration.provenance);
    case 'period':
      return star(`period-${duration.period}`, duration.provenance);
    case 'pointer-rule':
      return 'pointer rule';
    case 'follows':
      return `same as ${duration.source}`;
  }
}

function renderCurve(cell: MotionCell): string {
  const curve = cell.curve;
  switch (curve.kind) {
    case 'none':
      return NONE;
    case 'role':
      return star(curve.role, curve.provenance);
    case 'follows':
      return 'same';
  }
}

function renderDelays(cell: MotionCell): string {
  if (cell.delays.length === 0) return NONE;
  return cell.delays.map((delay) => star(`delay-${delay.generic}`, delay.provenance)).join(' + ');
}

function renderExtent(cell: MotionCell): string {
  const extent = cell.extent;
  switch (extent.kind) {
    case 'none':
      return NONE;
    case 'generic':
      return star(`extent-${extent.generic}`, extent.provenance);
    case 'structural':
      return extent.detail === undefined ? 'structural' : `structural (${extent.detail})`;
  }
}

/** The markdown's `*` means proposed and unreviewed. Only `proposed` earns it. */
function star(value: string, provenance: string): string {
  return provenance === 'proposed' ? `${value}*` : value;
}

const TABLE_HEADER = [
  '| component | part | transition | movement | duration | curve | delay | extent |',
  '|---|---|---|---|---|---|---|---|',
].join('\n');

function renderTable(cells: readonly MotionCell[]): string {
  const rows = cells.map((cell) =>
    [
      '',
      renderComponent(cell),
      cell.part,
      cell.transition,
      cell.movement,
      renderDuration(cell),
      renderCurve(cell),
      renderDelays(cell),
      renderExtent(cell),
      '',
    ]
      .join(' | ')
      .trim(),
  );
  return [TABLE_HEADER, ...rows].join('\n');
}

export function renderMotionMatrix(cells: readonly MotionCell[]): string {
  const parts: string[] = [GENERATED_HEADER, '', PREAMBLE];
  for (const section of SECTIONS) {
    const sectionCells = cells.filter((cell) => cell.section === section.heading);
    if (sectionCells.length === 0) {
      throw new Error(`section "${section.heading}" has no cells in motion.jsonl`);
    }
    parts.push(`### ${section.heading}`, section.intro, renderTable(sectionCells), section.outro);
  }
  parts.push(EPILOGUE);
  return parts.join('\n');
}

export function readMotionCells(): MotionCell[] {
  return parseMotionCells(readFileSync(JSONL_PATH, 'utf8'));
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(MARKDOWN_PATH, renderMotionMatrix(readMotionCells()));
  process.stdout.write(`rendered ${MARKDOWN_PATH}\n`);
}
