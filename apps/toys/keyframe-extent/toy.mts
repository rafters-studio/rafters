/**
 * TOY 12 -- does scale(var(--rafters-extent-pop)) inside a @keyframes body
 * survive BOTH emission paths AND real Tailwind compilation?
 *
 * Spec #2017 claim 1: "keyframe bodies carry geometry as token references --
 * scale(var(--rafters-extent-pop)) to scale(1)". The open question attached to
 * it: do var() references inside keyframe bodies survive BOTH emission paths
 * and Tailwind compilation identically?
 *
 * Rule 019fc544: a generator-text proof does not transfer. "Both emission paths
 * call the same generateKeyframes()" is a source reading, not evidence. So this
 * toy compiles BOTH sheets through the real @tailwindcss/cli:
 *
 *   path A  tokensToTailwind        -> compiled by registryToCompiled (which is
 *                                      registryToTailwind + the CLI)
 *   path B  registryToTailwindStatic -> compiled here by the SAME CLI, with the
 *                                      same source(none) + @source treatment
 *                                      registryToCompiled applies, so the only
 *                                      difference measured is the sheet itself.
 *
 * False-negative guard: with source(none) Tailwind emits a utility only if some
 * scanned file mentions it. So the assertions are two-stage -- first prove the
 * CONSUMING rule (.animate-scale-in) is in the sheet, then prove the @keyframes
 * block and the var inside it. Keyframes absent while the consumer is present
 * would be stripping; both absent only means nothing asked for the animation.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Token } from '../../../packages/shared/src/types.js';
import {
  registryToCompiled,
  registryToTailwindStatic,
  tokensToTailwind,
} from '../../../packages/design-tokens/src/exporters/tailwind.js';
import { generateBaseSystem } from '../../../packages/design-tokens/src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  scalePlugin,
  statePlugin,
} from '../../../packages/design-tokens/src/plugins/index.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The spec's literal proposal: geometry as a reference to the extent leaf. */
const REFERENCED_KEYFRAME =
  'from { transform: scale(var(--rafters-extent-pop)); opacity: 0; } to { transform: scale(1); opacity: 1; }';

/** The class a component would consume -- Tailwind's animate-* from --animate-scale-in. */
const CONSUMING_CLASS = 'animate-scale-in';

function referencedRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  const tokens: Token[] = system.allTokens.map((t) =>
    t.name === 'motion-keyframe-scale-in' ? { ...t, value: REFERENCED_KEYFRAME } : t,
  );
  return new TokenRegistry(tokens, [scalePlugin, contrastPlugin, statePlugin, invertPlugin]);
}

/** Pull one @keyframes block out of a sheet, brace-balanced. Null if absent. */
function keyframesBlock(css: string, name: string): string | null {
  const re = new RegExp(`@keyframes\\s+${name}\\s*\\{`);
  const m = re.exec(css);
  if (!m) return null;
  let depth = 1;
  const start = m.index + m[0].length;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(m.index, i + 1);
    }
  }
  return null;
}

/** Grab the declared value of a custom property from a sheet. */
function declaredVar(css: string, name: string): string | null {
  const m = new RegExp(`--${name}\\s*:\\s*([^;}]+)`).exec(css);
  return m?.[1]?.trim() ?? null;
}

/**
 * Compile an arbitrary theme sheet with the real CLI, matching what
 * registryToCompiled does: source(none) plus explicit @source directives, so
 * the output is a pure function of (sheet, contentSources).
 */
