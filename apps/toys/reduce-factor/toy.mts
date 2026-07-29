/**
 * TOY 3 -- can ONE rule plus a global decimal reproduce all thirteen
 * reduced-motion blocks?
 *
 * The rule under test, read off the emitted sheet:
 *   properties -> keep the non-spatial ones, drop the spatial ones
 *   duration   -> tier x reduceFactor
 *
 * This is a FALSIFIABLE check against real emitted output, not a demo. It reads
 * apps/demo/.rafters/output/rafters.css, regenerates each block from the rule,
 * and diffs. Where the rule cannot reproduce the shipped value, that is the
 * finding -- it means the shipped value was typed rather than derived.
 */

import { readFileSync } from 'node:fs';

const SHEET = 'apps/demo/.rafters/output/rafters.css';

/** A property is spatial if it moves something through space. */
const SPATIAL = new Set(['transform', 'grid-template-rows', 'width', 'height', 'translate']);
const isSpatial = (p: string) => SPATIAL.has(p.trim());

interface Block {
  name: string;
  baseProps: string[];
  baseTier: string | null;
  rmProps: string[] | null;
  rmMs: number | null;
}

function parse(): Block[] {
  const css = readFileSync(SHEET, 'utf8');
  const out: Block[] = [];
  const re = /@utility (motion-[a-z-]+) \{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const [, name = '', body = ''] = m;
    const baseProps = (body.match(/transition-property:\s*([^;]+);/)?.[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const baseTier = body.match(/transition-duration:\s*var\(--duration-([a-z]+)\)/)?.[1] ?? null;
    const rm = body.match(/prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\s{2}\}/)?.[1];
    if (!rm) {
      out.push({ name, baseProps, baseTier, rmProps: null, rmMs: null });
      continue;
    }
    const rmProps = rm.match(/transition-property:\s*([^;]+);/)?.[1];
    const rmMs = rm.match(/transition-duration:\s*(\d+)ms/)?.[1];
    out.push({
      name,
      baseProps,
      baseTier,
      rmProps: rmProps ? rmProps.split(',').map((s) => s.trim()) : null,
      rmMs: rmMs ? Number(rmMs) : null,
    });
  }
  return out;
}

/** Shipped tier values, read from the sheet rather than assumed. */
function tiers(): Record<string, number> {
  const css = readFileSync(SHEET, 'utf8');
  const out: Record<string, number> = {};
  for (const m of css.matchAll(/--duration-([a-z]+):\s*(\d+)ms;/g)) {
    const [, tier = '', ms = '0'] = m;
    out[tier] = Number(ms);
  }
  return out;
}

const blocks = parse();
const TIER = tiers();
console.log('shipped tiers:', JSON.stringify(TIER), '\n');

// ---------------------------------------------------- PART 1: the property rule

console.log('PART 1 -- rule: under reduce, keep non-spatial properties, drop spatial');
console.log('utility'.padEnd(22) + 'rule predicts'.padEnd(30) + 'ships' + '\n' + '-'.repeat(78));
let pOk = 0;
let pFail = 0;
for (const b of blocks) {
  const predicted = b.baseProps.filter((p) => !isSpatial(p));
  const shipped = b.rmProps;
  // No block shipped is correct iff nothing spatial was there to drop.
  if (!shipped) {
    const shouldHave = b.baseProps.some(isSpatial);
    const ok = !shouldHave;
    console.log(
      `  ${ok ? ' ' : 'X'} ${b.name.padEnd(20)}${(shouldHave ? predicted.join(', ') : '(no block)').padEnd(30)}(no block)`,
    );
    ok ? pOk++ : pFail++;
    continue;
  }
  const ok = predicted.join(', ') === shipped.join(', ');
  console.log(
    `  ${ok ? ' ' : 'X'} ${b.name.padEnd(20)}${predicted.join(', ').padEnd(30)}${shipped.join(', ')}`,
  );
  ok ? pOk++ : pFail++;
}
console.log(`\n  property rule: ${pOk} reproduced, ${pFail} not`);

// ---------------------------------------------------- PART 2: one global factor

const withMs = blocks.filter((b) => b.rmMs !== null && b.baseTier && TIER[b.baseTier]);
console.log('\n\nPART 2 -- rule: reduced duration = tier x ONE global factor');
console.log('utility'.padEnd(22) + 'base'.padEnd(14) + 'ships'.padEnd(10) + 'implied factor');
console.log('-'.repeat(78));
const factors: number[] = [];
for (const b of withMs) {
  const base = TIER[b.baseTier as string] as number;
  const f = (b.rmMs as number) / base;
  factors.push(f);
  console.log(
    `  ${b.name.padEnd(20)}${`${b.baseTier} ${base}ms`.padEnd(14)}${`${b.rmMs}ms`.padEnd(10)}${f.toFixed(3)}`,
  );
}
const min = Math.min(...factors);
const max = Math.max(...factors);
console.log(
  `\n  implied factors span ${min.toFixed(3)} .. ${max.toFixed(3)}  (${((max / min - 1) * 100).toFixed(0)}% spread)`,
);
console.log(
  min === max
    ? '  -> ONE factor reproduces every shipped value. The rule holds.'
    : '  -> NO single factor reproduces them. The shipped values are not a scale.',
);

// Best single factor, and what it would cost.
const best = factors.reduce((a, b) => a + b, 0) / factors.length;
console.log(`\n  best-fit single factor: ${best.toFixed(3)}`);
console.log('  what that factor would emit vs what ships:');
for (const b of withMs) {
  const base = TIER[b.baseTier as string] as number;
  const would = Math.round(base * best);
  const delta = would - (b.rmMs as number);
  console.log(
    `    ${b.name.padEnd(20)}${String(would).padStart(4)}ms  vs ${String(b.rmMs).padStart(4)}ms   ${delta >= 0 ? '+' : ''}${delta}ms`,
  );
}
