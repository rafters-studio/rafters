/**
 * TOY -- motion in the token registry, fitted to the EXISTING TokenSchema.
 *
 * Real TokenRegistry, real definePlugin, real graph. Nothing mocked.
 *
 * THE CONSTRAINT: TokenSchema's value union is [string, ColorValue, ColorReference].
 * There is no motion-reference arm and the schema is deliberately settled, so a
 * structured {tier} value is rejected at construction.
 *
 * THE FIT: a motion token's value is the string the exporter already emits --
 * `var(--duration-moderate)` / `var(--ease-enter)`. Legal today, passes straight
 * through tokenValueToCSS, and preserves the property that matters: the emitted
 * rule references the tier rather than inlining 250ms, so a tier change re-themes
 * at runtime instead of needing a regenerate.
 *
 * The structured coordinates live in `binding.input`, which BindingSchema types as
 * z.unknown() -- unconstrained by design. So the graph gets structure where it
 * needs it and the schema stays shut.
 *
 * WHAT THE GRAPH IS FOR: not intent, and not tier changes. Those flow through CSS
 * var() indirection with no reference moving -- intent re-values an anchor, exactly
 * as a palette swap re-values zinc-900 without touching primary's reference. The
 * graph carries the PAIR RULES, the only place a motion value derives from another
 * motion value:
 *   exit duration = one band shorter than its enter   (greet warmly, leave quietly)
 *   exit curve    = the mirror of its enter           (decelerate <-> accelerate)
 */

import { z } from 'zod';
import { definePlugin } from '../../../packages/design-tokens/src/plugin.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

// ------------------------------------------------------------- the raw values

/** Agreed baseline (legion 019f956f), NOT the drifted emitted 200/300/400. */
const TIER_MS = {
  instant: '0ms',
  micro: '100ms',
  fast: '150ms',
  moderate: '250ms',
  normal: '350ms',
  slow: '500ms',
} as const;
const TIER_LADDER = ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'] as const;
type Tier = (typeof TIER_LADDER)[number];

/** The six anchors at efficient. An intent change re-values THESE. */
const ANCHORS_EFFICIENT = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  linear: 'linear',
  'spring-smooth': 'cubic-bezier(0.25, 1, 0.5, 1)',
  'spring-snappy': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

const MIRROR: Record<string, string> = {
  enter: 'exit',
  exit: 'enter',
  'spring-smooth': 'exit',
  'spring-snappy': 'exit',
  standard: 'standard',
  linear: 'linear',
};

// --------------------------------------------------- the reference, as a string

/**
 * One producer, one grammar. These are not parsed user input -- every instance is
 * emitted by this layer, so the round-trip is total and a miss is a thrown error
 * rather than a silent fallback.
 */
const durationRef = (tier: Tier) => `var(--duration-${tier})`;
const curveRef = (curve: string) => `var(--ease-${curve})`;

const DURATION_REF = /^var\(--duration-([a-z]+)\)$/;
const CURVE_REF = /^var\(--ease-([a-z-]+)\)$/;

function readTier(v: unknown, who: string): Tier {
  const m = typeof v === 'string' ? v.match(DURATION_REF) : null;
  const tier = m?.[1];
  if (!tier || !(TIER_LADDER as readonly string[]).includes(tier)) {
    throw new Error(`${who}: "${String(v)}" is not a duration reference`);
  }
  return tier as Tier;
}

function readCurve(v: unknown, who: string): string {
  const m = typeof v === 'string' ? v.match(CURVE_REF) : null;
  if (!m?.[1]) throw new Error(`${who}: "${String(v)}" is not a curve reference`);
  return m[1];
}

// -------------------------------------------------------------------- plugins

/** PAIR RULE, magnitude. Exit is one band shorter than its enter. */
const motionExitDuration = definePlugin<{ from: string; shortenBy: number }, string>({
  name: 'motion:exit-duration',
  inputSchema: z.object({ from: z.string(), shortenBy: z.number().int().min(1) }),
  outputSchema: z.string(),
  dependsOn: (input) => [input.from],
  transform: (input, get) => {
    const tier = readTier(get(input.from), 'motion:exit-duration');
    const i = TIER_LADDER.indexOf(tier);
    const exit = TIER_LADDER[Math.max(0, i - input.shortenBy)];
    if (!exit) throw new Error('motion:exit-duration: ladder underflow');
    return durationRef(exit);
  },
});

