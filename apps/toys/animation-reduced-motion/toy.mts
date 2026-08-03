/**
 * TOY 14 -- reduced motion for ANIMATION cells: which mechanism actually works?
 *
 * Spec #2017 open question: `motion-reduce:animate-none` on the consuming class
 * vs zeroing `animation-duration` in the composite emission -- confirm one
 * mechanism, matching the law's period exemption (loops slow, never stop).
 *
 * Measured at the COMPILED layer, both mechanisms in one sheet:
 *
 *   MECHANISM A  consumer class:  `animate-<cell> motion-reduce:animate-none`
 *                Nothing is emitted for reduced motion; the CONSUMER opts in.
 *
 *   MECHANISM B  emission:        `@utility anim-<cell>` carrying
 *                `animation: var(--animate-<cell>)` plus a nested
 *                `@media (prefers-reduced-motion: reduce) { animation-duration: 0ms }`
 *                -- the same shape the merged exporter already uses for the five
 *                namespaces (REDUCED_MOTION_ZEROED in tailwind.ts).
 *
 * Three questions: (1) which one actually stops the animation in the compiled
 * sheet, (2) is the period exemption expressible under each, (3) do they
 * double-apply when both are present.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Token } from '../../../packages/shared/src/types.js';
import { registryToTailwind } from '../../../packages/design-tokens/src/exporters/tailwind.js';
import { generateBaseSystem } from '../../../packages/design-tokens/src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  scalePlugin,
  statePlugin,
} from '../../../packages/design-tokens/src/plugins/index.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** One transition-shaped cell (zeroed by the law) and one loop cell (exempt). */
const CELLS = {
  'dialog-open': {
    value: 'scale-in var(--rafters-duration-normal) var(--rafters-ease-enter)',
    loop: false,
  },
  spinner: {
    value: 'spin var(--rafters-period-spin) var(--rafters-ease-linear) infinite',
    loop: true,
  },
} as const;

/** Classes the fixture mentions -- with source(none), nothing else compiles. */
const FIXTURE_CLASSES = [
  'animate-dialog-open',
  'animate-spinner',
  'motion-reduce:animate-none',
  'anim-dialog-open',
  'anim-spinner',
].join(' ');

function registryWithCells(): TokenRegistry {
  const system = generateBaseSystem({});
  const extra: Token[] = Object.entries(CELLS).map(([name, cell]) => ({
    name: `motion-animation-${name}`,
    value: cell.value,
    category: 'motion',
    namespace: 'motion',
    animationName: name,
    userOverride: null,
  }));
  return new TokenRegistry(
    [...system.allTokens, ...extra],
    [scalePlugin, contrastPlugin, statePlugin, invertPlugin],
  );
}

/**
 * MECHANISM B's candidate emission. One @utility per cell; the reduced-motion
 * block is emitted for transition-shaped cells and DELIBERATELY omitted for
 * loop cells -- the period exemption as set membership, not consumer discipline.
 */
function mechanismBUtilities(): string {
  const lines: string[] = [];
  for (const [name, cell] of Object.entries(CELLS)) {
    lines.push(`@utility anim-${name} {`);
    lines.push(`  animation: var(--animate-${name});`);
    if (!cell.loop) {
      lines.push('  @media (prefers-reduced-motion: reduce) {');
      lines.push('    animation-duration: 0ms;');
      lines.push('  }');
    }
    lines.push('}');
  }
  return lines.join('\n');
}

function compile(sheetBody: string, fixtureDir: string): string {
  const require = createRequire(import.meta.url);
  const pkgDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
  const input = `@import "tailwindcss" source(none);\n@source "${fixtureDir}";\n${sheetBody}`;
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-toy14-'));
  try {
    const tempInput = join(tempDir, 'input.css');
    const tempOutput = join(tempDir, 'output.css');
    writeFileSync(tempInput, input);
    execFileSync(
      'node',
      [join(pkgDir, 'dist', 'index.mjs'), '-i', tempInput, '-o', tempOutput, '--minify'],
      { stdio: 'pipe', timeout: 30_000, cwd: pkgDir },
    );
    return readFileSync(tempOutput, 'utf-8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/** Every compiled rule whose selector text contains `needle`, with its index. */
function rulesFor(css: string, needle: string): Array<{ index: number; text: string }> {
  const out: Array<{ index: number; text: string }> = [];
  const re = new RegExp(
    `\\.${needle.replace(/[\\.:]/g, '\\$&')}(?![a-z0-9-])[^{]*\\{[^}]*\\}`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) out.push({ index: m.index, text: m[0] });
  return out;
}

/** The reduced-motion media blocks, brace-balanced, with their sheet offsets. */
function reducedMotionBlocks(css: string): Array<{ index: number; text: string }> {
  const out: Array<{ index: number; text: string }> = [];
  const re = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    const start = m.index + m[0].length;
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          out.push({ index: m.index, text: css.slice(m.index, i + 1) });
          break;
        }
      }
    }
  }
  return out;
}

