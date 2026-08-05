/**
 * TOY -- can ONE generated at-utility be the single handle for BOTH a component
 * classes file AND the article base layer?
 *
 * The proposed mechanism: emit a custom `@utility typography-<role>` carrying
 * the whole type bundle (family, size, weight, line-height, tracking) as var()
 * references into a `--typography-*` theme namespace, then let two consumers
 * read it:
 *
 *   path A  a component classes file writes class="typography-title"
 *   path B  the article base layer writes `article h1 { @apply typography-title }`
 *
 * One definition, two consumers. Whether that is even possible is a property of
 * the Tailwind v4 COMPILER, not of our generator. Rule 019fc544: a
 * generator-text proof does not transfer. So everything below is read out of a
 * sheet the real @tailwindcss/cli produced, using the same
 * `source(none)` + `@source` treatment `registryToCompiled` applies -- the base
 * theme comes from `registryToTailwind(registry)` so the probe sits in the real
 * sheet, next to the real @theme, not in a synthetic vacuum.
 *
 * PLACEHOLDER NAME. `typography-title` is a probe handle. It is NOT a proposed
 * role vocabulary -- the role names are Sean's design work and nothing here
 * proposes one.
 *
 * Selector shape is copied from the shipped `generateArticleBaseLayer`:
 * `@layer base { article h1 { @apply ... } }`. Using a different scope would
 * make any result an artifact of the fixture rather than of the mechanism.
 *
 * False-negative guard: with source(none), Tailwind emits a utility ONLY if a
 * scanned file mentions it. So the fixture below names every class the
 * assertions look for -- including the ones expected to be ABSENT. An absent
 * rule is only evidence when something asked for it.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** PLACEHOLDER role handle -- a probe, not a vocabulary proposal. */
const ROLE = 'title';
const UTILITY = `typography-${ROLE}`;

/**
 * The control. `--text-*` IS a Tailwind v4 theme namespace, so a leaf named
 * `--text-probeglyph` makes Tailwind infer a `.text-probeglyph` utility on its
 * own -- which is exactly the collision that produced the duplicate-declaration
 * finding on ease-* in PR 2027. `--typography-*` should behave differently.
 */
const CONTROL_LEAF = 'probeglyph';

interface TypeBundle {
  readonly family: string;
  readonly size: string;
  readonly weight: string;
  readonly lineHeight: string;
  readonly tracking: string;
  /** Container-query override, mirroring generateTypographyCompositeUtilities. */
  readonly cqSize: string;
}

const BASE_BUNDLE: TypeBundle = {
  family: 'var(--font-sans)',
  size: '2.25rem',
  weight: '700',
  lineHeight: '1.1',
  tracking: '-0.025em',
  cqSize: '3rem',
};

/** Only the size leaf moves in the retune pass. Everything else is held. */
const RETUNED_BUNDLE: TypeBundle = { ...BASE_BUNDLE, size: '9.5rem' };

/**
 * The `--typography-*` leaves. These go in `@theme` -- namespace inference only
 * happens for @theme vars, so parking them in :root would make question 3
 * vacuous.
 */
function themeBlock(bundle: TypeBundle): string {
  return [
    '@theme {',
    `  --typography-${ROLE}-family: ${bundle.family};`,
    `  --typography-${ROLE}-size: ${bundle.size};`,
    `  --typography-${ROLE}-weight: ${bundle.weight};`,
    `  --typography-${ROLE}-line-height: ${bundle.lineHeight};`,
    `  --typography-${ROLE}-tracking: ${bundle.tracking};`,
    `  --typography-${ROLE}-cq-size: ${bundle.cqSize};`,
    '',
    '  /* CONTROL: --text-* is a real Tailwind namespace. This one collides. */',
    `  --text-${CONTROL_LEAF}: 1.234rem;`,
    '}',
  ].join('\n');
}

/**
 * The single generated handle. Every declaration is a var() reference, never a
 * literal -- that is what lets a retune move both consumers while this block
 * itself stays byte-identical (the toy-9 invariant).
 *
 * The nested @container block is deliberate: the shipped typography composites
 * already nest one, and an at-rule inside a utility is the likeliest place for
 * the two consumption paths to diverge.
 */
