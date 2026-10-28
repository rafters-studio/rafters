/**
 * Writes the article's type classes into container.classes.ts from
 * Typography's variants (#2889). Prose type is defined once, in Typography's
 * VARIANTS; the article styles bare native HTML, so it needs the same classes
 * behind descendant selectors (`[&_h2]:text-3xl`). Tailwind finds classes only
 * by reading source text (#2825), so the selectors are written out whole into
 * the generated block rather than built at runtime. A unit test fails when the
 * block and VARIANTS disagree.
 *
 * Usage: pnpm -C packages/ui generate:article-type
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TypographyVariant } from '../src/components/typography/typography.behavior';
import { typeClasses } from '../src/components/typography/typography.classes';

/** Each element the article styles, and the Typography variant whose type it takes. */
const ELEMENTS: ReadonlyArray<readonly [string, TypographyVariant]> = [
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['p', 'p'],
  ['ul', 'ul'],
  ['ol', 'ol'],
  ['li', 'li'],
  ['blockquote', 'blockquote'],
  ['code', 'code'],
  ['pre', 'codeblock'],
];

const BEGIN = '// BEGIN GENERATED article type: pnpm -C packages/ui generate:article-type';
const END = '// END GENERATED article type';

export const CONTAINER_CLASSES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/components/container/container.classes.ts',
);

class GeneratedBlockMissingError extends Error {
  constructor(path: string) {
    super(`${path} has no "${BEGIN}" ... "${END}" block`);
    this.name = 'GeneratedBlockMissingError';
  }
}

/** The generated block: one row per element that has any type. */
function renderArticleType(): string {
  const rows = ELEMENTS.map(([element, variant]) =>
    typeClasses(variant)
      .map((cls) => `[&_${element}]:${cls}`)
      .join(' '),
  )
    .filter(Boolean)
    .map((row) => `  '${row}',`);
  return [BEGIN, 'const articleType = [', ...rows, "].join(' ');", END].join('\n');
}

/** The source with its generated block replaced by a fresh one. */
export function withArticleType(source: string): string {
  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start === -1 || end < start) throw new GeneratedBlockMissingError(CONTAINER_CLASSES);
  return source.slice(0, start) + renderArticleType() + source.slice(end + END.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(CONTAINER_CLASSES, withArticleType(readFileSync(CONTAINER_CLASSES, 'utf-8')));
}
