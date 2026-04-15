/**
 * Pure ColorReference -> CSS oklch() resolver. No registry access;
 * caller passes a token lookup function.
 */

import {
  type ColorReference,
  type ColorValue,
  type OKLCH,
  SCALE_POSITION_MAP,
} from '@rafters/shared';

/**
 * Convert an OKLCH color to CSS string format.
 */
export function oklchToCSS(oklch: OKLCH): string {
  const l = oklch.l.toFixed(3);
  const c = oklch.c.toFixed(3);
  const h = Math.round(oklch.h);
  const alpha = oklch.alpha ?? 1;

  if (alpha < 1) {
    return `oklch(${l} ${c} ${h} / ${alpha.toFixed(2)})`;
  }
  return `oklch(${l} ${c} ${h})`;
}

/**
 * Resolve a ColorReference { family, position } to a CSS string.
 *
 * Looks up the family token in the provided token map, reads its scale,
 * and converts the OKLCH at the given position to CSS.
 *
 * @throws if the family token is missing, has no scale, or the position is invalid.
 */
export function resolveColorReference(
  reference: ColorReference,
  getToken: (name: string) => { value: unknown } | undefined,
): string {
  const familyToken = getToken(reference.family);
  if (!familyToken) {
    throw new Error(`Family token not found: ${reference.family}`);
  }

  const colorValue = familyToken.value as ColorValue;
  if (!colorValue || !Array.isArray(colorValue.scale)) {
    throw new Error(`Token ${reference.family} is not a ColorValue with a scale array`);
  }

  const positionNum =
    typeof reference.position === 'string' ? parseInt(reference.position, 10) : reference.position;

  const index = SCALE_POSITION_MAP[positionNum];
  if (index === undefined) {
    throw new Error(`Invalid scale position: ${reference.position}`);
  }

  if (index < 0 || index >= colorValue.scale.length) {
    throw new Error(
      `Scale position ${reference.position} out of bounds (0-${colorValue.scale.length - 1})`,
    );
  }

  const oklch = colorValue.scale[index];
  if (!oklch) {
    throw new Error(`No color value at scale position ${reference.position}`);
  }

  return oklchToCSS(oklch);
}
