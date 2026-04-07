/**
 * Shared scale position constants and WCAG pair search utilities.
 *
 * The standard 11-position color scale maps indices 0-10 to
 * Tailwind-style positions: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.
 */

import type { ColorValue } from '@rafters/shared';

export const INDEX_TO_POSITION = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

export const POSITION_TO_INDEX: Record<string, number> = {
  '50': 0,
  '100': 1,
  '200': 2,
  '300': 3,
  '400': 4,
  '500': 5,
  '600': 6,
  '700': 7,
  '800': 8,
  '900': 9,
  '950': 10,
};

/**
 * Maps Tailwind-style scale positions to array indices.
 * Keys are numeric (50, 100, ..., 950), values are indices (0-10).
 * Used by the generation rule parser which deals in numeric positions.
 */
export const SCALE_POSITION_MAP: Record<number, number> = {
  50: 0,
  100: 1,
  200: 2,
  300: 3,
  400: 4,
  500: 5,
  600: 6,
  700: 7,
  800: 8,
  900: 9,
  950: 10,
};

export const SCALE_POSITION_MAP_REVERSE: Record<number, string> = {};
for (const [pos, idx] of Object.entries(SCALE_POSITION_MAP)) {
  SCALE_POSITION_MAP_REVERSE[idx] = pos;
}

export const VALID_SCALE_POSITIONS = Object.keys(SCALE_POSITION_MAP).map(Number);

/** Minimum index distance for a WCAG pair to be considered usable. */
export const MIN_WCAG_PAIR_DISTANCE = 3;

/**
 * Find the best WCAG-safe pair partner for a given scale index.
 * Searches the pair matrix for the partner with the greatest distance
 * on the specified side of the scale.
 */
export function findBestWcagPair(
  sourceIndex: number,
  pairs: number[][],
  wantHigher: boolean,
): number | undefined {
  let best: number | undefined;
  let bestDistance = -1;

  for (const pair of pairs) {
    if (!pair || pair.length < 2) continue;
    const [a, b] = pair;
    if (a === undefined || b === undefined) continue;

    let partner: number | undefined;
    if (a === sourceIndex) partner = b;
    else if (b === sourceIndex) partner = a;
    else continue;

    if (wantHigher && partner <= sourceIndex) continue;
    if (!wantHigher && partner >= sourceIndex) continue;

    const distance = Math.abs(partner - sourceIndex);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = partner;
    }
  }

  return best;
}

/**
 * Find the WCAG-safe dark mode counterpart for a light mode scale index.
 * AAA first, falls back to AA if the AAA match is too close, then mathematical inversion.
 */
export function findDarkCounterpartIndex(lightIndex: number, colorValue: ColorValue): number {
  const aaaPairs = colorValue.accessibility?.wcagAAA?.normal ?? [];
  const aaPairs = colorValue.accessibility?.wcagAA?.normal ?? [];
  const wantHigher = lightIndex <= 5;

  for (const pairs of [aaaPairs, aaPairs]) {
    const match = findBestWcagPair(lightIndex, pairs, wantHigher);
    if (match !== undefined && Math.abs(match - lightIndex) >= MIN_WCAG_PAIR_DISTANCE) {
      return match;
    }
  }

  return Math.max(0, Math.min(10, 10 - lightIndex));
}
