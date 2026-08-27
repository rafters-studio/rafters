/**
 * Progression Sequences
 *
 * `generateModularScale` builds a typography-style scale from a `Ratio`
 * instance: `steps` sizes smaller than `base` and `steps` sizes larger.
 * No named-string lookups -- pass the `Ratio` you want; built-in and
 * user-defined are treated identically.
 */

import { type Ratio, ratioValue } from './ratios.js';

/**
 * Generate a modular scale (typography-style) from a ratio: returns
 * `steps` sizes smaller than `base` and `steps` sizes larger.
 */
export function generateModularScale(
  r: Ratio,
  base: number,
  steps: number = 5,
): { smaller: number[]; base: number; larger: number[] } {
  const ratio = ratioValue(r);
  const smaller: number[] = [];
  const larger: number[] = [];
  for (let i = 1; i <= steps; i++) {
    smaller.unshift(base / ratio ** i);
    larger.push(base * ratio ** i);
  }
  return { smaller, base, larger };
}
