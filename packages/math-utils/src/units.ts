/**
 * Unit-Aware Mathematical Operations
 *
 * A `Unit` is a name + dimensional kind (+ optional `toBase` scale relative to
 * the kind's base unit). Operations take `Unit` instances and `{ value, unit }`
 * tuples; the library ships a default registry of common CSS units. Built-in
 * and user-defined units are structurally identical.
 */

import { z } from 'zod';

export const UnitSchema = z.object({
  name: z.string(),
  kind: z.enum(['length', 'angle', 'time', 'percentage', 'viewport-relative']),
  toBase: z.number().positive().optional(),
});
export type Unit = z.infer<typeof UnitSchema>;

export interface UnitValue {
  value: number;
  unit: Unit;
}

/**
 * Default unit registry. Starter data, not authoritative -- pass your own
 * `Unit[]` registry into `tryParseUnit` to override or extend.
 *
 * Length units carry `toBase` relative to px (the base of the length kind).
 * Other kinds don't have a meaningful single-base scale (% needs parent
 * context, viewport-relative needs viewport dimensions).
 */
export const DEFAULT_UNITS: Unit[] = [
  { name: 'px', kind: 'length', toBase: 1 },
  { name: 'rem', kind: 'length', toBase: 16 },
  { name: 'em', kind: 'length', toBase: 16 },
  { name: 'cm', kind: 'length', toBase: 37.7952755906 },
  { name: 'mm', kind: 'length', toBase: 3.77952755906 },
  { name: 'in', kind: 'length', toBase: 96 },
  { name: 'pt', kind: 'length', toBase: 1.3333333333 },
  { name: 'pc', kind: 'length', toBase: 16 },
  { name: 'ch', kind: 'length', toBase: 8 },
  { name: 'ex', kind: 'length', toBase: 8 },
  { name: '%', kind: 'percentage' },
  { name: 'vw', kind: 'viewport-relative' },
  { name: 'vh', kind: 'viewport-relative' },
  { name: 'vmin', kind: 'viewport-relative' },
  { name: 'vmax', kind: 'viewport-relative' },
];

/** A pseudo-unit representing a unitless number, returned by `parseUnitString` for a bare, suffix-less number. */
const UNITLESS: Unit = { name: '', kind: 'length' };

/** Look up a unit by name in a registry. Returns undefined if not found. */
const findUnit = (registry: readonly Unit[], name: string): Unit | undefined =>
  registry.find((u) => u.name === name);

/**
 * Parse a CSS value string like "16px" or "1.5rem" into a value and `Unit`.
 * Throws if the suffix isn't found in the registry. A bare number returns
 * UNITLESS.
 */
function parseUnitString(cssValue: string, registry: readonly Unit[] = DEFAULT_UNITS): UnitValue {
  const trimmed = cssValue.trim();
  const match = trimmed.match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
  if (!match || match[1] === undefined) {
    throw new Error(`Invalid CSS value: ${cssValue}`);
  }
  const value = parseFloat(match[1]);
  const suffix = match[2] ?? '';
  if (suffix === '') {
    return { value, unit: UNITLESS };
  }
  const unit = findUnit(registry, suffix);
  if (!unit) {
    throw new Error(`Unknown unit: ${suffix}`);
  }
  return { value, unit };
}

/**
 * Predicate-form parser. Returns the parsed `UnitValue` on success and null
 * on any failure (unknown suffix, malformed input). Use this when the caller
 * needs to test "is this string a length / unit value?" without a try/catch
 * around `parseUnitString` (which throws).
 */
export function tryParseUnit(
  cssValue: string,
  registry: readonly Unit[] = DEFAULT_UNITS,
): UnitValue | null {
  try {
    return parseUnitString(cssValue, registry);
  } catch {
    return null;
  }
}
