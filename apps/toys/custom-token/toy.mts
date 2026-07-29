/**
 * TOY 5 -- can a designer-authored custom token exist and survive?
 * Real TokenRegistry, real TokenSchema.
 */
import { TokenSchema } from '../../../packages/shared/src/types.js';
import { TokenRegistry } from '../../../packages/design-tokens/src/registry.js';

const reg = new TokenRegistry(
  [
    {
      name: 'font-size-5xl',
      value: '3rem',
      category: 'typography',
      namespace: 'typography',
      userOverride: null,
    },
  ],
  [],
);

// A designer creates h2-special. It is theirs, so it gets an override by default.
reg.define({
  name: 'h2-special',
  value: '3rem',
  category: 'typography',
  namespace: 'typography',
  userOverride: null,
});
reg.set('h2-special', '3.5rem', { reason: 'designer: custom h2 variant' });

const tok = reg.get('h2-special') as Record<string, unknown>;
console.log('1. created + set:');
console.log('   userOverride =', JSON.stringify(tok.userOverride));

console.log('\n2. does it validate against TokenSchema (i.e. round-trip to disk)?');
const parsed = TokenSchema.safeParse(tok);
if (parsed.success) console.log('   VALID');
else
  for (const i of parsed.error.issues)
    console.log(`   INVALID  path=${i.path.join('.')}  ${i.message}`);

console.log('\n3. would --reset back it up? (filter is t.userOverride)');
console.log('   backed up:', Boolean(tok.userOverride));

console.log('\n4. does an override block re-derivation? (cascadeFrom skips node.userOverride)');
console.log(
  '   a custom token that REFERENCES other tokens would be pinned:',
  Boolean(tok.userOverride),
);
