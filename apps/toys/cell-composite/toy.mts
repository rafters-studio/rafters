/**
 * TOY 13 -- per-cell animation composites, IN the real token graph.
 *
 * Spec #2017 claim 2: each animated matrix cell gets a composite def that
 * REFERENCES its assigned tokens -- dialog-content open -> {keyframe: scale-in,
 * tier: normal, curve: enter} -- and the generator resolves those references to
 * var() at emission exactly as composites already do.
 *
 * Built on the REAL TokenRegistry with the REAL base-system leaves (toy-7
 * pattern: no registry change, no schema change -- the composite is an ordinary
 * bound token whose binding.input carries the cell's three references).
 *
 * Three properties, each measured:
 *   (a) CASCADE   -- retune the rafters-duration-normal leaf. The composite
 *                    recomputes without being touched, and the effective value
 *                    behind it moves.
 *   (b) OVERRIDE  -- registry.set on the composite pins it. The same leaf
 *                    retune no longer reaches it. ONE-WAY DOOR (019fc593).
 *   (c) NO SECOND FAST -- the composite emission is var() names only. Byte-level
 *                    negative assertions, toy-9 style.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { registryToTailwind } from '../../../packages/design-tokens/src/exporters/tailwind.js';
import { generateBaseSystem } from '../../../packages/design-tokens/src/generators/index.js';
import { definePlugin } from '../../../packages/design-tokens/src/plugin.js';
import {
  contrastPlugin,
  invertPlugin,
  scalePlugin,
  statePlugin,
} from '../../../packages/design-tokens/src/plugins/index.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const CellSchema = z.object({
  keyframe: z.string(),
  tier: z.string(),
  curve: z.string(),
});
type Cell = z.infer<typeof CellSchema>;

/** How many times each composite's transform has run -- the cascade's fingerprint. */
const recomputes = new Map<string, number>();

/**
 * The cell composite. Its output is REFERENCES: the keyframe name plus two
 * var() names. No duration literal, no curve literal -- resolving to values
 * here would mint a second copy of every tier.
 */
const cellAnimation = definePlugin<Cell, string>({
  name: 'cell-animation',
  inputSchema: CellSchema,
  outputSchema: z.string(),
  dependsOn: (i) => [`rafters-duration-${i.tier}`, `rafters-ease-${i.curve}`],
  transform: (i, get) => {
    for (const dep of [`rafters-duration-${i.tier}`, `rafters-ease-${i.curve}`]) {
      if (get(dep) === undefined) throw new Error(`cell-animation: dangling ref "${dep}"`);
    }
    const key = `${i.keyframe}|${i.tier}|${i.curve}`;
    recomputes.set(key, (recomputes.get(key) ?? 0) + 1);
    return `${i.keyframe} var(--rafters-duration-${i.tier}) var(--rafters-ease-${i.curve})`;
  },
});

/** The four animated cells the spec names, verbatim. */
const CELLS: Record<string, Cell> = {
  'dialog-content-open': { keyframe: 'scale-in', tier: 'normal', curve: 'enter' },
  'dialog-content-close': { keyframe: 'scale-out', tier: 'moderate', curve: 'exit' },
  'popover-content-open': { keyframe: 'scale-in', tier: 'moderate', curve: 'enter' },
  'popover-content-close': { keyframe: 'scale-out', tier: 'fast', curve: 'exit' },
};

function buildRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  const registry = new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
    cellAnimation,
  ]);
  for (const [name, cell] of Object.entries(CELLS)) {
    registry.define({
      name: `motion-animation-${name}`,
      value: '',
      category: 'motion',
      namespace: 'motion',
      animationName: name,
      keyframeName: cell.keyframe,
      userOverride: null,
      binding: { plugin: 'cell-animation', input: cell },
    });
  }
  return registry;
}

const valueOf = (registry: TokenRegistry, cell: string): string =>
  String(registry.get(`motion-animation-${cell}`)?.value ?? '<missing>');

const sheetVar = (css: string, name: string): string | null =>
  new RegExp(`--${name}\\s*:\\s*([^;}]+)`).exec(css)?.[1]?.trim() ?? null;

