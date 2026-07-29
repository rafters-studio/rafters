/**
 * TOY 4 -- what does the cascade actually cost?
 *
 * I claimed two things from reading graph.ts and never measured either:
 *   1. Construction is O(n^2) in deep clones, because takeSnapshot() clones every
 *      node and bind() calls it once per bound token.
 *   2. collectDependents has no reverse index, so every set() rescans all nodes
 *      and re-invokes plugin.dependsOn per node.
 *
 * Studio's core interaction is rapid repeated set() (scrubbing intent), so if
 * either is bad it is bad exactly where it matters. Measured against the REAL
 * default system, not a fixture.
 */

import { performance } from 'node:perf_hooks';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../../packages/design-tokens/src/index.js';

const PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

function build() {
  const t0 = performance.now();
  const base = generateBaseSystem();
  const t1 = performance.now();
  const reg = new TokenRegistry(base.allTokens, PLUGINS);
  const t2 = performance.now();
  return { reg, gen: t1 - t0, construct: t2 - t1, count: base.allTokens.length };
}

const { reg, gen, construct, count } = build();
const all = reg.list();
const bound = all.filter((t) => t.binding).length;

console.log(`tokens: ${count}   bound: ${bound} (${((100 * bound) / count).toFixed(0)}%)`);
console.log(`generateBaseSystem: ${gen.toFixed(0)}ms`);
console.log(`new TokenRegistry:  ${construct.toFixed(0)}ms`);

// ---- 1. is construction superlinear? build at increasing token counts ----

console.log('\n--- construction scaling (subset of the real token set)');
console.log('  n      ms      ms/token');
const full = generateBaseSystem().allTokens;
for (const frac of [0.25, 0.5, 0.75, 1]) {
  const n = Math.floor(full.length * frac);
  const subset = full.slice(0, n);
  const t0 = performance.now();
  try {
    new TokenRegistry(subset, PLUGINS);
  } catch {
    console.log(`  ${String(n).padEnd(7)}(threw -- subset breaks a binding)`);
    continue;
  }
  const ms = performance.now() - t0;
  console.log(`  ${String(n).padEnd(7)}${ms.toFixed(0).padEnd(8)}${(ms / n).toFixed(3)}`);
}

// ---- 2. what does a single set() cost, and does it depend on fan-out? ----

console.log('\n--- set() cost by token');
const candidates = ['primary', 'neutral', 'background', 'radius-base', 'motion-duration-moderate'];
for (const name of candidates) {
  if (!reg.has(name)) {
    console.log(`  ${name.padEnd(26)} (absent)`);
    continue;
  }
  const current = reg.get(name);
  const t0 = performance.now();
  reg.set(name, current?.value as never, { reason: 'cascade-cost probe' });
  const ms = performance.now() - t0;
  console.log(`  ${name.padEnd(26)} ${ms.toFixed(1)}ms`);
}

// ---- 3. a scrub: many sets in a row, which is what Studio does ----

console.log('\n--- scrub simulation (rapid repeated set on one token)');
const scrubTarget = ['primary', 'neutral', 'background'].find((n) => reg.has(n));
if (scrubTarget) {
  const v = reg.get(scrubTarget)?.value;
  for (const n of [1, 10, 30]) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      reg.set(scrubTarget, v as never, { reason: `scrub ${i}` });
    }
    const ms = performance.now() - t0;
    console.log(
      `  ${String(n).padStart(3)} sets  ${ms.toFixed(0).padStart(6)}ms   ${(ms / n).toFixed(1)}ms each`,
    );
  }
  console.log(`\n  (target: ${scrubTarget}; 60fps budget is 16.7ms per frame)`);
} else {
  console.log('  no scrub target found');
}
