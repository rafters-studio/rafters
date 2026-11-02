// Train on every controls.json clause, test on another labelled file. Usage: node style.mjs <file>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
env.cacheDir = join(import.meta.dirname, 'models');
const train = JSON.parse(readFileSync('controls.json', 'utf8')).flatMap((n) => n.clauses);
const test = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
for (const id of ['Xenova/all-MiniLM-L6-v2', 'Xenova/bge-small-en-v1.5', 'Xenova/all-mpnet-base-v2']) {
  const e = await pipeline('feature-extraction', id, { dtype: 'q8' });
  const v = async (t) => Array.from((await e(t, { pooling: 'mean', normalize: true })).data);
  const tv = [];
  for (const c of train) tv.push(await v(c.t));
  const rows = [];
  for (const c of test) {
    const q = await v(c.t);
    const votes = {};
    for (const r of tv.map((x, i) => ({ s: cos(q, x), l: train[i].l })).sort((a, b) => b.s - a.s).slice(0, 3)) votes[r.l] = (votes[r.l] ?? 0) + r.s;
    rows.push({ ...c, pl: Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] });
  }
  const ok = (r) => (r.pl === 'why') === (r.l === 'why');
  const whys = rows.filter((r) => r.l === 'why');
  const nots = rows.filter((r) => r.l !== 'why');
  console.log(JSON.stringify({ model: id, whyVsNot: +(rows.filter(ok).length / rows.length).toFixed(3), whyKept: +(whys.filter((r) => r.pl === 'why').length / whys.length).toFixed(3), notWhyRemoved: +(nots.filter((r) => r.pl !== 'why').length / nots.length).toFixed(3), allWhyBaseline: +(whys.length / rows.length).toFixed(3), withoutFeel: +(rows.filter((r) => !r.feel).filter(ok).length / rows.filter((r) => !r.feel).length).toFixed(3), wrong: rows.filter((r) => !ok(r)).map((r) => `[${r.l}->${r.pl}] ${r.t}`) }));
}