function compileSheet(sheet: string, contentSources: string[]): string {
  const require = createRequire(import.meta.url);
  const pkgDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
  const binPath = join(pkgDir, 'dist', 'index.mjs');
  const body = sheet.replace('@import "tailwindcss";', '');
  const sources = contentSources.map((s) => `@source "${s}";`).join('\n');
  const input = `@import "tailwindcss" source(none);\n${sources}\n${body}`;
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-toy12-'));
  try {
    const tempInput = join(tempDir, 'input.css');
    const tempOutput = join(tempDir, 'output.css');
    writeFileSync(tempInput, input);
    execFileSync('node', [binPath, '-i', tempInput, '-o', tempOutput, '--minify'], {
      stdio: 'pipe',
      timeout: 30_000,
      cwd: pkgDir,
    });
    return readFileSync(tempOutput, 'utf-8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function assert(label: string, ok: boolean, detail: string): boolean {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  return ok;
}

async function main(): Promise<void> {
  const registry = referencedRegistry();
  const tokens = [...registry.list()];

  // The fixture the compiler scans. Without it, source(none) means no utility.
  const fixtureDir = join(HERE, '.fixture');
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(join(fixtureDir, 'x.classes.ts'), `export const x = '${CONSUMING_CLASS}';\n`);

  try {
    console.log('=== TOY 12 -- var() inside a @keyframes body, both paths, compiled');
    console.log(`\nkeyframe token value authored as:\n  ${REFERENCED_KEYFRAME}`);

    // --- EMISSION -------------------------------------------------------
    const emittedA = tokensToTailwind(tokens);
    const emittedB = registryToTailwindStatic(registry);
    const kfA = keyframesBlock(emittedA, 'scale-in');
    const kfB = keyframesBlock(emittedB, 'scale-in');

    console.log('\n--- EMISSION path A (tokensToTailwind)');
    console.log(kfA ?? '  <no @keyframes scale-in emitted>');
    console.log('\n--- EMISSION path B (registryToTailwindStatic)');
    console.log(kfB ?? '  <no @keyframes scale-in emitted>');

    const results: boolean[] = [];
    results.push(
      assert('A emits the var reference', kfA?.includes('var(--rafters-extent-pop)') === true, ''),
      assert('B emits the var reference', kfB?.includes('var(--rafters-extent-pop)') === true, ''),
      assert(
        'A and B emit the same block',
        kfA === kfB,
        kfA === kfB ? 'byte-identical' : 'DIVERGED',
      ),
    );

    console.log('\n--- EMISSION: the extent leaf declaration in each sheet');
    const leafEmitA = declaredVar(emittedA, 'rafters-extent-pop');
    const leafEmitB = declaredVar(emittedB, 'rafters-extent-pop');
    console.log(`  A  --rafters-extent-pop: ${leafEmitA ?? '<ABSENT>'}`);
    console.log(`  B  --rafters-extent-pop: ${leafEmitB ?? '<ABSENT>'}`);
    results.push(
      assert('A declares the leaf', leafEmitA !== null, String(leafEmitA)),
      assert('B declares the leaf', leafEmitB !== null, String(leafEmitB)),
    );

    // The animate bridge each path writes -- the line that feeds animate-*.
    const animA = declaredVar(emittedA, 'animate-scale-in');
    const animB = declaredVar(emittedB, 'animate-scale-in');
    console.log('\n--- EMISSION: the --animate-scale-in bridge');
    console.log(`  A  --animate-scale-in: ${animA ?? '<ABSENT>'}`);
    console.log(`  B  --animate-scale-in: ${animB ?? '<ABSENT>'}`);
    const bStaticTarget = animB?.match(/var\(--([a-z0-9-]+)\)/)?.[1];
    if (bStaticTarget) {
      const backing = declaredVar(emittedB, bStaticTarget);
      console.log(
        `  B  bridge points at --${bStaticTarget}, which the static sheet declares as: ${backing ?? '<ABSENT -- DANGLING>'}`,
      );
    }

    // --- COMPILATION ----------------------------------------------------
    const compiledA = await registryToCompiled(registry, { contentSources: [fixtureDir] });
    const compiledB = compileSheet(emittedB, [fixtureDir]);

    for (const [label, css] of [
      ['A (registryToCompiled)', compiledA],
      ['B (static sheet, same CLI)', compiledB],
    ] as const) {
      console.log(`\n--- COMPILED ${label}`);
      const consumer = /\.animate-scale-in\s*\{[^}]*\}/.exec(css)?.[0] ?? null;
      console.log(`  consumer rule: ${consumer ?? '<ABSENT>'}`);
      const kf = keyframesBlock(css, 'scale-in');
      console.log(`  keyframes:     ${kf ?? '<ABSENT>'}`);
      const leaf = declaredVar(css, 'rafters-extent-pop');
      console.log(`  leaf:          --rafters-extent-pop: ${leaf ?? '<ABSENT>'}`);

      results.push(
        assert(`${label}: consumer rule compiled`, consumer !== null, ''),
        assert(`${label}: @keyframes survived`, kf !== null, ''),
        assert(
          `${label}: var reference intact inside the keyframe`,
          kf?.includes('var(--rafters-extent-pop)') === true,
          kf === null ? 'no block to inspect' : 'not inlined, not stripped',
        ),
        assert(`${label}: leaf declared in the same sheet`, leaf !== null, String(leaf)),
      );
    }

    // --- BONUS: is the animation the keyframe belongs to actually alive? ---
    // The keyframe surviving is necessary, not sufficient. The consuming rule
    // is `animation: var(--animate-scale-in)`, so every var in that chain must
    // resolve in the SAME sheet or the animation never runs and the surviving
    // keyframe is decoration.
    console.log(
      '\n--- COMPILED: does the animate chain resolve? (necessary for the keyframe to run)',
    );
    for (const [label, css] of [
      ['A', compiledA],
      ['B', compiledB],
    ] as const) {
      const bridge = declaredVar(css, 'animate-scale-in');
      console.log(`  ${label}  --animate-scale-in: ${bridge ?? '<ABSENT>'}`);
      for (const ref of bridge?.match(/var\(--([a-z0-9-]+)\)/g) ?? []) {
        const varName = ref.slice(6, -1);
        const target = declaredVar(css, varName);
        console.log(
          `  ${label}    -> --${varName}: ${target ?? '<ABSENT -- DANGLING, animation does not run>'}`,
        );
      }
    }

    // --- THE NAME QUESTION THE MERGED EXPORTER RAISES --------------------
    // The shipped exporter routes extents through a fixed alias:
    //   extent: '--rafters-consumed-extent'  (tailwind.ts, MOTION_NAMESPACE_PROPERTY)
    // so `@utility extent-pop { --rafters-consumed-extent: var(--rafters-extent-pop) }`.
    // The spec text names the LEAF directly inside the keyframe. Both compile;
    // they are different consumption contracts. Reported, not resolved.
    const aliasUtility = /\.extent-pop\s*\{[^}]*\}/.exec(compiledA)?.[0] ?? null;
    console.log('\n--- NAME COLLISION (reported, not resolved)');
    console.log(
      `  merged exporter's extent utility: ${aliasUtility ?? '<not requested by fixture>'}`,
    );
    console.log(
      '  spec keyframe reads var(--rafters-extent-pop) (the leaf); the exporter\n' +
        '  publishes the chosen extent as --rafters-consumed-extent. A keyframe that\n' +
        '  names the leaf bypasses that indirection -- reviewer decision.',
    );

    console.log(
      `\n=== VERDICT: ${results.every(Boolean) ? 'ALL ASSERTIONS PASS' : 'FAILURES ABOVE'}`,
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

await main();
