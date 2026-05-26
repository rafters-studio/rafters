/**
 * Base-value detection across cascade-anchor namespaces.
 *
 * Each detector reads ONE base value from the source CSS (`:root` and
 * `@theme` declarations) and returns it in the canonical unit that
 * `BaseSystemConfig` stores. The caller (init) passes the result to
 * `generateBaseSystem` BEFORE the registry is constructed -- the cascade
 * then flows through every derived namespace correctly. Reseating these
 * bases POST-generation via `registry.set` only cascades through tokens
 * that use CSS `calc()` (spacing, radius scale); other namespaces bake
 * numerically at generation time and would not update. See legion
 * reflection 019e57d8 for the full invariant.
 *
 * Every detector accepts two source names:
 *   1. The Tailwind v4 / shadcn-canonical name (singular, no `-base`)
 *   2. The rafters internal name (with `-base` suffix)
 *
 * Last declaration wins on collision (CSS cascade semantics).
 *
 * Conservative read: per-position overrides (`--spacing-N`, `--radius-N`,
 * `--text-N`, `--duration-N`) are NOT read here. Landing them as literal
 * values via `registry.set` would kill the `calc()` cascade at that
 * position; auto-deriving the base from them is ambiguous between
 * conventions. Per-position prompts are a separate, deferred concern.
 */

import { extractShadcnRoot } from './shadcn.js';
import type { CssDeclaration } from './shapes.js';
import { extractThemeBlocks } from './theme.js';

const LENGTH = /^(-?\d+(?:\.\d+)?)\s*(rem|px|em)$/;

/**
 * Pull the last declaration whose name is in `names` from the combined
 * `:root` + `@theme` stream, then run it through `parse`. Returns the
 * parsed numeric value, or `null` when no declaration matches or the
 * parse fails.
 */
function detectBase(
  css: string,
  names: readonly string[],
  parse: (raw: string) => number | null,
): number | null {
  const decls: readonly CssDeclaration[] = [...extractShadcnRoot(css), ...extractThemeBlocks(css)];
  let last: string | null = null;
  for (const decl of decls) {
    if (names.includes(decl.name)) last = decl.value.trim();
  }
  return last === null ? null : parse(last);
}

/**
 * Parse a length value to pixels. `rem` and `em` are multiplied by 16
 * (treats em as rem-equivalent at the document root, the only context
 * these base declarations are meaningful in). `px` is returned as-is.
 */
function parseLength(raw: string): number | null {
  const match = raw.match(LENGTH);
  if (match === null) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] === 'px' ? value : value * 16;
}

/** Spacing base in pixels. `--spacing` (v4) or `--spacing-base` (rafters). */
export const detectSpacingBase = (css: string): number | null =>
  detectBase(css, ['spacing', 'spacing-base'], parseLength);

/** Radius base in pixels. `--radius` (shadcn) or `--radius-base` (rafters). */
export const detectRadiusBase = (css: string): number | null =>
  detectBase(css, ['radius', 'radius-base'], parseLength);

/** Font-size base in pixels. `--text-base` (Tailwind v4) or `--font-size-base` (rafters). */
export const detectFontSizeBase = (css: string): number | null =>
  detectBase(css, ['text-base', 'font-size-base'], parseLength);

/** Focus ring width in pixels. `--ring-width` (common shadcn naming) or `--focus-ring-width` (rafters). */
export const detectFocusRingWidth = (css: string): number | null =>
  detectBase(css, ['ring-width', 'focus-ring-width'], parseLength);

// NOTE: motion duration is intentionally NOT detected from source. Rafters'
// motion system is research-backed (perceptual response curves, cognitive
// thresholds, reduced-motion accommodations). Most projects pick duration
// values without that research and a stray `--duration-base: 5000ms` in
// source would silently overwrite the curated rafters defaults. If a
// designer explicitly wants to reseat motion timing, they can
// `rafters set motion-duration-base ...` after init -- the override fires
// with a recorded reason and stays auditable.
