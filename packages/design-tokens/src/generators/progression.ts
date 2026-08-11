/**
 * Progression construction, shared by every namespace that has a scale.
 *
 * Spacing and shadow build their scales the same way and differ only in where
 * they start and where they stop. Keeping two copies of the loop meant the
 * rulings below lived in two places, and a fix to one would silently not reach
 * the other.
 */

/**
 * A ratio at or below 1 never advances, so a loop stepping by it would run
 * until the ceiling is unreachable rather than reached. This is a termination
 * guard, not a design value -- there is no scale on the other side of it to
 * choose.
 */
const NON_ADVANCING = 1;

/**
 * Step up from `floor` by `ratioVal`, rounding each position, and stop at
 * `ceiling`.
 *
 * Three rules are baked in here rather than at the call sites, because they are
 * operator rulings that apply to every scale in the system:
 *
 * 1. POSITION 0 IS THE FLOOR, and nothing sits below it. A step below the floor
 *    is a value smaller than the unit the scale is built from.
 * 2. VALUES ROUND. A raster has no fractional pixel, and a fractional
 *    multiplier would put a `.25` in a token name.
 * 3. COLLIDING POSITIONS ARE DROPPED, not shipped twice. A tight ratio on a low
 *    floor rounds several early positions onto the same value; the scale offers
 *    each value once, so it yields fewer rungs than positions. That loss is
 *    real and shows up in the token count.
 *
 * A degenerate ratio returns the floor alone rather than looping.
 */
export function progressionFrom(floor: number, ratioVal: number, ceiling: number): number[] {
  if (!(ratioVal > NON_ADVANCING) || !(floor > 0) || !(ceiling >= floor)) return [floor];

  const out: number[] = [];
  const seen = new Set<number>();
  for (let n = 0; ; n++) {
    const value = Math.round(floor * ratioVal ** n);
    if (value > ceiling) break;
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * The rung nearest a target. Used where a definition states a relative weight
 * and the generator has to place that weight on the scale.
 */
export function nearestRung(target: number, scale: readonly number[]): number {
  let best = scale[0] ?? target;
  for (const v of scale) {
    if (Math.abs(v - target) < Math.abs(best - target)) best = v;
  }
  return best;
}
