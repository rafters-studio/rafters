/**
 * Group declarations into families when they form a ramp.
 *
 * A ramp is a set of declarations sharing a `<name>` prefix with positions
 * drawn from the canonical scale (50, 100, 200, ..., 900, 950). A name with
 * 7+ positions present is recognised as a real palette family -- partial
 * runs (fewer positions) stay as standalone declarations and the caller
 * decides what to do with them.
 *
 * Designers preserve their own family names: source `--color-empire-500`
 * becomes family `empire` in the registry. No `imported-` prefix.
 */

import { tryParseColor } from '@rafters/color-utils';
import type { OKLCH } from '@rafters/shared';
import type { CssDeclaration } from './shapes.js';

const SCALE_POSITIONS = [
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
];
const POSITION_SET = new Set(SCALE_POSITIONS);
const MIN_RAMP_POSITIONS = 7;
const POSITION_SUFFIX = /^(.+)-(50|100|200|300|400|500|600|700|800|900|950)$/;
const COLOR_PREFIX = /^color-/;

export interface DetectedFamily {
  /** Family name without any `color-` prefix the source used. */
  readonly name: string;
  /** Per-position OKLCH values. Sparse: only positions present in source. */
  readonly scale: Readonly<Record<string, OKLCH>>;
}

export interface FamilyGroupingResult {
  readonly families: readonly DetectedFamily[];
  /** Declarations not absorbed into a family (non-color, partial ramps, ungrouped). */
  readonly leftover: readonly CssDeclaration[];
}

/**
 * Walk declarations, group by ramp pattern, return families with 7+
 * positions plus any leftovers. Each family's scale entries are parsed
 * to OKLCH via color-utils' `tryParseColor`; declarations whose values
 * fail to parse as colors stay in leftover.
 *
 * Tailwind v4 source typically prefixes ramp tokens with `color-`
 * (`--color-empire-500`). That prefix is stripped from the family name
 * so the rafters registry sees just `empire`.
 */
export function groupIntoFamilies(declarations: readonly CssDeclaration[]): FamilyGroupingResult {
  const candidates = new Map<string, Record<string, OKLCH>>();
  const claimedKeys = new Set<string>();

  for (const decl of declarations) {
    const m = decl.name.match(POSITION_SUFFIX);
    if (!m) continue;
    const rawFamily = m[1];
    const position = m[2];
    if (!rawFamily || !position || !POSITION_SET.has(position)) continue;
    const oklch = tryParseColor(decl.value);
    if (oklch === null) continue;
    const familyName = rawFamily.replace(COLOR_PREFIX, '');
    if (!candidates.has(familyName)) candidates.set(familyName, {});
    const scale = candidates.get(familyName);
    if (!scale) continue;
    scale[position] = oklch;
    claimedKeys.add(decl.name);
  }

  const families: DetectedFamily[] = [];
  for (const [name, scale] of candidates) {
    if (Object.keys(scale).length < MIN_RAMP_POSITIONS) {
      // Partial ramp -- release its declarations back to leftover.
      for (const decl of declarations) {
        const m = decl.name.match(POSITION_SUFFIX);
        if (!m) continue;
        const rawFamily = (m[1] ?? '').replace(COLOR_PREFIX, '');
        if (rawFamily === name) claimedKeys.delete(decl.name);
      }
      continue;
    }
    families.push({ name, scale });
  }

  const leftover = declarations.filter((d) => !claimedKeys.has(d.name));
  return { families, leftover };
}