/** PAIR RULE, character. Exit curve mirrors its enter. Snaps to an anchor NAME. */
const motionMirrorCurve = definePlugin<{ from: string }, string>({
  name: 'motion:mirror-curve',
  inputSchema: z.object({ from: z.string() }),
  outputSchema: z.string(),
  dependsOn: (input) => [input.from],
  transform: (input, get) => {
    const curve = readCurve(get(input.from), 'motion:mirror-curve');
    const mirrored = MIRROR[curve];
    if (!mirrored) throw new Error(`motion:mirror-curve: no mirror for "${curve}"`);
    return curveRef(mirrored);
  },
});

const MOTION_PLUGINS = [motionExitDuration, motionMirrorCurve];

// ------------------------------------------------------------------- registry

const leaf = (name: string, value: string) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
});

function build(): TokenRegistry {
  return new TokenRegistry(
    [
      // raw values -- the only place they exist
      ...TIER_LADDER.map((t) => leaf(`motion-duration-${t}`, TIER_MS[t])),
      ...Object.entries(ANCHORS_EFFICIENT).map(([r, v]) => leaf(`motion-curve-${r}`, v)),

      // designer choices: leaves holding a reference, as `primary` holds one
      leaf('motion-dropdown-in-duration', durationRef('moderate')),
      leaf('motion-dropdown-in-curve', curveRef('enter')),

      // derived: the pair rules
      {
        ...leaf('motion-dropdown-out-duration', ''),
        binding: {
          plugin: 'motion:exit-duration',
          input: { from: 'motion-dropdown-in-duration', shortenBy: 1 },
        },
      },
      {
        ...leaf('motion-dropdown-out-curve', ''),
        binding: { plugin: 'motion:mirror-curve', input: { from: 'motion-dropdown-in-curve' } },
      },
    ],
    MOTION_PLUGINS,
  );
}

// ---------------------------------------------------------------- experiments

const WATCH = [
  'motion-dropdown-in-duration',
  'motion-dropdown-in-curve',
  'motion-dropdown-out-duration',
  'motion-dropdown-out-curve',
];

function val(r: TokenRegistry, name: string): string {
  const t = r.get(name) as unknown;
  const v = t && typeof t === 'object' && 'value' in t ? (t as { value: unknown }).value : t;
  return String(v);
}

/** What the browser ends up with, following the reference one hop. */
function resolved(r: TokenRegistry, name: string): string {
  const v = val(r, name);
  const d = v.match(DURATION_REF);
  if (d) return val(r, `motion-duration-${d[1]}`);
  const c = v.match(CURVE_REF);
  if (c) return val(r, `motion-curve-${c[1]}`);
  return v;
}

function table(r: TokenRegistry, label: string) {
  console.log(`\n--- ${label}`);
  for (const n of WATCH) {
    console.log(`  ${n.padEnd(30)} ${val(r, n).padEnd(30)} -> ${resolved(r, n)}`);
  }
}

const registry = build();
table(registry, 'INITIAL');

registry.set('motion-dropdown-in-duration', durationRef('normal'), { reason: 'A' });
table(registry, 'A. enter moderate -> normal (exit derives one band shorter)');

registry.set('motion-dropdown-in-curve', curveRef('spring-smooth'), { reason: 'B' });
table(registry, 'B. enter curve -> spring-smooth (exit mirrors)');

const before = WATCH.map((n) => val(registry, n)).join('|');
registry.set('motion-curve-exit', 'cubic-bezier(0.6, 0, 1, 1)', { reason: 'C -- intent' });
table(registry, 'C. intent re-values --ease-exit');
console.log(`\n  references unchanged: ${before === WATCH.map((n) => val(registry, n)).join('|')}`);

registry.set('motion-dropdown-out-duration', durationRef('micro'), { reason: 'D -- pin exit' });
registry.set('motion-dropdown-in-duration', durationRef('slow'), { reason: 'D -- move enter' });
table(registry, 'D. exit pinned, then enter -> slow');
console.log(
  '\n  out-duration userOverride:',
  JSON.stringify(
    registry.list().find((t) => t.name === 'motion-dropdown-out-duration')?.userOverride,
  ),
);