function assert(label: string, ok: boolean, detail = ''): boolean {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` -- ${detail}` : ''}`);
  return ok;
}

function compiledSheet(registry: TokenRegistry, klass: string): string {
  const fixtureDir = join(HERE, '.fixture');
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(join(fixtureDir, 'x.classes.ts'), `export const x = '${klass}';\n`);
  const require = createRequire(import.meta.url);
  const pkgDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
  const body = registryToTailwind(registry, { includeImport: false });
  const input = `@import "tailwindcss" source(none);\n@source "${fixtureDir}";\n${body}`;
  const tempDir = mkdtempSync(join(pkgDir, '.tmp-toy13-'));
  try {
    const tempInput = join(tempDir, 'input.css');
    const tempOutput = join(tempDir, 'output.css');
    writeFileSync(tempInput, input);
    execFileSync(
      'node',
      [join(pkgDir, 'dist', 'index.mjs'), '-i', tempInput, '-o', tempOutput, '--minify'],
      {
        stdio: 'pipe',
        timeout: 30_000,
        cwd: pkgDir,
      },
    );
    return readFileSync(tempOutput, 'utf-8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(fixtureDir, { recursive: true, force: true });
  }
}

const results: boolean[] = [];
const registry = buildRegistry();

console.log('=== TOY 13 -- per-cell animation composites in the graph');
console.log('\n--- the four cells, emitted (references only)');
for (const cell of Object.keys(CELLS)) {
  console.log(`  motion-animation-${cell.padEnd(22)} ${valueOf(registry, cell)}`);
}

// -------------------------------------------------------------- (a) CASCADE
console.log('\n--- (a) CASCADE: retune the rafters-duration-normal leaf');
const leafBefore = String(registry.get('rafters-duration-normal')?.value);
const beforeValue = valueOf(registry, 'dialog-content-open');
const beforeCount = recomputes.get('scale-in|normal|enter') ?? 0;
const cssBefore = registryToTailwind(registry);

registry.set('rafters-duration-normal', '220ms', {
  reason: 'designer: dialogs arrive quicker in this brand',
  kind: 'preference',
});

const afterValue = valueOf(registry, 'dialog-content-open');
const afterCount = recomputes.get('scale-in|normal|enter') ?? 0;
const cssAfter = registryToTailwind(registry);

console.log(
  `  leaf              ${leafBefore} -> ${String(registry.get('rafters-duration-normal')?.value)}`,
);
console.log(`  composite string  ${beforeValue}`);
console.log(`               ->   ${afterValue}`);
console.log(`  transform ran     ${beforeCount} -> ${afterCount} time(s) (never touched by hand)`);
console.log(
  `  sheet leaf line   --rafters-duration-normal: ${sheetVar(cssBefore, 'rafters-duration-normal')}`,
);
console.log(
  `               ->   --rafters-duration-normal: ${sheetVar(cssAfter, 'rafters-duration-normal')}`,
);
results.push(
  assert('the composite is a dependent -- the cascade recomputed it', afterCount > beforeCount),
  assert('the composite STRING is unchanged (it is a reference)', beforeValue === afterValue),
  assert(
    'the effective value behind the reference followed the leaf',
    sheetVar(cssBefore, 'rafters-duration-normal') === leafBefore &&
      sheetVar(cssAfter, 'rafters-duration-normal') === '220ms',
    `${leafBefore} -> 220ms, one line of the sheet, composite untouched`,
  ),
);

// A rebind (the designer repointing the cell at a different tier) is what moves
// the reference itself -- the other half of "change" the graph provides.
registry.bind('motion-animation-dialog-content-open', 'cell-animation', {
  keyframe: 'scale-in',
  tier: 'moderate',
  curve: 'enter',
});
console.log(`  after REBIND to tier moderate: ${valueOf(registry, 'dialog-content-open')}`);
results.push(
  assert(
    'a rebind moves WHICH var the cell points at',
    valueOf(registry, 'dialog-content-open').includes('--rafters-duration-moderate'),
  ),
);
registry.bind(
  'motion-animation-dialog-content-open',
  'cell-animation',
  CELLS['dialog-content-open'],
);

// ------------------------------------------------------------- (b) OVERRIDE
console.log('\n--- (b) OVERRIDE: pin the composite node itself');
const PIN = 'scale-in 250ms cubic-bezier(0.2, 0, 0, 1)';
registry.set('motion-animation-dialog-content-open', PIN, {
  reason: 'operator: this dialog is hand-tuned for the launch video',
  kind: 'preference',
});
const pinnedToken = registry.get('motion-animation-dialog-content-open');
console.log(`  pinned value      ${String(pinnedToken?.value)}`);
console.log(`  userOverride      ${JSON.stringify(pinnedToken?.userOverride)}`);

const countAtPin = recomputes.get('scale-in|normal|enter') ?? 0;
registry.set('rafters-duration-normal', '400ms', {
  reason: 'designer: retune again, after the pin',
  kind: 'preference',
});
const afterPinValue = valueOf(registry, 'dialog-content-open');
const countAfterPin = recomputes.get('scale-in|normal|enter') ?? 0;
console.log(`  leaf now          ${String(registry.get('rafters-duration-normal')?.value)}`);
console.log(`  composite now     ${afterPinValue}`);
console.log(`  transform ran     ${countAtPin} -> ${countAfterPin} time(s) after the pin`);
console.log(
  `  sibling cell (unpinned, same curve/other tier) still cascades: ${valueOf(registry, 'popover-content-open')}`,
);
results.push(
  assert('the pinned composite kept its pinned value', afterPinValue === PIN),
  assert('the cascade SKIPPED it -- transform never re-ran', countAfterPin === countAtPin),
  assert('userOverride is recorded with previousValue + reason', pinnedToken?.userOverride != null),
);
console.log(
  '\n  ONE-WAY DOOR (019fc593), stated plainly: TokenGraph.cascadeFrom skips any\n' +
    '  node with a userOverride (graph.ts: `if (!node || node.userOverride || !node.binding) continue`).\n' +
    '  It does NOT recompute-then-repin -- the derivation simply stops reaching the\n' +
    '  node. So a pinned composite STAYS pinned: every later leaf retune, every later\n' +
    '  system-wide motion change, flows past it silently. Pinning a cell composite\n' +
    '  buys a hand-tuned cell and pays for it by permanently leaving the cascade.\n' +
    '  MEASURED CAVEAT: the door has exactly one handle -- an explicit registry.bind()\n' +
    '  writes a fresh node with no userOverride and re-enters the cascade. Verified:',
);
const countBeforeRebind = recomputes.get('scale-in|normal|enter') ?? 0;
registry.bind(
  'motion-animation-dialog-content-open',
  'cell-animation',
  CELLS['dialog-content-open'],
);
const rebound = registry.get('motion-animation-dialog-content-open');
console.log(
  `    after rebind: value=${String(rebound?.value)} userOverride=${JSON.stringify(rebound?.userOverride)}`,
);
results.push(
  assert(
    'an explicit rebind clears the pin (the only exit)',
    rebound?.userOverride == null &&
      (recomputes.get('scale-in|normal|enter') ?? 0) > countBeforeRebind,
  ),
);

// -------------------------------------------------------- (c) NO SECOND FAST
console.log('\n--- (c) NO SECOND FAST: byte-level, every unpinned cell');
const LITERAL_PATTERNS: Array<[string, RegExp]> = [
  ['duration literal (ms)', /\d+\s*ms/],
  ['duration literal (s)', /\b\d+(\.\d+)?s\b/],
  ['curve literal', /cubic-bezier|linear\(|steps\(/],
  ['bare number', /(^|\s)\d+(\.\d+)?(\s|$)/],
];
for (const cell of Object.keys(CELLS)) {
  const value = valueOf(registry, cell);
  const hits = LITERAL_PATTERNS.filter(([, re]) => re.test(value)).map(([label]) => label);
  const varCount = value.match(/var\(--[a-z0-9-]+\)/g)?.length ?? 0;
  results.push(
    assert(
      `${cell}: ${varCount} var() refs, zero literals`,
      hits.length === 0 && varCount === 2,
      value,
    ),
  );
}

// The composite is alive, not decoration: prove the chain resolves compiled.
console.log('\n--- COMPILED: the cell composite reaches CSS with its refs resolvable');
const css = compiledSheet(registry, 'animate-popover-content-open');
const rule = /\.animate-popover-content-open\s*\{[^}]*\}/.exec(css)?.[0] ?? '<ABSENT>';
const bridge = sheetVar(css, 'animate-popover-content-open');
console.log(`  ${rule}`);
console.log(`  --animate-popover-content-open: ${bridge ?? '<ABSENT>'}`);
for (const ref of bridge?.match(/var\(--([a-z0-9-]+)\)/g) ?? []) {
  const varName = ref.slice(6, -1);
  console.log(`    -> --${varName}: ${sheetVar(css, varName) ?? '<ABSENT -- DANGLING>'}`);
}
results.push(
  assert('consuming class compiled', rule !== '<ABSENT>'),
  assert(
    'every var in the composite resolves in the same sheet',
    (bridge?.match(/var\(--([a-z0-9-]+)\)/g) ?? []).every(
      (r) => sheetVar(css, r.slice(6, -1)) !== null,
    ),
  ),
);

console.log(`\n=== VERDICT: ${results.every(Boolean) ? 'ALL ASSERTIONS PASS' : 'FAILURES ABOVE'}`);
