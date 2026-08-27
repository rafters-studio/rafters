/**
 * Mathematical Ratios
 *
 * A ratio is two positive numbers, `a` and `b`, with a `name` label.
 * `ratioValue(r) = r.a / r.b`. The library ships a default registry of
 * commonly-used named ratios (musical intervals, mathematical constants);
 * callers may supply their own. Built-in and user-defined ratios are
 * structurally identical and treated identically by every operation in
 * this package.
 */

import { z } from 'zod';

export const RatioSchema = z.object({
  name: z.string(),
  a: z.number().positive(),
  b: z.number().positive(),
});
export type Ratio = z.infer<typeof RatioSchema>;

/** Compute the numeric value of a ratio: a / b. */
export const ratioValue = (r: Ratio): number => r.a / r.b;

/** Look up a ratio by name in a registry. Returns undefined if not found. */
const findRatio = (registry: readonly Ratio[], name: string): Ratio | undefined =>
  registry.find((r) => r.name === name);

/**
 * Look up a ratio by name. Throws if not found. Defaults to DEFAULT_RATIOS;
 * pass a registry to look up in a different set.
 */
export function resolveRatio(name: string, registry: readonly Ratio[] = DEFAULT_RATIOS): Ratio {
  const r = findRatio(registry, name);
  if (!r) throw new Error(`Unknown ratio: ${name}`);
  return r;
}

/**
 * Default ratio registry. Starter data, not authoritative -- pass your own
 * `Ratio[]` into operations that accept a registry to override or extend.
 */
export const DEFAULT_RATIOS: Ratio[] = [
  // Musical intervals
  { name: 'minor-second', a: 16, b: 15 },
  { name: 'major-second', a: 9, b: 8 },
  { name: 'minor-third', a: 6, b: 5 },
  { name: 'major-third', a: 5, b: 4 },
  { name: 'perfect-fourth', a: 4, b: 3 },
  { name: 'augmented-fourth', a: Math.SQRT2, b: 1 },
  { name: 'perfect-fifth', a: 3, b: 2 },
  // Mathematical constants
  { name: 'golden', a: 1.618033988749, b: 1 },
  { name: 'golden-ratio', a: 1.618033988749, b: 1 },
  { name: 'sqrt2', a: Math.SQRT2, b: 1 },
  { name: 'sqrt3', a: Math.sqrt(3), b: 1 },
  { name: 'sqrt5', a: Math.sqrt(5), b: 1 },
  { name: 'e', a: Math.E, b: 1 },
  { name: 'pi', a: Math.PI, b: 1 },
  { name: 'silver', a: 1 + Math.SQRT2, b: 1 },
];
