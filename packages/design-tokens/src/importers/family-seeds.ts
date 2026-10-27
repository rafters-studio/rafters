/**
 * Family-seed detection for `@theme` declarations.
 *
 * Pure: groups color-valued declarations by base name (Tailwind v4 source
 * conventionally prefixes with `color-`; it is stripped) and returns one
 * seed per family, with the position the designer authored it at. Prefers
 * -500 when the designer wrote it (the canonical anchor when present);
 * otherwise carries whatever position they actually wrote, so the seed lands
 * at the right index in the derived scale. Bare single-color declarations
 * (`--color-empire`) default to position 500. `importColorFamily` derives
 * the rest of the scale around that anchor; the source's other declared
 * positions are discarded.
 */

import { SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
import type { OKLCH } from '@rafters/shared';

const POSITION_SUFFIX = new RegExp(`^(.+)-(${SCALE_POSITIONS.join('|')})$`);

/** `color-<family>-<step>` read as step `<step>` of palette `<family>`, else null. */
export function parsePaletteStep(name: string): { family: string; position: string } | null {
  const m = name.match(POSITION_SUFFIX);
  if (!m?.[1] || !m[2] || !m[1].startsWith('color-')) return null;
  const family = m[1].slice('color-'.length);
  return family ? { family, position: m[2] } : null;
}

export function detectFamilySeeds(
  themeDecls: readonly { name: string; value: string }[],
): { name: string; seed: OKLCH; seedPosition: string }[] {
  const familySeeds = new Map<string, { seed: OKLCH; seedPosition: string }>();
  for (const decl of themeDecls) {
    // Tailwind v4 namespaces color tokens with `color-`. Gate on the prefix
    // so a `--font-display: red` (named CSS color, parses as OKLCH) does not
    // mint a font-display color family. Other namespaces (--font-*,
    // --spacing-*, --radius-*, --shadow-*) have dedicated import paths and
    // should not leak in here.
    if (!decl.name.startsWith('color-')) continue;
    const oklch = tryParseColor(decl.value);
    if (oklch === null) continue;
    const m = decl.name.match(POSITION_SUFFIX);
    const baseName = ((m ? m[1] : decl.name) ?? decl.name).replace(/^color-/, '');
    if (!baseName) continue;
    const seedPosition = m?.[2] ?? '500';
    const existing = familySeeds.get(baseName);
    if (!existing || seedPosition === '500') {
      familySeeds.set(baseName, { seed: oklch, seedPosition });
    }
  }
  return Array.from(familySeeds, ([name, info]) => ({ name, ...info }));
}
