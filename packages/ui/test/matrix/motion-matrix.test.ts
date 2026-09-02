/**
 * The motion matrix gate.
 *
 * Three things are held here, all of them the kind that rot silently:
 *   1. the jsonl parses and every cell is well-formed;
 *   2. every generic it names exists in the five namespaces -- a typo fails
 *      loud today, not in a generator six weeks from now;
 *   3. motion.md is exactly what the renderer produces, so a hand-edit to the
 *      markdown is a test failure rather than an undetected fork.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  auditVocabulary,
  cellKey,
  formatViolation,
  parseMotionCells,
  SCHEMA_ID,
  VOCABULARY,
} from './motion-cell.ts';
import { MARKDOWN_PATH, readMotionCells, renderMotionMatrix } from './render-motion-matrix.ts';

const cells = readMotionCells();

describe('motion.jsonl', () => {
  it('carries every cell of the grid', () => {
    // 147 + bar-chart | bar | enter and bar-chart | bar | enter-horizontal
    // (#2225's two layout-specific bar-enter motion cells) + chart-tooltip/
    // content closed->open and open->closed (#2228), opacity-only per
    // docs/MOTION.md's tooltip rule -- see the notes on those two rows for
    // why they do not `follow` tooltip's own cell. 147 + 2 + 2 = 151.
    expect(cells).toHaveLength(151);
  });

  it('declares the schema on every line', () => {
    expect(cells.every((cell) => cell.schema === SCHEMA_ID)).toBe(true);
  });

  it('has no duplicate (component, part, transition) cells', () => {
    const keys = cells.map(cellKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every tunable value a provenance and no untunable one', () => {
    for (const cell of cells) {
      const key = cellKey(cell);
      if (cell.duration.kind === 'tier' || cell.duration.kind === 'period') {
        expect(cell.duration, key).toHaveProperty('provenance');
      } else {
        expect(cell.duration, key).not.toHaveProperty('provenance');
      }
      if (cell.curve.kind !== 'role') {
        expect(cell.curve, key).not.toHaveProperty('provenance');
      }
      if (cell.extent.kind !== 'generic') {
        expect(cell.extent, key).not.toHaveProperty('provenance');
      }
    }
  });

  it('REJECTS provenance smuggled onto a non-tunable value', () => {
    // The negative assertions above only bite because the non-tunable union
    // members are strict: a plain z.object() would strip the key silently and
    // the data would look honest no matter what was committed. This pins the
    // rejection itself.
    const base = JSON.parse(JSON.stringify(cells.find((c) => c.duration.kind === 'pointer-rule')));
    base.duration = { kind: 'pointer-rule', provenance: 'measured' };
    expect(() => parseMotionCells(`${JSON.stringify(base)}\n`)).toThrow();

    const structural = JSON.parse(
      JSON.stringify(cells.find((c) => c.extent.kind === 'structural')),
    );
    structural.extent = { kind: 'structural', provenance: 'measured' };
    expect(() => parseMotionCells(`${JSON.stringify(structural)}\n`)).toThrow();
  });

  it('refuses to render a cell whose section matches no heading', () => {
    const orphan = JSON.parse(JSON.stringify(cells[0]));
    orphan.section = 'no such section';
    expect(() => renderMotionMatrix([...cells.slice(1), orphan])).toThrow(/rendered in no section/);
  });

  it('never claims a value was measured', () => {
    const provenances = new Set<string>();
    for (const cell of cells) {
      if ('provenance' in cell.duration) provenances.add(cell.duration.provenance);
      if ('provenance' in cell.curve) provenances.add(cell.curve.provenance);
      if ('provenance' in cell.extent) provenances.add(cell.extent.provenance);
      for (const delay of cell.delays) provenances.add(delay.provenance);
    }
    expect([...provenances].sort()).toEqual(['baseline', 'proposed']);
  });

  it('gives context-menu subcontent a hover-intent open and an undelayed close', () => {
    const subOpen = cells.find(
      (c) =>
        c.component === 'context-menu' &&
        c.part === 'subcontent' &&
        c.transition === 'closed -> open',
    );
    expect(subOpen?.duration).toMatchObject({ kind: 'tier', tier: 'moderate' });
    expect(subOpen?.curve).toMatchObject({ kind: 'role', role: 'enter' });
    expect(subOpen?.delays).toEqual([expect.objectContaining({ generic: 'hover-intent' })]);

    const subClose = cells.find(
      (c) =>
        c.component === 'context-menu' &&
        c.part === 'subcontent' &&
        c.transition === 'open -> closed',
    );
    expect(subClose?.duration).toMatchObject({ kind: 'tier', tier: 'fast' });
    expect(subClose?.curve).toMatchObject({ kind: 'role', role: 'exit' });
    expect(subClose?.delays).toEqual([]);
  });

  it('gives badge a fast, standard hover cell on root', () => {
    const badgeHover = cells.find(
      (c) => c.component === 'badge' && c.part === 'root' && c.transition === 'hover',
    );
    expect(badgeHover?.duration).toMatchObject({ kind: 'tier', tier: 'fast' });
    expect(badgeHover?.curve).toMatchObject({ kind: 'role', role: 'standard' });
  });

  it('gives color-picker a moderate enter and a fast exit fade on root', () => {
    const colorPickerOpen = cells.find(
      (c) => c.component === 'color-picker' && c.transition === 'closed -> open',
    );
    expect(colorPickerOpen?.duration).toMatchObject({ kind: 'tier', tier: 'moderate' });
    expect(colorPickerOpen?.curve).toMatchObject({ kind: 'role', role: 'enter' });

    const colorPickerClose = cells.find(
      (c) => c.component === 'color-picker' && c.transition === 'open -> closed',
    );
    expect(colorPickerClose?.duration).toMatchObject({ kind: 'tier', tier: 'fast' });
    expect(colorPickerClose?.curve).toMatchObject({ kind: 'role', role: 'exit' });
  });
});

describe('vocabulary validator', () => {
  it('finds every generic the matrix names in the five namespaces', () => {
    const violations = auditVocabulary(cells).map(formatViolation);
    expect(violations).toEqual([]);
  });

  it('fails loud on a matrix that invents generics', () => {
    const badPath = join(import.meta.dirname, 'fixtures/motion-bad.jsonl');
    const bad = parseMotionCells(readFileSync(badPath, 'utf8'));
    const violations = auditVocabulary(bad);

    expect(violations.map(formatViolation)).toEqual([
      'accordion | content | closed -> open: duration "swift" is not in the duration-* namespace',
      'accordion | chevron | open <-> closed: curve "bouncy" is not in the ease-* namespace',
      'tooltip | content | closed -> open: delay "dawdle" is not in the delay-* namespace',
      'tooltip | content | closed -> open: extent "wallop" is not in the extent-* namespace',
      'spinner | root | busy: duration "whirl" is not in the period-* namespace',
    ]);
  });

  it('names all five namespaces', () => {
    expect(Object.keys(VOCABULARY).sort()).toEqual([
      'delay',
      'duration',
      'ease',
      'extent',
      'period',
    ]);
  });
});

describe('motion.md', () => {
  it('is exactly what the renderer produces from the jsonl', () => {
    expect(readFileSync(MARKDOWN_PATH, 'utf8')).toBe(renderMotionMatrix(cells));
  });

  it('points a reader at the jsonl', () => {
    const markdown = readFileSync(MARKDOWN_PATH, 'utf8');
    expect(markdown).toContain('GENERATED FILE -- do not hand-edit');
    expect(markdown).toContain('packages/ui/docs/spec/matrix/motion.jsonl');
  });

  it('restores the proposed marker only for proposed values', () => {
    const markdown = readFileSync(MARKDOWN_PATH, 'utf8');
    expect(markdown).toContain('| tabs | indicator | active change |');
    expect(markdown).toContain('| fast* | standard* | -- | structural (distance) |');
    expect(markdown).toContain(
      '| accordion | content | closed -> open | reveal (y) + fade | normal | enter | -- | -- |',
    );
  });
});
