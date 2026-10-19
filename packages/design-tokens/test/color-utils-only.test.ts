/**
 * Structural guard: colour families come from color-utils only. #2669
 *
 * design-tokens and the CLI build no scale and compute no accessibility
 * metadata of their own; they call `buildColorValue` (and
 * `rebakeAccessibility` after a pin). This test fails, naming the offending
 * file, if any file under `packages/design-tokens/src` or `packages/cli/src`
 * imports one of color-utils' scale or WCAG building blocks.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_IMPORTS = [
  'generateOKLCHScale',
  'generateAccessibilityMetadata',
  'calculateWCAGContrast',
];

/** Repo root: packages/design-tokens/test/ -> three levels up. */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* sourceFiles(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

/** Static `import ... from '...'` and `export ... from '...'` clauses. */
const IMPORT_CLAUSE = /\b(?:import|export)\b[^;]*?\bfrom\s*['"][^'"]+['"]/gs;

function findForbiddenImports(trees: readonly string[]): string[] {
  const offenders: string[] = [];
  for (const tree of trees) {
    for (const file of sourceFiles(join(repoRoot, tree))) {
      const content = readFileSync(file, 'utf-8');
      for (const clause of content.match(IMPORT_CLAUSE) ?? []) {
        for (const name of FORBIDDEN_IMPORTS) {
          if (new RegExp(`\\b${name}\\b`).test(clause)) {
            offenders.push(`${relative(repoRoot, file)}: ${name}`);
          }
        }
      }
    }
  }
  return offenders;
}

describe('colour families come from color-utils only', () => {
  it('no file under packages/design-tokens/src or packages/cli/src imports a scale or WCAG builder', () => {
    const offenders = findForbiddenImports(['packages/design-tokens/src', 'packages/cli/src']);
    expect(
      offenders,
      `colour-family building blocks imported outside color-utils -- use buildColorValue:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('the guard catches a forbidden import', () => {
    const sample =
      "import {\n  buildColorValue,\n  generateOKLCHScale,\n} from '@rafters/color-utils';";
    expect(sample.match(IMPORT_CLAUSE)?.some((c) => /\bgenerateOKLCHScale\b/.test(c))).toBe(true);
  });
});
