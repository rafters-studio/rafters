// Usage: node run.mjs <file of intents> [--model <id>]... Prints one JSON report per model.
// Models and their cache stay in ./models, which git ignores.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';

env.cacheDir = join(import.meta.dirname, 'models');
const args = process.argv.slice(2);
const intents = JSON.parse(readFileSync(args[0], 'utf8'));
const asked = args.flatMap((a, i) => (a === '--model' ? [args[i + 1]] : []));

const EMBED = ['Xenova/all-MiniLM-L6-v2', 'Xenova/bge-small-en-v1.5', 'Xenova/all-mpnet-base-v2'];
const NLI = ['Xenova/mobilebert-uncased-mnli', 'Xenova/nli-deberta-v3-small'];
const models = asked.length ? asked : [...EMBED, ...NLI];

const clauses = intents.flatMap((n) => n.clauses.map((c) => ({ ...c, id: n.id, kind: n.kind })));

// Zero-shot descriptions. Fixed before the first run, never tuned against the scores.
const WHY_LABELS = {
  why: 'the purpose of a design: what it must accomplish for people and why it is needed',
  what: 'a specific visual choice such as a colour, typeface, size, layout or animation',
  how: 'a technical method or process for building something',
};
const PART_LABELS = {
  colour: 'colours',
  type: 'typography and text size',
  spacing: 'layout and spacing',
  motion: 'animation and movement',
  radius: 'rounded or sharp corners',
  shadow: 'shadows',
  depth: 'layers and stacking',
  none: 'none of these visual properties',
};

const dirSize = (p) => {
  let t = 0;
  for (const e of readdirSync(p, { withFileTypes: true })) {
    const f = join(p, e.name);
    t += e.isDirectory() ? dirSize(f) : statSync(f).size;
  }
  return t;
};
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0); // vectors are normalized
const argmaxBy = (xs, f) => xs.reduce((best, x) => (f(x) > f(best) ? x : best));

async function scoreClauses(id) {
  const t0 = performance.now();
  if (EMBED.includes(id)) {
    const embed = await pipeline('feature-extraction', id, { dtype: 'q8' });
    const load = performance.now() - t0;
    const t1 = performance.now();
    const vec = [];
    for (const c of clauses)
      vec.push(Array.from((await embed(c.t, { pooling: 'mean', normalize: true })).data));
    const perClause = (performance.now() - t1) / clauses.length;
    // Compare with the other 19 intents only: the three nearest labelled clauses vote.
    const near = (i, pool, key) => {
      const ranked = pool
        .filter((j) => clauses[j].id !== clauses[i].id)
        .map((j) => ({ j, s: cos(vec[i], vec[j]) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 3);
      const votes = {};
      for (const r of ranked) votes[clauses[r.j][key]] = (votes[clauses[r.j][key]] ?? 0) + r.s;
      return argmaxBy(Object.keys(votes), (k) => votes[k]);
    };
    const all = clauses.map((_, i) => i);
    const notWhy = all.filter((i) => clauses[i].l !== 'why');
    return {
      method: 'examples',
      load,
      perClause,
      preds: clauses.map((_, i) => ({ l: near(i, all, 'l'), p: near(i, notWhy, 'p') })),
    };
  }
  const nli = await pipeline('zero-shot-classification', id, { dtype: 'q8' });
  const load = performance.now() - t0;
  const t1 = performance.now();
  const preds = [];
  const label = async (t, map) => {
    const inv = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
    const r = await nli(t, Object.values(map), { hypothesis_template: 'This text is about {}.' });
    return inv[r.labels[0]];
  };
  for (const c of clauses)
    preds.push({ l: await label(c.t, WHY_LABELS), p: await label(c.t, PART_LABELS) });
  return { method: 'zero-shot', load, perClause: (performance.now() - t1) / clauses.length, preds };
}

const acc = (rows, f) => (rows.length ? +(rows.filter(f).length / rows.length).toFixed(3) : null);

for (const id of models) {
  const { method, load, perClause, preds } = await scoreClauses(id);
  const rows = clauses.map((c, i) => ({ ...c, pl: preds[i].l, pp: preds[i].p }));
  const isWhy = (r) => (r.pl === 'why') === (r.l === 'why');
  const firm = rows.filter((r) => !r.feel);
  const whys = rows.filter((r) => r.l === 'why');
  const nots = rows.filter((r) => r.l !== 'why');
  const perIntent = intents.map((n) => {
    const rs = rows.filter((r) => r.id === n.id);
    return {
      id: n.id,
      kind: n.kind,
      right: rs.filter(isWhy).length,
      of: rs.length,
      returned: rs.filter((r) => r.pl === 'why').map((r) => r.t),
    };
  });
  console.log(
    JSON.stringify({
      model: id,
      method,
      clauses: rows.length,
      whyVsNot: acc(rows, isWhy),
      whyVsNotWithoutFeel: acc(firm, isWhy),
      whyKept: acc(whys, (r) => r.pl === 'why'), // a why that stays in the intent
      notWhyRemoved: acc(nots, (r) => r.pl !== 'why'), // a what or how that stays out
      threeWay: acc(rows, (r) => r.pl === r.l),
      whatVsHow: acc(nots, (r) => r.pl === r.l),
      parts: acc(nots, (r) => r.pp === r.p),
      partsWithoutNone: acc(
        nots.filter((r) => r.p !== 'none'),
        (r) => r.pp === r.p,
      ),
      feelCalledWhy: rows.filter((r) => r.feel && r.pl === 'why').length,
      intentsAllRight: perIntent.filter((n) => n.right === n.of).length,
      whyOnlyAllReturned: perIntent
        .filter((n) => n.kind === 'why-only' && n.right === n.of)
        .map((n) => n.id),
      noWhyReturnedNothing: perIntent
        .filter((n) => n.kind === 'none' && n.returned.length === 0)
        .map((n) => n.id),
      costs: {
        loadMs: Math.round(load),
        perClauseMs: +perClause.toFixed(1),
        rssMB: Math.round(process.memoryUsage().rss / 1e6),
        diskMB: +(dirSize(join(env.cacheDir, ...id.split('/'))) / 1e6).toFixed(1),
      },
      wrongWhy: rows.filter((r) => !isWhy(r)).map((r) => `${r.id} [${r.l}->${r.pl}] ${r.t}`),
      wrongParts: nots.filter((r) => r.pp !== r.p).map((r) => `${r.id} [${r.p}->${r.pp}] ${r.t}`),
    }),
  );
}
