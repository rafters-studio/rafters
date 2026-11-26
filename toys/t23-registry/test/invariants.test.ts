// Behaviour: what must hold for every token of the real default registry, after any change.
// Each run makes the same seeded random changes, so a failure replays exactly: SEED=n to vary.
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test } from 'node:test';
import {
  calculateWCAGContrast,
  POSITION_TO_INDEX,
  SCALE_POSITIONS,
} from '../../../packages/color-utils/src/index.ts';
import type { ColorValue, OKLCH } from '../../../packages/shared/src/index.ts';
import { rules } from '../rules/index.ts';
import { Refused, type Registry } from '../src/registry.ts';
import { defaultRegistry, transaction } from './default.ts';
import { state } from './support.ts';

const SEED = Number(process.env.SEED ?? 2979);
const CHANGES = Number(process.env.CHANGES ?? 200);

/** mulberry32: a small seeded generator, so a run replays. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const keys = (r: Registry) => r.names().flatMap((n) => r.modesOf(n).map((m) => [n, m] as const));
const values = (r: Registry) => new Map(keys(r).map(([n, m]) => [`${n}@${m}`, r.get(n, m)?.value]));
const isRef = (v: unknown): v is { family: string; position: string } =>
  typeof v === 'object' && v !== null && 'family' in v && 'position' in v;
const isFamily = (v: unknown): v is ColorValue =>
  typeof v === 'object' && v !== null && 'scale' in v;

/** A change a designer could make to a token of the real registry, or undefined when none fits. */
function change(
  r: Registry,
  pick: () => number,
): { name: string; value: unknown; mode?: string } | undefined {
  const names = r.names();
  const families = names.filter((n) => isFamily(r.get(n)?.value));
  const choose = <T>(xs: readonly T[]): T => xs[Math.floor(pick() * xs.length)] as T;
  const name = choose(names);
  const modes = r.modesOf(name).filter((m) => m !== 'reduced');
  const mode = choose(modes);
  const v = r.get(name, mode)?.value;
  if (isRef(v))
    return { name, mode, value: { family: choose(families), position: choose(SCALE_POSITIONS) } };
  if (isFamily(v)) return { name, mode, value: r.get(choose(families))?.value };
  if (typeof v === 'string' && /^\d+ms$/.test(v))
    return { name, mode, value: `${Math.round(pick() * 1000)}ms` };
  return undefined;
}

/** Runs `check` after each of the seeded changes, inside one transaction. */
export const refusals: Record<string, number> = {};
function afterEachChange(
  check: (
    r: Registry,
    changed: { name: string; mode?: string },
    before: Map<string, unknown>,
  ) => void,
): number {
  const pick = random(SEED);
  let made = 0;
  transaction((r) => {
    for (let i = 0; i < CHANGES * 5 && made < CHANGES; i++) {
      const c = change(r, pick);
      if (!c) continue;
      const before = values(r);
      try {
        r.set(c.name, c.value, {
          reason: `seeded change ${made}`,
          ...(c.mode ? { mode: c.mode } : {}),
        });
      } catch (e) {
        if (!(e instanceof Refused)) throw e; // only a refusal is a legitimate outcome; anything else is a bug
        refusals[e.code] = (refusals[e.code] ?? 0) + 1;
        continue; // a refused change leaves the registry as it was; the bad-change scenario proves that
      }
      made++;
      check(r, c, before);
    }
  });
  assert.equal(
    made,
    CHANGES,
    `only ${made} of ${CHANGES} changes landed; refused: ${JSON.stringify(refusals)}`,
  );
  return made;
}

/** What the token's rule makes from what the registry holds now, as the registry would run it. */
function remake(r: Registry, name: string, mode: string): unknown {
  const rule = r.get(name, mode)?.rule;
  if (!rule) return undefined;
  const get = (n: string, m?: string) => {
    const modes = r.modesOf(n);
    return r.get(n, m ?? (modes.includes(mode) ? mode : modes[0]))?.value;
  };
  return rules.get(rule.name)?.(rule.args, { get, mode, name });
}

test('every value is what its rule makes, after every change', () => {
  const stale: string[] = [];
  const made = afterEachChange((r) => {
    for (const [n, m] of keys(r)) {
      const t = r.get(n, m);
      if (!t?.rule || t.chosen) continue;
      if (!isDeepStrictEqual(t.value, remake(r, n, m))) stale.push(`${n}@${m}`);
    }
  });
  assert.ok(made > 0, 'no change was made');
  assert.deepEqual([...new Set(stale)].slice(0, 10), []);
});

test('a change reaches only what the registry says it reaches', () => {
  const hidden: string[] = [];
  afterEachChange((r, c, before) => {
    const mode = c.mode ?? r.modesOf(c.name)[0] ?? '';
    const allowed = new Set([
      ...r.reach(c.name, mode),
      ...r.modesOf(c.name).map((m) => `${c.name}@${m}`),
    ]);
    for (const [k, v] of values(r))
      if (!isDeepStrictEqual(v, before.get(k)) && !allowed.has(k))
        hidden.push(`${c.name}@${mode} -> ${k}`);
  });
  assert.deepEqual(hidden.slice(0, 10), []);
});

test('taking the changes back leaves the registry exactly as it was', () => {
  const before = state(defaultRegistry());
  afterEachChange(() => {});
  assert.deepEqual(state(defaultRegistry()), before);
});

/** The colour a role resolves to, through its family's scale. */
function colour(
  r: Registry,
  ref: { family: string; position: string },
  mode: string,
): OKLCH | undefined {
  const at = (n: string) => r.get(n, r.modesOf(n).includes(mode) ? mode : undefined)?.value;
  const named = at(ref.family);
  const f = isRef(named) ? at(named.family) : named; // a foreground from a fallback names the fallback role
  return isFamily(f) ? f.scale[POSITION_TO_INDEX[ref.position] ?? -1] : undefined;
}

test('every foreground meets its contrast level against its role, measured, after every change', () => {
  const MIN = { AA: 4.5, AAA: 7 } as const;
  const failing = new Map<string, string>();
  const measure = (r: Registry) => {
    for (const [n, m] of keys(r)) {
      const t = r.get(n, m);
      if (t?.rule?.name !== 'contrast' || t.chosen) continue;
      const { against, level = 'AAA' } = t.rule.args as { against: string; level?: 'AA' | 'AAA' };
      const role = r.get(against, m)?.value;
      if (!isRef(role) || !isRef(t.value)) continue;
      const fg = colour(r, t.value, m);
      const bg = colour(r, role, m);
      if (!fg || !bg) continue;
      const ratio = calculateWCAGContrast(fg, bg);
      if (ratio < MIN[level])
        failing.set(
          `${n}@${m}`,
          `${ratio.toFixed(2)} < ${MIN[level]} (${level}) on ${role.family}-${role.position}`,
        );
    }
  };
  transaction(measure);
  const atDefault = [...failing.entries()];
  failing.clear();
  afterEachChange((r) => measure(r));
  assert.deepEqual(
    { atDefault: atDefault.slice(0, 10), afterChanges: [...failing.entries()].slice(0, 10) },
    { atDefault: [], afterChanges: [] },
  );
});
