// Round 3: rafters' 131 motion tokens as intent data over the rules, against rafters' own values.
import { isDeepStrictEqual } from 'node:util';
import { rules } from '../rules/index.ts';
import { Registry } from '../src/registry.ts';
import { motionIntent as intent, raftersTokens } from './default.ts';

const all = raftersTokens.filter((t) => t.namespace === 'motion');
const theirs = new Map(all.map((t) => [t.name, t.value]));
const zeroed = (n: string) => /^rafters-(duration|delay)-/.test(n);
const VAR = /var\(--(rafters-[\w-]+)\)/g;

const make = () =>
  new Registry(intent, rules, { axes: { motion: ['full', 'reduced'] }, law: ['reduced'] });
const ours = make();

// What rafters means, resolved: var() through rafters' tokens, JSON specs through their tiers, periods and curves.
const resolve = (v: string): string =>
  v.replace(VAR, (_, n: string) => resolve(String(theirs.get(n))));
const at = (n: string) => resolve(String(theirs.get(n)));
function full(n: string): unknown {
  const v = String(theirs.get(n));
  if (n.startsWith('motion-cell-')) {
    const c = JSON.parse(v);
    return {
      keyframe: c.keyframe,
      duration: at(
        c.duration.kind === 'tier'
          ? `rafters-duration-${c.duration.tier}`
          : `rafters-period-${c.duration.period}`,
      ),
      ...(c.curve ? { curve: at(`rafters-ease-${c.curve}`) } : {}),
    };
  }
  if (n.startsWith('motion-semantic-')) {
    const s = JSON.parse(v);
    return {
      properties: s.properties,
      duration: at(`rafters-duration-${s.durationTier}`),
      curve: at(`rafters-ease-${s.curve}`),
    };
  }
  return v.startsWith('{') ? v : resolve(v);
}
// The exporter's law: durations and delays zero, periods kept; a semantic's reduced spec re-sets properties and, with ms, the duration.
const lawResolve = (v: string): string =>
  v.replace(VAR, (_, n: string) => (zeroed(n) ? '0ms' : lawResolve(String(theirs.get(n)))));
function reduced(n: string): unknown {
  const v = String(theirs.get(n));
  if (zeroed(n)) return '0ms';
  if (n.startsWith('motion-cell-')) {
    const c = JSON.parse(v);
    return {
      keyframe: c.keyframe,
      duration: c.duration.kind === 'tier' ? '0ms' : at(`rafters-period-${c.duration.period}`),
      ...(c.curve ? { curve: at(`rafters-ease-${c.curve}`) } : {}),
    };
  }
  if (n.startsWith('motion-semantic-')) {
    const s = JSON.parse(v);
    return {
      properties: s.reducedMotion?.properties ?? s.properties,
      duration: s.reducedMotion?.ms !== undefined ? `${s.reducedMotion.ms}ms` : '0ms',
      curve: at(`rafters-ease-${s.curve}`),
    };
  }
  return v.startsWith('{') ? v : lawResolve(v);
}
const fullDiff = all.filter(
  (t) => !isDeepStrictEqual(ours.get(t.name, 'full')?.value, full(t.name)),
);
const redDiff = all.filter(
  (t) => !isDeepStrictEqual(ours.get(t.name, 'reduced')?.value, reduced(t.name)),
);
console.log(
  `R1 ${all.length} motion tokens; full differs ${fullDiff.length} ${JSON.stringify(fullDiff.slice(0, 2).map((t) => [t.name, ours.get(t.name, 'full')?.value, full(t.name)]))}`,
);
console.log(
  `R2 reduced differs from the exporter's law ${redDiff.length} ${JSON.stringify(redDiff.slice(0, 2).map((t) => [t.name, ours.get(t.name, 'reduced')?.value, reduced(t.name)]))}`,
);

const r = make();
const before = new Map(
  all.map((t) => [t.name, [r.get(t.name, 'full')?.value, r.get(t.name, 'reduced')?.value]]),
);
r.set('rafters-duration-normal', '300ms', { reason: 'calmer' });
const changedFull = all
  .filter((t) => !isDeepStrictEqual(r.get(t.name, 'full')?.value, before.get(t.name)?.[0]))
  .map((t) => t.name);
const changedRed = all
  .filter((t) => !isDeepStrictEqual(r.get(t.name, 'reduced')?.value, before.get(t.name)?.[1]))
  .map((t) => t.name);
const onNormal = all
  .filter((t) => t.name !== 'rafters-duration-normal' && /normal/.test(String(t.value)))
  .map((t) => t.name);
console.log(
  `R3 duration-normal 300ms: changed in full ${changedFull.length} (tokens naming the normal tier: ${onNormal.length}, all changed: ${onNormal.every((n) => changedFull.includes(n))}); changed in reduced ${changedRed.length}`,
);

let lawHeld = false;
try {
  r.set('rafters-duration-fast', '50ms', { reason: 'keep a little', mode: 'reduced' });
} catch (e) {
  lawHeld = (e as { code?: string }).code === 'law';
}
console.log(`R4 a designer choice in reduced is refused as law: ${lawHeld}`);

const loops = all.filter((t) => /infinite/.test(String(t.value))).map((t) => t.name);
const r2 = make();
r2.set('rafters-period-spin', '2s', { reason: 'slower spinner' });
console.log(
  `R7 looping animations ${loops.length}; after period-spin 2s, motion-animation-spin is "${r2.get('motion-animation-spin', 'full')?.value}"; reads ${r2.reads('motion-animation-spin', 'full').join(', ')}`,
);

const feedback = all
  .filter(
    (t) =>
      t.name.startsWith('motion-semantic-') && JSON.parse(String(t.value)).reducedMotion === null,
  )
  .map((t) => [
    t.name,
    JSON.parse(String(t.value)).properties.join('/'),
    (ours.get(t.name, 'reduced')?.value as { duration: string }).duration,
  ]);
console.log(
  `DOC semantic motions with no reduced spec, and their reduced duration: ${JSON.stringify(feedback)}`,
);
