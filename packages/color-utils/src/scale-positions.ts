/**
 * Standard 11-position color scale conventions.
 *
 * SCALE_POSITIONS maps array indices 0-10 to the canonical Tailwind-style
 * position labels (50, 100, 200, ..., 950). POSITION_TO_INDEX is the inverse.
 *
 * Selection logic (foreground pairs, state ladders, dark counterparts) lives
 * in semantic.ts — this module is scale vocabulary only.
 */

export const SCALE_POSITIONS = [
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

export const POSITION_TO_INDEX: Record<string, number> = SCALE_POSITIONS.reduce(
  (acc, position, index) => {
    acc[position] = index;
    return acc;
  },
  {} as Record<string, number>,
);
