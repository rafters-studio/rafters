/**
 * Spacing base detection.
 *
 * Reads the source CSS for an explicit `--spacing-base` declaration in
 * `:root` or `@theme`, normalizes it to pixels (the unit
 * `BaseSystemConfig.baseSpacingUnit` is stored in), and returns the
 * value. Returns null when the source declares no `--spacing-base`.
 *
 * Intentionally conservative: this does NOT infer the base from
 * per-position `--spacing-N` values. A designer who declares only
 * `--spacing-4` without `--spacing-base` could be on the rafters
 * Tailwind multiplier (where spacing-4 = base * 4) or on a different
 * scale convention entirely (2x progression, geometric, custom). Auto-
 * derivation would silently pick one interpretation and propagate it
 * through five namespaces. The conservative read is to leave the
 * rafters default in place and let the designer set the base
 * explicitly later.
 *
 * The caller passes the returned value to `generateBaseSystem` BEFORE
 * the registry is constructed -- the cascade then flows correctly
 * through spacing, shadow, radius default, typography default, focus
 * default, and motion default. Reseating the base after generation via
 * `registry.set('spacing-base', ...)` would only cascade through the
 * spacing tokens (via CSS `calc()`); the shadow / typography / radius /
 * focus / motion namespaces bake their values from `baseSpacingUnit`
 * numerically at generation time and would NOT recalculate. See legion
 * reflection 019e57d8 for the full invariant.
 */

import { extractShadcnRoot } from './shadcn.js';
import { extractThemeBlocks } from './theme.js';

/**
 * Match a length value with a unit suffix. Captures the number and the
 * unit. `tryParseUnit` from `@rafters/math-utils` could parse this too,
 * but pulling in math-utils for a single length read inflates the
 * import for the detection layer; the regex here is sufficient.
 */
const LENGTH = /^(-?\d+(?:\.\d+)?)\s*(rem|px|em)$/;

/**
 * Read the `--spacing-base` declaration from the source CSS and return
 * its pixel value, or `null` if no `--spacing-base` is declared (or its
 * value is not a length in a supported unit).
 *
 * Supported units: `rem` (multiplied by 16), `px`, `em` (multiplied by
 * 16; treats em as rem-equivalent at the document root, which is the
 * only context `--spacing-base` is meaningful in).
 *
 * Scans `:root` first, then `@theme` blocks. Last declaration wins on
 * collision (later declarations override earlier ones in CSS cascade).
 */
export function detectSpacingBase(css: string): number | null {
  const rootDecls = extractShadcnRoot(css);
  const themeDecls = extractThemeBlocks(css);
  let last: string | null = null;
  for (const decl of [...rootDecls, ...themeDecls]) {
    if (decl.name === 'spacing-base') last = decl.value.trim();
  }
  if (last === null) return null;
  const match = last.match(LENGTH);
  if (match === null) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value)) return null;
  if (unit === 'px') return value;
  // `rem` and `em` both treat 1 unit as 16px in the document-root context
  // where `--spacing-base` lives.
  return value * 16;
}
