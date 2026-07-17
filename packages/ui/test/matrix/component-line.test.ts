/**
 * The matrix stays schema-valid. Every line of components.jsonl parses
 * against ComponentLineSchema; a port that updates its line wrong fails here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ComponentLineSchema } from '../../docs/spec/matrix/component-line.schema.js';

const MATRIX = join(__dirname, '../../docs/spec/matrix/components.jsonl');

const lines = readFileSync(MATRIX, 'utf-8')
  .split('\n')
  .filter((l) => l.trim().length > 0)
  .map((l, i) => ({ raw: JSON.parse(l) as unknown, lineNo: i + 1 }));

describe('component matrix', () => {
  it('has one line per in-scope component', () => {
    expect(lines.length).toBe(57);
  });

  it.each(lines.map((l) => [(l.raw as { name?: string }).name ?? `line ${l.lineNo}`, l] as const))(
    '%s parses against ComponentLineSchema',
    (_name, l) => {
      const result = ComponentLineSchema.safeParse(l.raw);
      if (!result.success) {
        throw new Error(
          `line ${l.lineNo}: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        );
      }
    },
  );

  it('names are unique', () => {
    const names = lines.map((l) => (l.raw as { name: string }).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('ported components are exactly the landed ports', () => {
    const ported = lines
      .filter((l) => (l.raw as { status: string }).status === 'ported')
      .map((l) => (l.raw as { name: string }).name)
      .sort();
    expect(ported).toEqual([
      'alert',
      'badge',
      'button',
      'card',
      'container',
      'dialog',
      'grid',
      'input',
      'navigation-menu',
      'popover',
      'tooltip',
    ]);
  });
});
