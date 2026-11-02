// Scores a cold split against huttspawn-labelled.json. Usage: node score-cold.mjs <split.json>
import { readFileSync } from 'node:fs';
const split = new Map(JSON.parse(readFileSync(process.argv[2], 'utf8')).map((s) => [s.id, s.clauses]));
const gold = JSON.parse(readFileSync('huttspawn-labelled.json', 'utf8'));
const src = JSON.parse(readFileSync('huttspawn-intents.json', 'utf8'));
const words = (s) => new Set(s.toLowerCase().match(/[a-z0-9'-]+/g) ?? []);
const overlap = (a, b) => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(1, A.size); };
const rows = gold.map((g) => {
  let best = null, score = -1;
  for (const c of split.get(g.id) ?? []) { const o = overlap(g.t, c.t); if (o > score) { score = o; best = c; } }
  return { ...g, pl: best?.l, score };
});
const show = (name, rs) => {
  const w = rs.filter((r) => r.l === 'why'), n = rs.filter((r) => r.l !== 'why');
  const kept = w.filter((r) => r.pl === 'why').length, removed = n.filter((r) => r.pl !== 'why').length;
  console.log(JSON.stringify({ name, n: rs.length, baseline: +(Math.max(w.length, n.length) / rs.length).toFixed(3), whyVsNot: +((kept + removed) / rs.length).toFixed(3), kept: `${kept}/${w.length}`, removed: `${removed}/${n.length}`, weak: rs.filter((r) => r.score < 0.6).length }));
};
show('d clauses as why', rows);
show('without d clauses', rows.filter((r) => !r.d));
show('d clauses as not-why', rows.map((r) => (r.d ? { ...r, l: 'how' } : r)));
const d = rows.filter((r) => r.d);
console.log('d clauses model called why:', d.filter((r) => r.pl === 'why').length, 'of', d.length);
for (const r of rows.filter((x) => !x.d && (x.l === 'why') !== (x.pl === 'why'))) console.log(`  [${r.l}->${r.pl}] ${r.id} ${r.t.slice(0, 92)}`);
let v = 0, t = 0; const norm = (s) => s.replace(/\s+/g, ' ').trim();
for (const [id, cs] of split) for (const c of cs) { t++; if (norm(src[+id.slice(1) - 1].text).includes(norm(c.t))) v++; }
console.log(`verbatim ${v}/${t}`);
