/**
 * TOY 9 -- the five motion namespaces as system tokens, zero registry change.
 *
 * The 2026-08-02 ruling: generics only, five namespaces of equal rank
 * (duration, ease, delay, extent, period), components bake generic utilities
 * resolving var(--rafters-*), Studio writes the values. This toy asks the
 * registry four questions:
 *
 *   Q1. Do delay/extent/period tokens satisfy TokenSchema UNCHANGED?
 *       (duration/ease already ship; the three new namespaces must not need
 *       a schema change.)
 *   Q2. Does a toy-level emission produce the vars + @utility blocks over
 *       var() NAMES (the #1955 lesson: we generate utilities ourselves)?
 *   Q3. ONE FAST EVERYWHERE, IN BYTES: retune the duration-fast leaf and
 *       re-emit -- exactly one line of CSS may differ (the var value).
 *       Every @utility block must be byte-identical, because utilities
 *       reference names, never values.
 *   Q4. Do the tokens survive a JSON roundtrip and still validate?
 *
 * Values are the July efficient baseline where one exists (legion 019f956f).
 * Extent/period values are MECHANICS PLACEHOLDERS, not tuned -- marked below.
 */
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';
import { TokenSchema } from '../../../packages/shared/src/types.js';

const NAMESPACES = {
  duration: {
    instant: '0ms',
    micro: '100ms',
    fast: '150ms',
    moderate: '250ms',
    normal: '350ms',
    slow: '500ms',
  },
  ease: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
    linear: 'linear',
    'spring-smooth': 'cubic-bezier(0.25, 1, 0.5, 1)',
    'spring-snappy': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  delay: {
    'hover-intent': '200ms', // today hardcoded in tooltip/navigation-menu behaviors
    linger: '300ms', // placeholder
    'choreo-step': '50ms', // placeholder
    'stagger-step': '0ms', // zero is the expected efficient value
    skip: '300ms', // placeholder: warm-reopen grace window
  },
  extent: {
    pop: '0.95', // placeholder: zoom start scale
    press: '0.97', // placeholder: press depression scale
    draw: '1', // placeholder: indicator draw progress target
  },
  period: {
    spin: '1s',
    pulse: '2s',
    blink: '1.25s',
    shimmer: '2s',
  },
} as const;

type Ns = keyof typeof NAMESPACES;

const leaf = (name: string, value: string) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
});

const tokens = Object.entries(NAMESPACES).flatMap(([ns, members]) =>
  Object.entries(members).map(([m, v]) => leaf(`rafters-${ns}-${m}`, v)),
);

const reg = new TokenRegistry(tokens, []);

console.log(`--- ${tokens.length} system tokens across five namespaces`);

console.log('\n--- Q1: TokenSchema (unchanged) on the three NEW namespaces');
for (const name of ['rafters-delay-hover-intent', 'rafters-extent-pop', 'rafters-period-spin']) {
  const parsed = TokenSchema.safeParse(reg.get(name));
  console.log(
    `  ${name.padEnd(28)} ${parsed.success ? 'VALID' : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
  );
}

/** Q2: toy-level emission. Vars carry values; utilities carry NAMES only. */
const UTILITY_PROPERTY: Record<Ns, string> = {
  duration: 'transition-duration',
  ease: 'transition-timing-function',
  delay: 'transition-delay',
  extent: '--rafters-consumed-extent', // consumed inside transforms/keyframes
  period: 'animation-duration',
};

function emit(): string {
  const vars: string[] = [];
  const utilities: string[] = [];
  for (const [ns, members] of Object.entries(NAMESPACES)) {
    for (const m of Object.keys(members)) {
      const tokenName = `rafters-${ns}-${m}`;
      const t = reg.get(tokenName) as { value: string };
      vars.push(`  --${tokenName}: ${t.value};`);
      utilities.push(`@utility ${ns}-${m} { ${UTILITY_PROPERTY[ns as Ns]}: var(--${tokenName}); }`);
    }
  }
  return [':root {', ...vars, '}', '', ...utilities].join('\n');
}

const before = emit();
console.log('\n--- Q2: emission sample (first 4 vars, first 4 utilities)');
const lines = before.split('\n');
console.log(lines.slice(0, 5).join('\n'));
console.log(
  lines
    .filter((l) => l.startsWith('@utility'))
    .slice(0, 4)
    .join('\n'),
);

console.log('\n--- Q3: retune duration-fast 150ms -> 180ms, diff the emission');
reg.set('rafters-duration-fast', '180ms' as never, { reason: 'studio: brand tune' });
const after = emit();
const beforeLines = before.split('\n');
const afterLines = after.split('\n');
const changed = beforeLines
  .map((l, i) => (l !== afterLines[i] ? { i, from: l, to: afterLines[i] } : null))
  .filter((d): d is NonNullable<typeof d> => d !== null);
console.log(`  changed lines: ${changed.length}`);
for (const d of changed) console.log(`    line ${d.i}: ${d.from.trim()} -> ${d.to.trim()}`);
const utilitiesIdentical =
  beforeLines.filter((l) => l.startsWith('@utility')).join('\n') ===
  afterLines.filter((l) => l.startsWith('@utility')).join('\n');
console.log(`  all @utility blocks byte-identical: ${utilitiesIdentical}`);

console.log('\n--- Q4: JSON roundtrip, then re-validate');
const roundtripped: unknown = JSON.parse(JSON.stringify(reg.get('rafters-delay-skip')));
const rt = TokenSchema.safeParse(roundtripped);
console.log(`  rafters-delay-skip roundtrip: ${rt.success ? 'VALID' : 'INVALID'}`);

const verdicts = [changed.length === 1, utilitiesIdentical, rt.success];
console.log(`\n=== ${verdicts.every(Boolean) ? 'ALL HOLD' : 'FAILURES PRESENT'} ===`);
