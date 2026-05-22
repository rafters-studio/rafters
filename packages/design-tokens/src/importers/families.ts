/**
 * Group declarations into families when they form a ramp; promote
 * single-color declarations to seed families. Both shapes carry a `seed`
 * (the canonical input color) and a `sourcePositions` map of any
 * designer-declared positions. The caller composes a full ColorValue via
 * `colorValueFromFamily` -- which calls `buildColorValue` from color-utils
 * for the math and overrides the scale with source positions where the
 * designer authored them.
 *
 * Designers preserve their own family names: source `--color-empire-500`
 * becomes family `empire` in the registry. No `imported-` prefix.
 */

import {
  buildColorValue,
  generateAccessibilityMetadata,
  tryParseColor,
} from '@rafters/color-utils';
import type { ColorValue, OKLCH } from '@rafters/shared';
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
  /**
   * Canonical input color. For ramps this is the source's 500 position.
   * For single-color declarations this is the value the designer wrote.
   * Passed to `buildColorValue` to compute harmonies / analysis / weights /
   * accessibility / semantic suggestions / generated name / tokenId.
   */
  readonly seed: OKLCH;
  /**
   * Source-declared positions. Always 11 entries for ramps; for single-color
   * declarations only the position the designer chose (default 500 when
   * the source name has no suffix). The composed ColorValue uses these
   * verbatim for any position the designer wrote, falling back to
   * `buildColorValue`'s generated scale for positions they did not.
   */
  readonly sourcePositions: Readonly<Record<string, OKLCH>>;
}

export interface FamilyGroupingResult {
  readonly families: readonly DetectedFamily[];
  readonly leftover: readonly CssDeclaration[];
}

/**
 * Walk declarations, group by ramp pattern, return families with 7+
 * positions plus any leftovers. Each family's seed is the source's 500
 * position (or the closest declared position if 500 is missing).
 *
 * Tailwind v4 source typically prefixes ramp tokens with `color-`
 * (`--color-empire-500`). That prefix is stripped from the family name.
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
  for (const [name, sourcePositions] of candidates) {
    if (Object.keys(sourcePositions).length < MIN_RAMP_POSITIONS) {
      // Partial ramp -- release declarations back to leftover.
      for (const decl of declarations) {
        const m = decl.name.match(POSITION_SUFFIX);
        if (!m) continue;
        const rawFamily = (m[1] ?? '').replace(COLOR_PREFIX, '');
        if (rawFamily === name) claimedKeys.delete(decl.name);
      }
      continue;
    }
    const seed = sourcePositions['500'] ?? closestToFiveHundred(sourcePositions);
    if (!seed) continue;
    families.push({ name, seed, sourcePositions });
  }

  const leftover = declarations.filter((d) => !claimedKeys.has(d.name));
  return { families, leftover };
}

/**
 * Promote color-valued declarations that did not form a ramp into seed
 * families. Each declaration becomes a `DetectedFamily` whose `seed` is
 * the parsed value and whose `sourcePositions` is a single entry at the
 * declared position (default 500 when the source name has no suffix).
 *
 * Skips declarations whose family base name collides with an existing
 * ramp-detected family.
 */
export function seedFamiliesFromDeclarations(
  declarations: readonly CssDeclaration[],
  existingFamilyNames: ReadonlySet<string> = new Set(),
): readonly DetectedFamily[] {
  const byBaseName = new Map<string, { seed: OKLCH; position: string }>();
  for (const decl of declarations) {
    const oklch = tryParseColor(decl.value);
    if (oklch === null) continue;
    const match = decl.name.match(POSITION_SUFFIX);
    const rawBase = (match ? match[1] : decl.name) ?? decl.name;
    const baseName = rawBase.replace(COLOR_PREFIX, '');
    if (!baseName || existingFamilyNames.has(baseName)) continue;
    const position = match ? (match[2] ?? '500') : '500';
    // Last declaration wins (CSS cascade semantics).
    byBaseName.set(baseName, { seed: oklch, position });
  }

  const out: DetectedFamily[] = [];
  for (const [name, { seed, position }] of byBaseName) {
    out.push({ name, seed, sourcePositions: { [position]: seed } });
  }
  return out;
}

/**
 * Compose a complete `ColorValue` for a detected family by calling
 * `buildColorValue` from color-utils -- the single source of truth for
 * ColorValue construction -- and overriding the generated scale with
 * any positions the designer authored.
 *
 * Returns a full ColorValue with harmonies, analysis, atmospheric and
 * perceptual weights, semantic suggestions, color name, tokenId, and
 * accessibility ladders recomputed against the final scale. The
 * `intelligence` field stays unpopulated for now -- the platform's
 * `/color/:oklch` endpoint that generates it is not yet deployed.
 */
export function colorValueFromFamily(family: DetectedFamily): ColorValue {
  const base = buildColorValue(family.seed, { token: family.name });

  // Override generated scale with source-declared positions where the
  // designer authored them. Positions the designer didn't write fall back
  // to buildColorValue's derived values.
  const finalScale: OKLCH[] = SCALE_POSITIONS.map((pos, i) => {
    return family.sourcePositions[pos] ?? base.scale[i];
  }).filter((v): v is OKLCH => v !== undefined);

  // Accessibility ladders depend on the scale: wcagAA.normal and
  // wcagAAA.normal hold pairs of scale indices that satisfy the contrast
  // threshold. If we override the scale, those ladders must be recomputed.
  // The onWhite / onBlack / APCA fields are computed against the seed
  // (not the scale) so they stay from buildColorValue.
  const accessibilityMeta = generateAccessibilityMetadata(finalScale);

  return {
    ...base,
    scale: finalScale,
    accessibility: base.accessibility
      ? {
          ...base.accessibility,
          wcagAA: accessibilityMeta.wcagAA,
          wcagAAA: accessibilityMeta.wcagAAA,
        }
      : undefined,
  };
}

function closestToFiveHundred(positions: Record<string, OKLCH>): OKLCH | undefined {
  const keys = Object.keys(positions).map(Number);
  if (keys.length === 0) return undefined;
  keys.sort((a, b) => Math.abs(a - 500) - Math.abs(b - 500));
  return positions[String(keys[0])];
}