function assert(label: string, ok: boolean, detail = ''): boolean {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  return ok;
}

const results: boolean[] = [];
const fixtureDir = join(HERE, '.fixture');
mkdirSync(fixtureDir, { recursive: true });
writeFileSync(join(fixtureDir, 'x.classes.ts'), `export const x = '${FIXTURE_CLASSES}';\n`);

try {
  const registry = registryWithCells();
  const sheet = `${registryToTailwind(registry, { includeImport: false })}\n\n${mechanismBUtilities()}`;
  const css = compile(sheet, fixtureDir);

  console.log('=== TOY 14 -- reduced motion for animation cells, compiled');

  console.log('\n--- baseline: the two consuming rules');
  for (const klass of [
    'animate-dialog-open',
    'anim-dialog-open',
    'animate-spinner',
    'anim-spinner',
  ]) {
    for (const r of rulesFor(css, klass)) console.log(`  ${r.text}`);
  }

  console.log('\n--- MECHANISM A: motion-reduce:animate-none (consumer class)');
  const aRules = rulesFor(css, 'motion-reduce\\:animate-none');
  for (const r of aRules) console.log(`  @idx ${r.index}: ${r.text}`);
  const aBlocks = reducedMotionBlocks(css).filter((b) => b.text.includes('animate-none'));
  for (const b of aBlocks) console.log(`  media block @idx ${b.index}: ${b.text}`);
  const aStops = aBlocks.some((b) => /animation:\s*none/.test(b.text));
  results.push(
    assert('A compiles to a rule inside the reduced-motion media query', aBlocks.length > 0),
    assert('A sets animation:none -- the animation STOPS', aStops),
  );

  console.log('\n--- MECHANISM B: animation-duration zeroed in the emission');
  const bBlocks = reducedMotionBlocks(css).filter((b) => b.text.includes('.anim-'));
  for (const b of bBlocks) console.log(`  media block @idx ${b.index}: ${b.text}`);
  const bZeroes = bBlocks.some(
    (b) => /\.anim-dialog-open/.test(b.text) && /animation-duration:\s*0/.test(b.text),
  );
  results.push(
    assert('B compiles the nested @media inside the @utility', bBlocks.length > 0),
    assert('B zeroes animation-duration for the transition-shaped cell', bZeroes),
    assert(
      'B leaves the animation SHORTHAND intact (the element still lands at its end state)',
      bBlocks.every((b) => !/animation:\s*none/.test(b.text)),
    ),
  );

  console.log('\n--- PERIOD EXEMPTION (loops slow, never stop)');
  const bSpinnerZeroed = bBlocks.some((b) => /\.anim-spinner/.test(b.text));
  console.log(
    `  B: any reduced-motion block touching .anim-spinner? ${bSpinnerZeroed ? 'YES' : 'NO'}`,
  );
  console.log(
    '  A: motion-reduce:animate-none is ONE class; it carries no cell identity, so\n' +
      '     the exemption exists only if the author remembers not to type it on a loop.',
  );
  const aAppliesToAnything = aRules.length > 0;
  results.push(
    assert(
      'B expresses the exemption STRUCTURALLY -- the loop cell has no reduced-motion block',
      !bSpinnerZeroed,
      'set membership, same shape as REDUCED_MOTION_ZEROED omitting `period`',
    ),
    assert(
      'A cannot express it -- one cell-blind class that stops whatever it is typed on',
      aAppliesToAnything && aRules.every((r) => !/spin|dialog/.test(r.text)),
      'the compiled rule names no cell',
    ),
  );

  console.log('\n--- DOUBLE-APPLY: both present on the same element');
  const aIdx = aBlocks[0]?.index ?? -1;
  const bIdx = bBlocks[0]?.index ?? -1;
  console.log(`  source order in the compiled sheet: A @${aIdx}, B @${bIdx}`);
  const later = aIdx > bIdx ? 'A (animation:none)' : 'B (animation-duration:0ms)';
  console.log(`  same specificity (one class each), so the LATER rule wins: ${later}`);
  console.log(
    '  Consequence: with both applied, A lands last and resets the whole `animation`\n' +
      "  shorthand -- which also discards B's zeroed duration AND the end state. They do\n" +
      '  not compose; A silently swallows B.',
  );
  results.push(
    assert('the two mechanisms are not additive -- one wins by source order', aIdx !== bIdx),
  );

  console.log(
    '\n--- ANSWER\n' +
      '  B (zero animation-duration in the emission) is the mechanism. It stops the\n' +
      '  motion while keeping the end state, it carries the period exemption as data,\n' +
      '  and it needs nothing from the consumer. A is consumer discipline that cannot\n' +
      '  express the exemption and overrides B wherever both appear.',
  );

  console.log(
    `\n=== VERDICT: ${results.every(Boolean) ? 'ALL ASSERTIONS PASS' : 'FAILURES ABOVE'}`,
  );
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}
