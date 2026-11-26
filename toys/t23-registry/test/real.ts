// Predictions 4 to 6: rafters' semantic colour system as intent data over the new rule files, against rafters' own values.
import { isDeepStrictEqual } from 'node:util';
import {
  importColorFamily,
  REGISTRY_PLUGINS,
  TokenRegistry,
} from '../../../packages/design-tokens/src/index.ts';
import { rules } from '../rules/index.ts';
import { Registry } from '../src/registry.ts';
import { colourIntent as intent, raftersTokens as all } from './default.ts';

const theirs = new TokenRegistry(all as never, REGISTRY_PLUGINS);
const byName = new Map(all.map((t) => [t.name, t]));
const ours = new Registry(intent, rules);
const semantic = intent.filter((s) => 'rule' in s);
const lightDiff = semantic.filter(
  (s) => !isDeepStrictEqual(ours.get(s.name, 'light')?.value, theirs.get(s.name)?.value),
);
const withDark = semantic.filter((s) => byName.has(`${s.name}--dark`));
const darkDiff = withDark.filter(
  (s) => !isDeepStrictEqual(ours.get(s.name, 'dark')?.value, theirs.get(`${s.name}--dark`)?.value),
);
console.log(
  `P4 ${semantic.length} semantic tokens: light differs ${lightDiff.length} ${JSON.stringify(lightDiff.slice(0, 3).map((s) => [s.name, ours.get(s.name)?.value, theirs.get(s.name)?.value]))}`,
);
console.log(
  `P4 ${withDark.length} with a dark twin: dark differs ${darkDiff.length} ${JSON.stringify(darkDiff.slice(0, 3).map((s) => [s.name, ours.get(s.name, 'dark')?.value, theirs.get(`${s.name}--dark`)?.value]))}`,
);

const foregrounds = semantic.filter((s) => 'rule' in s && s.rule === 'contrast').map((s) => s.name);
const famOf = (n: string) =>
  (
    ours.get(String((ours.get(n)?.rule?.args as { against: string }).against))?.value as {
      family: string;
    }
  ).family;
const seesFamily = foregrounds.filter((f) => ours.reads(f).includes(`${famOf(f)}@light`));
console.log(
  `P5 ${foregrounds.length} foregrounds; reads include the family behind the role: ${seesFamily.length}; e.g. primary-foreground reads ${ours.reads('primary-foreground').join(', ')}`,
);

const zinc = importColorFamily('zinc', '500', { l: 0.55, c: 0.03, h: 250, alpha: 1 })[0]?.value;
const ourReach = ours
  .reach('zinc')
  .filter((k) => foregrounds.includes(k.split('@')[0] ?? '')).length;
// Rafters' own cascade: every token whose plugin's declared dependsOn reaches zinc, transitively.
const plugins = new Map(REGISTRY_PLUGINS.map((p) => [p.name, p]));
const theirReached = new Set<string>();
for (let grew = true; grew; ) {
  grew = false;
  for (const t of all) {
    if (!t.binding || theirReached.has(t.name)) continue;
    const deps = plugins.get(t.binding.plugin)?.dependsOn(t.binding.input) ?? [];
    if (deps.some((d) => d === 'zinc' || theirReached.has(d)))
      (theirReached.add(t.name), (grew = true));
  }
}
const theirReach = all.filter(
  (t) => t.binding?.plugin === 'contrast' && theirReached.has(t.name),
).length;
ours.set('zinc', zinc, { reason: 'cooler grey' });
console.log(
  `P6 a change to the zinc family reaches ${ourReach} foreground tokens (both modes) here; rafters' cascade reaches ${theirReach} of its 132 foreground tokens`,
);

// P6, the case the hidden read decides: a designer points primary at another family, then that family changes.
const sky = { family: 'silver-true-sky', position: '600' };
const ours2 = new Registry(intent, rules);
ours2.set('primary', sky, { reason: 'brand blue' });
const ourSky = ours2.reach('silver-true-sky').filter((k) => k.startsWith('primary-foreground@'));
const theirSky = new Set<string>();
for (let grew = true; grew; ) {
  grew = false;
  for (const t of all) {
    if (!t.binding || theirSky.has(t.name)) continue;
    const deps = plugins.get(t.binding.plugin)?.dependsOn(t.binding.input) ?? [];
    if (deps.some((d) => d === 'silver-true-sky' || theirSky.has(d)))
      (theirSky.add(t.name), (grew = true));
  }
}
console.log(
  `P6 primary set to silver-true-sky 600; a change to that family reaches primary-foreground here: ${ourSky.join(', ') || 'no'}; in rafters: ${theirSky.has('primary-foreground') ? 'yes' : 'no'}`,
);
