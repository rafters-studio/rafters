// Train on the controls plus nine tenths of rafters' clauses, test on the tenth held out, in turn.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
env.cacheDir = join(import.meta.dirname, 'models');
const controls = JSON.parse(readFileSync('controls.json', 'utf8')).flatMap((n) => n.clauses);
const test = JSON.parse(readFileSync('rafters-labelled.json', 'utf8'));
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
for (const id of ['Xenova/all-MiniLM-L6-v2', 'Xenova/bge-small-en-v1.5', 'Xenova/all-mpnet-base-v2']) {
  const e = await pipeline('feature-extraction', id, { dtype: 'q8' });
  const v = async (t) => Array.from((await e(t, { pooling: 'mean', normalize: true })).data);
  const cv = [];
  for (const c of controls) cv.push({ x: await v(c.t), l: c.l });
  const tv = [];
  for (const c of test) tv.push({ x: await v(c.t), l: c.l, fold: 0 });
  // Contiguous tenths, so clauses of one intent mostly stay together.
  tv.forEach((r, i) => { r.fold = Math.floor((i * 10) / tv.length); });
  const rows = tv.map((r) => {
    const pool = [...cv, ...tv.filter((o) => o.fold !== r.fold)];
    const votes = {};
    for (const n of pool.map((o) => ({ s: cos(r.x, o.x), l: o.l })).sort((a, b) => b.s - a.s).slice(0, 3)) votes[n.l] = (votes[n.l] ?? 0) + n.s;
    return { l: r.l, pl: Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] };
  });
  const whys = rows.filter((r) => r.l === 'why');
  const nots = rows.filter((r) => r.l !== 'why');
  const okCount = whys.filter((r) => r.pl === 'why').length + nots.filter((r) => r.pl !== 'why').length;
  console.log(JSON.stringify({ model: id, whyVsNot: +(okCount / rows.length).toFixed(3), baseline: +(whys.length / rows.length).toFixed(3), whyKept: +(whys.filter((r) => r.pl === 'why').length / whys.length).toFixed(3), notWhyRemoved: +(nots.filter((r) => r.pl !== 'why').length / nots.length).toFixed(3) }));
}
