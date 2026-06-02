import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Editor parity gap #5 (docs/EDITOR_PARITY_GOAL.md; editor-known-gaps.mdx
 * "Composites Imports From UI"). @rafters/composites is meant to be a pure
 * data-and-validation package any consumer (a worker, a CLI pipeline, a
 * non-React service) can pull in without dragging the UI primitive layer.
 * It previously imported fuzzyScore + BlockPaletteItem from @rafters/ui; both
 * are now local. This guard keeps it that way.
 */
function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...tsFilesUnder(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('composites is dependency-free except zod', () => {
  it('no source file imports @rafters/ui', () => {
    const srcDir = join(__dirname, '..', 'src');
    const offenders = tsFilesUnder(srcDir).filter((p) =>
      readFileSync(p, 'utf8').includes('@rafters/ui'),
    );
    expect(offenders).toEqual([]);
  });
});
