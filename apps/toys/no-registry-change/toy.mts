/**
 * TOY 7 -- can the signature approach land with ZERO registry change?
 *
 * Constraints being tested (all from adversarial review + operator ruling):
 *   C1. No TokenSchema change. value stays string | ColorValue | ColorReference.
 *   C2. No graph change. No new field on Token.
 *   C3. token.dependsOn is UNTOUCHED -- it is positional exporter metadata
 *       (dependsOn[1] = dark counterpart, tailwind.ts:88), preserved by
 *       registry.toToken (registry.ts:134-137). Only plugin.dependsOn derives.
 *   C4. Emission is var() NAMES, not resolved values -- matching what the sheet
 *       actually contains. The earlier toys resolved to values and so never
 *       demonstrated the real mode (adversarial F3).
 *
 * If all four hold, the only additions are: one plugin, and a signature object
 * living in binding.input -- which BindingSchema already types as z.unknown().
 */
import { z } from 'zod';
import { definePlugin } from '../../../packages/design-tokens/src/plugin.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';
import { TokenSchema } from '../../../packages/shared/src/types.js';

const TIERS = ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'] as const;
type Tier = (typeof TIERS)[number];

const SigSchema = z.object({
  kind: z.literal('motion'),
  slots: z.object({ tier: z.enum(TIERS), curve: z.string() }),
  emit: z.string(), // template with {tier} {curve} holes
});
type Sig = z.infer<typeof SigSchema>;

/** C4: refs render as var() NAMES. The cascade derives WHICH ref, not the value. */
const render = (s: Sig) =>
  s.emit
    .replace('{tier}', `var(--duration-${s.slots.tier})`)
    .replace('{curve}', `var(--ease-${s.slots.curve})`);

const signature = definePlugin<Sig, string>({
  name: 'signature',
  inputSchema: SigSchema,
  outputSchema: z.string(),
  // cascade edges, derived. NOT token.dependsOn.
  dependsOn: (i) => [`motion-duration-${i.slots.tier}`, `motion-easing-${i.slots.curve}`],
  transform: (i, get) => {
    for (const dep of [`motion-duration-${i.slots.tier}`, `motion-easing-${i.slots.curve}`]) {
      if (get(dep) === undefined) throw new Error(`signature: dangling ref "${dep}"`);
    }
    return render(i);
  },
});

/** The pair rule: exit points one band shorter. Changes WHICH var, not a value. */
const exitOf = definePlugin<{ from: string }, string>({
  name: 'signature:exit',
  inputSchema: z.object({ from: z.string() }),
  outputSchema: z.string(),
  dependsOn: (i) => [i.from],
  transform: (i, get) => {
    const v = String(get(i.from));
    const m = v.match(/var\(--duration-([a-z]+)\)/);
    if (!m?.[1]) throw new Error('signature:exit: source is not a duration ref');
    const idx = TIERS.indexOf(m[1] as Tier);
    return v.replace(`--duration-${m[1]}`, `--duration-${TIERS[Math.max(0, idx - 1)]}`);
  },
});

const leaf = (name: string, value: string, extra: Record<string, unknown> = {}) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
  ...extra,
});

const reg = new TokenRegistry(
  [
    ...TIERS.map((t) => leaf(`motion-duration-${t}`, `${TIERS.indexOf(t) * 50}ms`)),
    leaf('motion-easing-enter', 'cubic-bezier(0, 0, 0.2, 1)'),
    leaf('motion-easing-exit', 'cubic-bezier(0.4, 0, 1, 1)'),
    // C3: dependsOn written by hand exactly as the generator does today.
    {
      ...leaf('motion-semantic-dropdown-in', '', {
        dependsOn: ['motion-duration-moderate', 'motion-easing-enter'],
      }),
      binding: {
        plugin: 'signature',
        input: {
          kind: 'motion',
          slots: { tier: 'moderate', curve: 'enter' },
          emit: '{tier} {curve}',
        },
      },
    },
    {
      ...leaf('motion-semantic-dropdown-out', '', {
        dependsOn: ['motion-duration-fast', 'motion-easing-exit'],
      }),
      binding: { plugin: 'signature:exit', input: { from: 'motion-semantic-dropdown-in' } },
    },
  ],
  [signature, exitOf],
);

const show = (label: string) => {
  console.log(`\n--- ${label}`);
  for (const n of ['motion-semantic-dropdown-in', 'motion-semantic-dropdown-out']) {
    const t = reg.get(n) as Record<string, unknown>;
    console.log(
      `  ${n.padEnd(30)} value=${String(t.value).padEnd(42)} dependsOn=${JSON.stringify(t.dependsOn)}`,
    );
  }
};

show('INITIAL -- emits var() names, not values');

console.log('\n--- C1: does the token still satisfy TokenSchema (unchanged)?');
const t = reg.get('motion-semantic-dropdown-in') as unknown;
const p = TokenSchema.safeParse(t);
console.log(
  '  ',
  p.success
    ? 'VALID -- no schema change needed'
    : p.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
);

// The designer repoints the tier. The emitted REFERENCE changes; the pair follows.
reg.set(
  'motion-semantic-dropdown-in',
  render({
    kind: 'motion',
    slots: { tier: 'normal', curve: 'enter' },
    emit: '{tier} {curve}',
  }) as never,
  { reason: 'designer: dropdown enters slower' },
);
show('after repointing enter tier moderate -> normal');

console.log('\n--- C3: was token.dependsOn mutated by any of that?');
for (const n of ['motion-semantic-dropdown-in', 'motion-semantic-dropdown-out']) {
  const tok = reg.get(n) as Record<string, unknown>;
  console.log(`  ${n.padEnd(30)} ${JSON.stringify(tok.dependsOn)}`);
}
