/**
 * Radius base detection.
 *
 * Reads the source CSS for `--radius` (shadcn canonical, singular) or
 * `--radius-base` (rafters internal naming), normalizes to pixels, and
 * returns the value. Returns null when no base is declared. Mirrors
 * `detectSpacingBase` -- same conservative read, same units, same
 * last-declaration-wins semantics. Detection has to happen pre-
 * generation so the value flows through `generateBaseSystem` into
 * `BaseSystemConfig.baseRadiusOverride`; post-generation
 * `registry.set('radius-base', ...)` would only cascade through the
 * scale via CSS `calc()`, leaving per-corner and other radius derivations
 * baked at the rafters default. See legion reflection 019e57d8 for the
 * full cascade invariant.
 *
 * Per-position `--radius-N` (sm/md/lg/xl) overrides are NOT touched --
 * Tailwind v4 sources commonly emit per-position values without a base,
 * which is ambiguous between conventions and would silently shift the
 * scale if auto-derived.
 */

import { extractShadcnRoot } from './shadcn.js';
import { extractThemeBlocks } from './theme.js';

const LENGTH = /^(-?\d+(?:\.\d+)?)\s*(rem|px|em)$/;

/**
 * Read the radius base declaration (`--radius` or `--radius-base`) from
 * `:root` + `@theme` and return its pixel value, or `null` if no
 * supported declaration is present.
 *
 * Supported units: `rem` and `em` (multiplied by 16, treating em as
 * rem-equivalent at the document root), `px` (as-is).
 */
export function detectRadiusBase(css: string): number | null {
  const rootDecls = extractShadcnRoot(css);
  const themeDecls = extractThemeBlocks(css);
  let last: string | null = null;
  for (const decl of [...rootDecls, ...themeDecls]) {
    if (decl.name === 'radius' || decl.name === 'radius-base') last = decl.value.trim();
  }
  if (last === null) return null;
  const match = last.match(LENGTH);
  if (match === null) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value)) return null;
  if (unit === 'px') return value;
  return value * 16;
}
