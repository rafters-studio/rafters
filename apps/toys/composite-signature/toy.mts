/**
 * TOY 2 -- one composite format for motion, focus and shadow. One plugin.
 *
 * Real TokenRegistry, real definePlugin, real graph. Nothing mocked.
 *
 * THE HYPOTHESIS: the namespaces that currently disagree about how to encode a
 * composite are the same shape underneath.
 *
 *   fill    string + parser        (fill-signature.ts, FillStop[])
 *   shadow  decomposed part tokens (5 parts + composite via var())
 *   motion  JSON blob in `value`   + hand-written dependsOn
 *   focus   JSON blob in `value`   + hand-written dependsOn
 *
 * Four encodings for one idea: a value assembled from SLOTS, where a slot is
 * either a REFERENCE to another token or a LITERAL.
 *
 * WHAT THAT BUYS, and what this toy checks:
 *   A. dependsOn is DERIVED from the ref slots. It stops being a second copy of
 *      what the blob says, which is the seam sheet-out drifted through.
 *   B. ONE plugin serves every composite namespace.
 *   C. Editing a referenced token cascades into every composite using it.
 *   D. A ref to a token that does not exist fails LOUDLY at bind, not silently
 *      at render -- today a bad var() name just renders nothing.
 */

import { z } from 'zod';
import { definePlugin } from '../../../packages/design-tokens/src/plugin.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

// ------------------------------------------------------------- the format

const SlotSchema = z.union([
  z.object({ ref: z.string() }),
  z.object({ literal: z.union([z.string(), z.number()]) }),
]);
type Slot = z.infer<typeof SlotSchema>;

/**
 * A composite signature: named slots plus a template naming their order.
 * `kind` discriminates so an assembler can format per namespace without the
 * slots themselves carrying CSS knowledge.
 */
const SignatureSchema = z.object({
  kind: z.enum(['motion', 'focus', 'shadow']),
  slots: z.record(z.string(), SlotSchema),
  /** Slot names in emission order. Slots absent from this are metadata. */
  emit: z.array(z.string()),
});
type Signature = z.infer<typeof SignatureSchema>;

const isRef = (s: Slot): s is { ref: string } => 'ref' in s;

/** The whole reason dependsOn stops being hand-written. */
function refsOf(sig: Signature): readonly string[] {
  return Object.values(sig.slots)
    .filter(isRef)
    .map((s) => s.ref);
}

// ------------------------------------------------------------- one plugin

const ASSEMBLE: Record<Signature['kind'], (parts: string[]) => string> = {
  motion: (p) => p.join(' '),
  focus: (p) => p.join(' '),
  shadow: (p) => p.join(' '),
};

const signaturePlugin = definePlugin<Signature, string>({
  name: 'signature',
  inputSchema: SignatureSchema,
  outputSchema: z.string(),
  // Derived, not declared. This is the finding.
  dependsOn: (input) => refsOf(input),
  transform: (input, get) => {
    const parts = input.emit.map((name) => {
      const slot = input.slots[name];
      if (!slot) throw new Error(`signature: emit names "${name}" with no slot`);
      if (!isRef(slot)) return String(slot.literal);
      const value = get(slot.ref);
      // D. A dangling reference is an error here, not a silent no-op in CSS.
      if (value === undefined)
        throw new Error(`signature: slot "${name}" -> "${slot.ref}" missing`);
      return String(value);
    });
    return ASSEMBLE[input.kind](parts);
  },
});

// ------------------------------------------------------------------ tokens

const leaf = (name: string, value: string | number) => ({
  name,
  value: String(value),
  category: 'toy',
  namespace: name.split('-')[0] ?? 'toy',
  userOverride: null,
});

const composite = (name: string, sig: Signature) => ({
  ...leaf(name, ''),
  binding: { plugin: 'signature', input: sig },
});

