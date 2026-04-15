/**
 * Scale position constants for design token systems.
 *
 * The standard 11-position scale maps indices 0-10 to
 * Tailwind-style positions: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.
 *
 * These constants are domain-agnostic and used by both @rafters/design-tokens
 * (registry orchestration) and @rafters/color-utils (color plugins).
 */

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
  if (SCALE_POSITION_MAP_REVERSE[idx] !== undefined) {
    throw new Error(
      `Duplicate index ${idx} in SCALE_POSITION_MAP: "${SCALE_POSITION_MAP_REVERSE[idx]}" and "${pos}"`,
    );
  }
  SCALE_POSITION_MAP_REVERSE[idx] = pos;
}

export const VALID_SCALE_POSITIONS = Object.keys(SCALE_POSITION_MAP).map(Number);
