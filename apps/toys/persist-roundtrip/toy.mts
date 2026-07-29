/**
 * TOY 8 -- does a signature-bound token SURVIVE THE FILE ROUND-TRIP?
 *
 * Every earlier toy answered "does the registry accept it" -- a behaviour question, at the
 * behaviour layer. The load-bearing question for shipping is a PERSISTENCE question and
 * lives at a different layer: saveRegistryToDir -> disk -> loadRegistryFromDir.
 *
 * If `binding` does not survive, every previous result is irrelevant: the token reloads as
 * a pass-1 leaf and never derives again.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { definePlugin } from '../../../packages/design-tokens/src/plugin.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';
import {
  loadRegistryFromDir,
  saveRegistryToDir,
} from '../../../packages/design-tokens/src/persistence.js';

const SigSchema = z.object({
  kind: z.literal('motion'),
  slots: z.object({ tier: z.string(), curve: z.string() }),
});
const signature = definePlugin<z.infer<typeof SigSchema>, string>({
  name: 'signature',
  inputSchema: SigSchema,
  outputSchema: z.string(),
  dependsOn: (i) => [`motion-duration-${i.slots.tier}`, `motion-easing-${i.slots.curve}`],
  transform: (i) => `var(--duration-${i.slots.tier}) var(--ease-${i.slots.curve})`,
});

const leaf = (name: string, value: string, extra: Record<string, unknown> = {}) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
  ...extra,
});

// Scratch inside the workspace, not /tmp -- the repo forbids /tmp for work files, and a
// persistence toy is exactly the case that reaches for it by reflex.
const dir = mkdtempSync(join(dirname(fileURLToPath(import.meta.url)), 'scratch-'));
try {
  const before = new TokenRegistry(
    [
      leaf('motion-duration-moderate', '250ms'),
      leaf('motion-duration-normal', '350ms'),
      leaf('motion-easing-enter', 'cubic-bezier(0, 0, 0.2, 1)'),
      {
        ...leaf('motion-semantic-dropdown-in', '', {
          dependsOn: ['motion-duration-moderate', 'motion-easing-enter'],
        }),
        binding: {
          plugin: 'signature',
          input: { kind: 'motion', slots: { tier: 'moderate', curve: 'enter' } },
        },
      },
    ],
    [signature],
  );

  const v = (r: TokenRegistry, n: string) => String((r.get(n) as { value?: unknown })?.value);
  console.log('1. in memory:            ', v(before, 'motion-semantic-dropdown-in'));

  saveRegistryToDir(dir, before);

  const onDisk = JSON.parse(readFileSync(join(dir, 'motion.rafters.json'), 'utf8'));
  const persisted = onDisk.tokens.find(
    (t: { name: string }) => t.name === 'motion-semantic-dropdown-in',
  );
  console.log('2. binding on disk:      ', JSON.stringify(persisted.binding));
  console.log('   dependsOn on disk:    ', JSON.stringify(persisted.dependsOn));
  console.log('   value on disk:        ', JSON.stringify(persisted.value));

  const after = loadRegistryFromDir(dir, [signature]);
  console.log('3. after reload:         ', v(after, 'motion-semantic-dropdown-in'));

  // The real test: does it still DERIVE after reload, or is it a frozen leaf?
  after.set('motion-semantic-dropdown-in', 'var(--duration-normal) var(--ease-enter)' as never, {
    reason: 'repoint after reload',
  });
  console.log('4. re-derives after reload?');
  console.log('   value:                ', v(after, 'motion-semantic-dropdown-in'));
  const node = after.list().find((t) => t.name === 'motion-semantic-dropdown-in');
  console.log('   binding survived set: ', JSON.stringify(node?.binding));

  // And is a reloaded token still schema-valid without any schema change?
  const { TokenSchema } = await import('../../../packages/shared/src/types.js');
  const p = TokenSchema.safeParse(after.get('motion-semantic-dropdown-in'));
  console.log(
    '5. TokenSchema after RT: ',
    p.success ? 'VALID' : p.error.issues.map((i) => i.path.join('.')).join(','),
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