function build(): TokenRegistry {
  return new TokenRegistry(
    [
      // shared leaves
      leaf('ring', 'oklch(0.6 0.2 250)'),
      leaf('duration-moderate', '250ms'),
      leaf('ease-enter', 'cubic-bezier(0, 0, 0.2, 1)'),
      leaf('shadow-color', 'oklch(0 0 0 / 0.1)'),
      leaf('focus-ring-width', '0.125rem'),

      // MOTION -- today a JSON blob plus hand-written dependsOn
      composite('motion-dropdown-in', {
        kind: 'motion',
        slots: {
          properties: { literal: 'opacity, transform' },
          duration: { ref: 'duration-moderate' },
          curve: { ref: 'ease-enter' },
        },
        emit: ['duration', 'curve'],
      }),

      // FOCUS -- today a JSON blob plus hand-written dependsOn
      composite('focus-ring', {
        kind: 'focus',
        slots: {
          width: { ref: 'focus-ring-width' },
          style: { literal: 'solid' },
          color: { ref: 'ring' },
        },
        emit: ['width', 'style', 'color'],
      }),

      // SHADOW -- today five separate part tokens plus a var() composite
      composite('shadow-sm', {
        kind: 'shadow',
        slots: {
          offsetX: { literal: '0' },
          offsetY: { literal: '1px' },
          blur: { literal: '2px' },
          spread: { literal: '0' },
          color: { ref: 'shadow-color' },
        },
        emit: ['offsetX', 'offsetY', 'blur', 'spread', 'color'],
      }),
    ],
    [signaturePlugin],
  );
}

// -------------------------------------------------------------- experiments

const WATCH = ['motion-dropdown-in', 'focus-ring', 'shadow-sm'];
const val = (r: TokenRegistry, n: string) => {
  const t = r.get(n) as { value?: unknown } | undefined;
  return String(t?.value);
};
const show = (r: TokenRegistry, label: string) => {
  console.log(`\n--- ${label}`);
  for (const n of WATCH) console.log(`  ${n.padEnd(22)} ${val(r, n)}`);
};

const registry = build();
show(registry, 'INITIAL -- three namespaces, one format, one plugin');

// A. dependsOn is derived, never written down.
console.log('\n--- A. dependsOn derived from ref slots (nothing hand-maintained)');
for (const n of WATCH) {
  const node = registry.list().find((t) => t.name === n);
  const sig = node?.binding?.input as Signature;
  console.log(`  ${n.padEnd(22)} ${JSON.stringify(refsOf(sig))}`);
}

// C. One leaf, many composites. Editing it cascades across namespaces.
registry.set('ring', 'oklch(0.7 0.25 20)', { reason: 'C -- brand ring changes' });
show(registry, 'C. set ring (focus-ring follows; others untouched)');

registry.set('duration-moderate', '240ms', { reason: 'C -- tier moves' });
show(registry, 'C. set duration-moderate (motion follows)');

// D. A dangling reference is loud. The token must be DEFINED before bind --
// registry.bind refuses an unregistered name, which is a separate guard and was
// what my first attempt actually tripped.
console.log('\n--- D. dangling ref fails at bind, not silently at render');
registry.define({
  name: 'focus-ring-broken',
  value: '',
  category: 'toy',
  namespace: 'focus',
  userOverride: null,
});
try {
  registry.bind('focus-ring-broken', 'signature', {
    kind: 'focus',
    slots: { color: { ref: 'ring-that-does-not-exist' } },
    emit: ['color'],
  });
  console.log(
    `  NO ERROR -- dangling ref accepted, value = "${val(registry, 'focus-ring-broken')}"`,
  );
} catch (e) {
  console.log(`  threw: ${(e as Error).message}`);
}

// D2. And the same slot pointing at a real token still works, so the guard is
// not just rejecting everything.
registry.define({
  name: 'focus-ring-ok',
  value: '',
  category: 'toy',
  namespace: 'focus',
  userOverride: null,
});
registry.bind('focus-ring-ok', 'signature', {
  kind: 'focus',
  slots: { color: { ref: 'ring' } },
  emit: ['color'],
});
console.log(`  control (real ref): focus-ring-ok = ${val(registry, 'focus-ring-ok')}`);