function probeUtility(): string {
  return [
    `@utility ${UTILITY} {`,
    `  font-family: var(--typography-${ROLE}-family);`,
    `  font-size: var(--typography-${ROLE}-size);`,
    `  font-weight: var(--typography-${ROLE}-weight);`,
    `  line-height: var(--typography-${ROLE}-line-height);`,
    `  letter-spacing: var(--typography-${ROLE}-tracking);`,
    '  @container (min-width: 640px) {',
    `    font-size: var(--typography-${ROLE}-cq-size);`,
    '  }',
    '}',
    '',
    '/* CONTROL utility, same name a --text-* leaf would infer. */',
    `@utility text-${CONTROL_LEAF} {`,
    '  font-size: 9.99rem;',
    '}',
  ].join('\n');
}

/**
 * Path B: the article base layer, selector shape copied from the shipped one.
 *
 * The h2 rule is the REAL production shape. The shipped h1 entry is
 * `text-4xl font-bold tracking-tight mb-4 mt-0 text-accent-foreground` -- the
 * type bundle covers only the first three. The block spacing and the color are
 * NOT in the bundle, so the real entry is a MIXED @apply of the custom utility
 * plus built-ins. h1 stays bare so question 2 compares like with like; h2
 * carries the mix.
 */
function articleLayer(): string {
  return [
    '@layer base {',
    '  article h1 {',
    `    @apply ${UTILITY};`,
    '  }',
    '  article h2 {',
    `    @apply ${UTILITY} mb-4 mt-0 text-accent-foreground;`,
    '  }',
    '}',
  ].join('\n');
}

function buildSheet(bundle: TypeBundle): string {
  const system = generateBaseSystem({});
  const registry = new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
  const themeBody = registryToTailwind(registry, { includeImport: false });
  return [themeBody, themeBlock(bundle), probeUtility(), articleLayer()].join('\n\n');
}

interface CompileResult {
  readonly css: string | null;
  readonly stderr: string;
}

/**
 * Compile with the real CLI, mirroring registryToCompiled: source(none) plus
 * explicit @source directives, cwd pinned to the CLI package. minify is OFF --
 * the minifier reorders declarations, and question 2 compares declarations.
 *
 * stderr is captured rather than thrown. If @apply cannot reach a custom
 * utility, Tailwind's error text IS the answer to question 1.
 */
function compileSheet(sheet: string, contentSources: string[]): CompileResult {
  const require = createRequire(import.meta.url);
  const pkgDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
  const binPath = join(pkgDir, 'dist', 'index.mjs');
  const sources = contentSources.map((s) => `@source "${s}";`).join('\n');
  const input = `@import "tailwindcss" source(none);\n${sources}\n${sheet}`;
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-toy-typography-'));
  try {
    const tempInput = join(tempDir, 'input.css');
    const tempOutput = join(tempDir, 'output.css');
    writeFileSync(tempInput, input);
    try {
      execFileSync('node', [binPath, '-i', tempInput, '-o', tempOutput], {
        stdio: 'pipe',
        timeout: 60_000,
        cwd: pkgDir,
      });
    } catch (error) {
      const stderr =
        typeof error === 'object' && error !== null && 'stderr' in error
          ? String((error as { stderr: unknown }).stderr)
          : error instanceof Error
            ? error.message
            : String(error);
      return { css: null, stderr };
    }
    return { css: readFileSync(tempOutput, 'utf-8'), stderr: '' };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/** Every brace-balanced rule body whose selector line matches. Order preserved. */
function ruleBodies(css: string, selectorPattern: RegExp): string[] {
  const found: string[] = [];
  const re = new RegExp(selectorPattern.source, 'g');
  for (const match of css.matchAll(re)) {
    const openIdx = css.indexOf('{', match.index);
    if (openIdx === -1) continue;
    let depth = 1;
    for (let i = openIdx + 1; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          found.push(css.slice(openIdx + 1, i).trim());
          break;
        }
      }
    }
  }
  return found;
}

/**
 * Flatten a rule body into sorted `prop: value` lines, keeping nested at-rules
 * as prefixed entries so a dropped @container shows up as a missing entry
 * rather than silently comparing equal.
 */
