/**
 * OKLCH color manipulation functions
 */

import type { OKLCH } from '@rafters/shared';
import { normalizeHue } from './internal/math.js';

/**
 * Adjust the hue of a color by degrees
 */
export function adjustHue(color: OKLCH, degrees: number): OKLCH {
  return {
    ...color,
    h: normalizeHue(color.h + degrees),
  };
}
