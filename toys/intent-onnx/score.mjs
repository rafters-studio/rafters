// Scores a split result against the hand labels, matching clauses by shared words.
// Usage: node score.mjs <split.json>: a JSON array of {id, clauses:[{t,l,p}]}.
import { readFileSync } from 'node:fs';
const split = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const controls = JSON.parse(readFileSync('controls.json', 'utf8'));
const raftersGold = JSON.parse(readFileSync('rafters-labelled.json', 'utf8'));
const rafters = JSON.parse(readFileSync('rafters-intents.json', 'utf8'));
const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9'-]+/g) ?? []);
const overlap = (a, b) => {
  const A = words(a),
    B = words(b);
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.max(1, A.size);
};
const byId = new Map(split.map((s) => [s.id, s]));
const source = new Map([
  ...rafters.map((r, i) => [`R${i + 1}`, r.text]),
  ...controls.map((c) => [c.id, c.clauses.map((x) => x.t).join(' ')]),
]);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
let verbatim = 0,
  total = 0;
for (const s of split)
  for (const c of s.clauses ?? []) {
    total++;
    if (norm(source.get(s.id) ?? '').includes(norm(c.t))) verbatim++;
  }
const match = (gold, pool) => {
  // the returned clause sharing the most of this gold clause's words
  let best = null,
    score = -1;
  for (const c of pool) {
    const o = overlap(gold, c.t);
    if (o > score) {
      score = o;
      best = c;
    }
  }
  return { best, score };
};
const report = (name, rows) => {
  const whys = rows.filter((r) => r.l === 'why'),
    nots = rows.filter((r) => r.l !== 'why');
  const kept = whys.filter((r) => r.pl === 'why').length,
    removed = nots.filter((r) => r.pl !== 'why').length;
  console.log(
    JSON.stringify({
      name,
      n: rows.length,
      baseline: +(whys.length / rows.length).toFixed(3),
      whyVsNot: +((kept + removed) / rows.length).toFixed(3),
      kept: `${kept}/${whys.length}`,
      removed: `${removed}/${nots.length}`,
      weakMatches: rows.filter((r) => r.score < 0.6).length,
    }),
  );
  for (const r of rows)
    if ((r.l === 'why') !== (r.pl === 'why'))
      console.log(`  [${r.l}->${r.pl}] ${r.t.slice(0, 95)}`);
};
const rRows = [];
// rafters' gold clauses are in intent order; find each one's intent by its source text
for (const g of raftersGold) {
  const i = rafters.findIndex((r) => norm(r.text).includes(norm(g.t)));
  const { best, score } = match(g.t, byId.get(`R${i + 1}`)?.clauses ?? []);
  rRows.push({ ...g, pl: best?.l, pp: best?.p, score });
}
const cRows = controls.flatMap((c) =>
  c.clauses.map((g) => {
    const { best, score } = match(g.t, byId.get(c.id)?.clauses ?? []);
    return { ...g, pl: best?.l, pp: best?.p, score };
  }),
);
report('rafters', rRows);
report('controls', cRows);
const nots = cRows.filter((r) => r.l !== 'why');
console.log(
  JSON.stringify({
    parts: +(nots.filter((r) => r.pp === r.p).length / nots.length).toFixed(3),
    partsNamed: +(
      nots.filter((r) => r.p !== 'none' && r.pp === r.p).length /
      nots.filter((r) => r.p !== 'none').length
    ).toFixed(3),
    verbatim: `${verbatim}/${total}`,
  }),
);
