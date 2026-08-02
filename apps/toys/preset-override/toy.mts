/**
 * TOY 11 -- an intent preset is a value-set over system tokens. What happens
 * to a designer's pin when Studio applies a preset?
 *
 * The ruling stack: intents are Studio presets, never encoded in the system;
 * everything is overridable; intent is a starting position, not a lock. The
 * open mechanical question: preset application and designer pins both write
 * the same leaves. If Studio applies a preset NAIVELY (set every token), a
 * designer's tuned value is silently clobbered -- the exact drift-by-accident
 * class the provenance rules exist to prevent.
 *
 * This toy demonstrates the collision and the fix:
 *   1. designer pins duration-moderate (their brand sits low in the band);
 *   2. NAIVE preset apply -> pin clobbered, no error, nothing to see;
 *   3. RESPECTFUL apply (skip tokens whose userOverride reason marks a
 *      designer decision) -> pin survives, everything else moves.
 *
 * PRESET VALUES BELOW ARE FAKE -- obviously so (elegant has no measured row;
 * inventing one indistinguishable from measured is the forbidden move). The
 * mechanics are what is under test, not the numbers.
 */
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

const leaf = (name: string, value: string) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
});

const EFFICIENT: Record<string, string> = {
  'rafters-duration-fast': '150ms',
  'rafters-duration-moderate': '250ms',
  'rafters-duration-normal': '350ms',
  'rafters-duration-slow': '500ms',
};

/** FAKE-FOR-MECHANICS. Not elegant. Not measured. Not proposed. */
const FAKE_PRESET: Record<string, string> = {
  'rafters-duration-fast': '999ms',
  'rafters-duration-moderate': '999ms',
  'rafters-duration-normal': '999ms',
  'rafters-duration-slow': '999ms',
};

const reg = new TokenRegistry(
  Object.entries(EFFICIENT).map(([n, v]) => leaf(n, v)),
  [],
);

const show = (label: string) => {
  console.log(`\n--- ${label}`);
  for (const n of Object.keys(EFFICIENT)) {
    const t = reg.get(n) as { value: string; userOverride: unknown };
    console.log(
      `  ${n.padEnd(28)} ${String(t.value).padEnd(8)} userOverride=${JSON.stringify(t.userOverride)}`,
    );
  }
};

show('efficient defaults, nothing touched');

console.log('\n--- designer pins moderate to 220ms (their brand sits low in the band)');
reg.set('rafters-duration-moderate', '220ms' as never, { reason: 'designer: brand tune' });
show('after the pin -- note what the registry records');

console.log('\n--- NAIVE preset apply: set() every token in the value-set');
for (const [n, v] of Object.entries(FAKE_PRESET)) {
  reg.set(n, v as never, { reason: 'studio: apply preset' });
}
show('after naive apply');
const clobbered = (reg.get('rafters-duration-moderate') as { value: string }).value !== '220ms';
console.log(`  designer pin clobbered: ${clobbered} ${clobbered ? '<- THE DEFECT' : ''}`);

console.log('\n--- reset, re-pin, then RESPECTFUL apply: skip designer-reasoned overrides');
const reg2 = new TokenRegistry(
  Object.entries(EFFICIENT).map(([n, v]) => leaf(n, v)),
  [],
);
reg2.set('rafters-duration-moderate', '220ms' as never, { reason: 'designer: brand tune' });

const isDesignerPinned = (name: string): boolean => {
  const t = reg2.get(name) as { userOverride: unknown };
  const uo = t.userOverride;
  if (uo === null || uo === undefined) return false;
  const reason =
    typeof uo === 'object' && uo !== null && 'reason' in uo
      ? String((uo as { reason: unknown }).reason)
      : '';
  return reason.startsWith('designer:');
};

for (const [n, v] of Object.entries(FAKE_PRESET)) {
  if (isDesignerPinned(n)) {
    console.log(`  skipping ${n} -- designer pin present`);
    continue;
  }
  reg2.set(n, v as never, { reason: 'studio: apply preset' });
}
const t2 = reg2.get('rafters-duration-moderate') as { value: string };
const survived = t2.value === '220ms';
console.log(`  designer pin survived respectful apply: ${survived}`);

console.log(
  `\n=== ${!clobbered || survived ? (survived ? 'MECHANISM WORKS -- provenance-aware apply is required and sufficient' : 'UNEXPECTED') : 'UNEXPECTED'} ===`,
);
console.log(
  'NOTE: whatever userOverride actually records above is the finding -- if reason strings are not persisted, provenance needs a real field before Studio can apply presets safely.',
);