function declarations(body: string, prefix = ''): string[] {
  const out: string[] = [];
  let i = 0;
  let buf = '';
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{') {
      let depth = 1;
      const start = i + 1;
      let j = start;
      for (; j < body.length; j++) {
        if (body[j] === '{') depth++;
        else if (body[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      const atRule = buf.trim();
      out.push(...declarations(body.slice(start, j), `${prefix}${atRule} > `));
      buf = '';
      i = j + 1;
      continue;
    }
    if (ch === ';') {
      const decl = buf.trim();
      if (decl) out.push(prefix + decl.replace(/\s+/g, ' '));
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const tail = buf.trim();
  if (tail) out.push(prefix + tail.replace(/\s+/g, ' '));
  return out.sort();
}

function declaredVar(css: string, name: string): string | null {
  const m = new RegExp(`--${name}\\s*:\\s*([^;}]+)`).exec(css);
  return m?.[1]?.trim() ?? null;
}

function assert(label: string, ok: boolean, detail: string): boolean {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  return ok;
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n');
}

async function main(): Promise<void> {
  // The fixture the compiler scans. Under source(none) an absent rule proves
  // nothing unless something asked for it -- so this names the classes expected
  // to be PRESENT and the ones expected to be ABSENT alike.
  const fixtureDir = join(HERE, '.fixture');
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(
    join(fixtureDir, 'probe.classes.ts'),
    [
      '// A component classes file -- consumption path A.',
      `export const titleClass = '${UTILITY}';`,
      '// Asked for so that ABSENCE is evidence: would exist if --typography-* were',
      '// a Tailwind theme namespace the way --text-* is.',
      `export const wouldBeInferred = '${UTILITY}-size ${UTILITY}-weight typography-${ROLE}-family';`,
      '// The control: --text-probeglyph IS in a real namespace.',
      `export const control = 'text-${CONTROL_LEAF}';`,
      '',
    ].join('\n'),
  );

  try {
    console.log('=== TOY -- one generated @utility, two consumers (compiled proof)');
    console.log(`\nprobe handle (PLACEHOLDER, not a vocabulary): ${UTILITY}`);
    console.log('\n--- the emitted handle:');
    console.log(indent(probeUtility().split('\n\n')[0] ?? ''));
    console.log('\n--- the article consumer:');
    console.log(indent(articleLayer()));

    const results: boolean[] = [];

    // ---------------------------------------------------------------- Q1 ---
    const base = compileSheet(buildSheet(BASE_BUNDLE), [fixtureDir]);
    console.log('\n=== Q1  does @apply reach a CUSTOM @utility we generated?');
    if (base.css === null) {
      console.log('  COMPILE FAILED. Tailwind stderr, verbatim:');
      console.log(indent(base.stderr.trim()));
      console.log(
        '\n  ANSWER: NO. @apply cannot reach the custom utility. That is the answer;\n' +
          '  no workaround is attempted. Q2-Q4 not reached.',
      );
      console.log('\n=== VERDICT: MECHANISM DISPROVED AT Q1');
      return;
    }
    const css = base.css;
    const allArticleH1 = ruleBodies(css, /article h1(?=\s*\{)/);
    const utilityRules = ruleBodies(css, new RegExp(`\\.${UTILITY}(?=\\s*\\{)`));
    // The SHIPPED generateArticleBaseLayer already emits its own `article h1`
    // rule from ARTICLE_ELEMENT_STYLES, so the compiled sheet holds more than
    // one. The probe's rule is the one carrying --typography-*; the shipped one
    // is left untouched and reported, not replaced.
    const articleRules = allArticleH1.filter((b) => b.includes('--typography-'));
    console.log('  compiled OK. `article h1` rule bodies in the sheet:', allArticleH1.length);
    for (const [i, body] of allArticleH1.entries()) {
      const origin = body.includes('--typography-')
        ? 'PROBE (@apply)'
        : 'shipped ARTICLE_ELEMENT_STYLES';
      console.log(`\n  [${i}] ${origin} -- article h1 {`);
      console.log(indent(body));
      console.log('  }');
    }
    results.push(
      assert(
        'the probe article h1 rule exists in the compiled sheet',
        articleRules.length === 1,
        '',
      ),
      assert(
        '@apply expanded the custom utility (declarations present, not the class name)',
        (articleRules[0]?.includes('font-size') ?? false) &&
          !(articleRules[0]?.includes('@apply') ?? false),
        '',
      ),
      assert(
        'expansion kept var() references rather than inlining computed values',
        articleRules[0]?.includes(`var(--typography-${ROLE}-size)`) === true,
        '',
      ),
      assert(
        'the nested @container survived the @apply expansion',
        articleRules[0]?.includes('@container') === true,
        'the at-rule-inside-a-utility risk',
      ),
    );

    // ---------------------------------------------------------------- Q2 ---
    console.log('\n=== Q2  do the two consumption paths produce IDENTICAL declarations?');
    console.log('\n  (a) component classes file -- .typography-title {');
    console.log(indent(utilityRules[0] ?? '<ABSENT>'));
    console.log('  }');
    console.log('\n  (b) bare h1 inside article via @apply -- article h1 {');
    console.log(indent(articleRules[0] ?? '<ABSENT>'));
    console.log('  }');
    const declsA = declarations(utilityRules[0] ?? '');
    const declsB = declarations(articleRules[0] ?? '');
    console.log('\n  normalized declaration sets:');
    console.log(`    (a) ${JSON.stringify(declsA, null, 0)}`);
    console.log(`    (b) ${JSON.stringify(declsB, null, 0)}`);
    const onlyA = declsA.filter((d) => !declsB.includes(d));
    const onlyB = declsB.filter((d) => !declsA.includes(d));
    if (onlyA.length || onlyB.length) {
      console.log(`    only in (a): ${JSON.stringify(onlyA)}`);
      console.log(`    only in (b): ${JSON.stringify(onlyB)}`);
    }
    results.push(
      assert('path (a) compiled at all', utilityRules.length >= 1, ''),
      assert(
        'declaration sets are identical',
        declsA.length > 0 && onlyA.length === 0 && onlyB.length === 0,
        `${declsA.length} declarations each`,
      ),
    );

    // The production call site is a MIXED @apply -- the custom utility plus the
    // built-ins the bundle does not cover.
    console.log('\n  the REAL production shape -- mixed custom + built-in @apply:');
    const mixed = ruleBodies(css, /article h2(?=\s*\{)/).find((b) => b.includes('--typography-'));
    console.log('  article h2 {');
    console.log(indent(mixed ?? '<ABSENT>'));
    console.log('  }');
    const mixedDecls = declarations(mixed ?? '');
    results.push(
      assert(
        'mixed @apply keeps every declaration of the custom utility intact',
        declsA.every((d) => mixedDecls.includes(d)),
        'custom + built-in in one @apply',
      ),
      assert(
        'the built-ins the bundle does NOT cover also land',
        mixedDecls.some((d) => d.startsWith('margin-bottom')) &&
          mixedDecls.some((d) => d.startsWith('color')),
        'margins and color are outside the type bundle',
      ),
    );
    console.log(
      '\n  BUNDLE INSUFFICIENCY (the answer-shaping finding):\n' +
        '    the shipped h1 entry is `text-4xl font-bold tracking-tight mb-4 mt-0\n' +
        '    text-accent-foreground`. The type bundle carries the first three. It does\n' +
        '    NOT carry mb-4 / mt-0 / text-accent-foreground. So a component writing\n' +
        '    class="typography-title" renders with DIFFERENT margins and color than a\n' +
        '    bare h1 inside article -- which is exactly the requirement. One handle is\n' +
        '    mechanically proven; one handle is NOT sufficient for the requirement\n' +
        '    unless the bundle grows to carry block spacing and color, or the\n' +
        '    components carry a second handle. That is a design decision, not a\n' +
        '    compiler fact, and this toy does not make it.',
    );

    // Identical declarations is not identical CASCADE. Reported, not asserted:
    // path (a) lands in @layer utilities, path (b) in @layer base, and the
    // shipped ARTICLE_ELEMENT_STYLES h1 entry still occupies `article h1`.
    console.log('\n  CASCADE NOTE (reported, not asserted):');
    console.log(
      `    the sheet holds ${allArticleH1.length} \`article h1\` rules -- the shipped\n` +
        '    ARTICLE_ELEMENT_STYLES entry and the probe. Identical DECLARATIONS do not\n' +
        '    mean identical cascade: path (a) sits in @layer utilities, path (b) in\n' +
        '    @layer base, and the shipped entry still contributes margins and color.\n' +
        '    A real rework REPLACES the h1 entry rather than adding beside it.',
    );

    // ---------------------------------------------------------------- Q3 ---
    console.log('\n=== Q3  namespace safety -- is --typography-* a Tailwind v4 namespace?');
    const leaf = declaredVar(css, `typography-${ROLE}-size`);
    console.log(
      `  --typography-${ROLE}-size declared in the compiled sheet: ${leaf ?? '<ABSENT>'}`,
    );
    const inferredCandidates = [
      `${UTILITY}-size`,
      `${UTILITY}-weight`,
      `typography-${ROLE}-family`,
    ];
    for (const cls of inferredCandidates) {
      const hits = ruleBodies(
        css,
        new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*\\{)`),
      );
      console.log(`  .${cls} (asked for by the fixture): ${hits.length} rule(s)`);
    }
    const controlHits = ruleBodies(css, new RegExp(`\\.text-${CONTROL_LEAF}(?=\\s*\\{)`));
    console.log(`\n  CONTROL -- .text-${CONTROL_LEAF}: ${controlHits.length} rule(s)`);
    for (const [i, body] of controlHits.entries()) {
      console.log(`    [${i}] { ${body.replace(/\s+/g, ' ')} }`);
    }
    results.push(
      assert(
        'the --typography-* leaf reaches the compiled sheet from @theme',
        leaf !== null,
        String(leaf),
      ),
      assert(
        `exactly ONE rule for .${UTILITY}`,
        utilityRules.length === 1,
        `${utilityRules.length} found`,
      ),
      assert(
        'no theme-inferred competitor from --typography-*',
        inferredCandidates.every(
          (cls) =>
            ruleBodies(
              css,
              new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s*\\{)`),
            ).length === 0,
        ),
        'all asked for by the fixture, none emitted',
      ),
      assert(
        `CONTROL: .text-${CONTROL_LEAF} DOES collide (>1 rule) -- proves the probe is live`,
        controlHits.length > 1,
        `${controlHits.length} rules, the PR-2027 ease-* shape`,
      ),
    );

    // ---------------------------------------------------------------- Q4 ---
    console.log('\n=== Q4  retune propagation -- move one leaf, both paths move together?');
    const retuned = compileSheet(buildSheet(RETUNED_BUNDLE), [fixtureDir]);
    if (retuned.css === null) {
      console.log('  retuned sheet failed to compile. stderr:');
      console.log(indent(retuned.stderr.trim()));
      results.push(assert('retuned sheet compiles', false, ''));
    } else {
      const rCss = retuned.css;
      const rUtility = ruleBodies(rCss, new RegExp(`\\.${UTILITY}(?=\\s*\\{)`))[0] ?? '';
      const rArticle =
        ruleBodies(rCss, /article h1(?=\s*\{)/).find((b) => b.includes('--typography-')) ?? '';
      const rLeaf = declaredVar(rCss, `typography-${ROLE}-size`);
      console.log(`  leaf before: ${leaf}`);
      console.log(`  leaf after:  ${rLeaf}`);
      console.log('\n  utility block after retune:');
      console.log(indent(rUtility));
      console.log('\n  article h1 after retune:');
      console.log(indent(rArticle));
      results.push(
        assert('the leaf actually moved', leaf !== rLeaf, `${leaf} -> ${rLeaf}`),
        assert(
          'utility block is BYTE-IDENTICAL across the retune (toy-9 invariant)',
          rUtility === (utilityRules[0] ?? ''),
          rUtility === (utilityRules[0] ?? '') ? 'unchanged' : 'CHANGED',
        ),
        assert(
          'article h1 block is BYTE-IDENTICAL across the retune',
          rArticle === (articleRules[0] ?? ''),
          rArticle === (articleRules[0] ?? '') ? 'unchanged' : 'CHANGED',
        ),
        assert(
          'both paths still point at the same moved leaf',
          rUtility.includes(`var(--typography-${ROLE}-size)`) &&
            rArticle.includes(`var(--typography-${ROLE}-size)`),
          'retune propagates through the var, not through regenerated rules',
        ),
      );
    }

    console.log(
      `\n=== VERDICT: ${results.every(Boolean) ? 'ALL ASSERTIONS PASS' : 'FAILURES ABOVE'}`,
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

await main();
