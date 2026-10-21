/**
 * Color namespace importer.
 *
 * Pure: takes a family name + the position the designer authored + the seed
 * OKLCH at that position, returns the Tokens to register. Caller invokes
 * `registry.define` on each returned Token. Refs (semantic tokens reseating
 * to a ColorReference) are a separate caller-side `registry.set` call --
 * not the importer's job.
 *
 * Composes the canonical pieces: `buildColorValue` from color-utils for
 * the full ColorValue (scale + harmonies + accessibility + APCA +
 * analysis + atmospheric/perceptual weights + semantic suggestions +
 * tokenId), then overrides `.name` with the source's chosen palette name
 * (preserving `empire`, `silly-blue`, etc. rather than the auto-generated
 * fancy name from `generateColorName`), and pins the seed back into the
 * position the designer wrote it at -- not always 500. A designer who
 * authored `--color-foo-700` gets foo@700 = the seed they wrote; the
 * rest of the scale is derived around that anchor. After the pin, the
 * family's WCAG metadata is re-derived by color-utils'
 * `rebakeAccessibility`, so it always describes the stored scale.
 */

import {
  buildColorValue,
  getGamutTier,
  oklchToCSS,
  POSITION_TO_INDEX,
  rebakeAccessibility,
  SCALE_POSITIONS,
} from '@rafters/color-utils';
import type { OKLCH, Token } from '@rafters/shared';

export function importColorFamily(name: string, seedPosition: string, seed: OKLCH): Token[];
/**
 * A complete scale: all 11 steps, 50 to 950, kept exactly as given. The
 * fields `buildColorValue` derives from one colour come from the given 500.
 */
export function importColorFamily(name: string, scale: readonly OKLCH[]): Token[];
export function importColorFamily(
  name: string,
  positionOrScale: string | readonly OKLCH[],
  seed?: OKLCH,
): Token[] {
  const pins = new Map<number, OKLCH>();
  let anchor = seed;
  if (typeof positionOrScale === 'string') {
    const seedIndex = POSITION_TO_INDEX[positionOrScale];
    if (seedIndex === undefined || seed === undefined) {
      throw new Error(`importColorFamily: unknown scale position "${positionOrScale}"`);
    }
    pins.set(seedIndex, seed);
  } else {
    if (positionOrScale.length !== SCALE_POSITIONS.length) {
      throw new Error(
        `importColorFamily: a scale has ${SCALE_POSITIONS.length} steps, got ${positionOrScale.length}`,
      );
    }
    for (const [i, step] of positionOrScale.entries()) pins.set(i, step);
    anchor = pins.get(SCALE_POSITIONS.indexOf('500'));
  }
  if (anchor === undefined) throw new Error('importColorFamily: no seed');
  const built = buildColorValue(anchor, { token: name });
  if (built.scale.length !== SCALE_POSITIONS.length) {
    throw new Error(
      `importColorFamily: buildColorValue returned ${built.scale.length} positions, expected ${SCALE_POSITIONS.length}`,
    );
  }
  // Pin each given step back into the position the designer authored it at.
  // buildColorValue derives every position from one anchor; without this
  // override, the value the designer typed would land at whatever index
  // the progression chose (currently 600), and the position they DID
  // write would be a derived value they never picked.
  // The pinned scale is no longer the one `buildColorValue` measured, so
  // color-utils re-derives the WCAG metadata from the stored scale.
  // A pinned step records its true tier, 'out' included, and the family
  // carries no seedAdjusted: the typed value is stored as typed (#2672 spec
  // delta, veneer 2026-10-19).
  const scale = built.scale.map((step, i) => pins.get(i) ?? step);
  const gamut = built.gamut?.map((tier, i) => {
    const pinned = pins.get(i);
    return pinned === undefined ? tier : getGamutTier(pinned);
  });
  const { seedAdjusted: _built600Move, ...rest } = built;
  const value = rebakeAccessibility({ ...rest, name, scale, gamut });
  const tokens: Token[] = [
    {
      name,
      namespace: 'color',
      category: 'color',
      value,
      userOverride: null,
      containerQueryAware: true,
    },
  ];
  for (const [i, pos] of SCALE_POSITIONS.entries()) {
    const oklch = value.scale[i];
    if (!oklch) continue;
    tokens.push({
      name: `${name}-${pos}`,
      namespace: 'color',
      category: 'color',
      value: oklchToCSS(oklch),
      userOverride: null,
      containerQueryAware: true,
    });
  }
  return tokens;
}
