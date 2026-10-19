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
  ceilingForSeed,
  getGamutTier,
  mapScaleToGamut,
  oklchToCSS,
  POSITION_TO_INDEX,
  rebakeAccessibility,
  SCALE_POSITIONS,
} from '@rafters/color-utils';
import type { OKLCH, Token } from '@rafters/shared';

export function importColorFamily(name: string, seedPosition: string, seed: OKLCH): Token[] {
  const seedIndex = POSITION_TO_INDEX[seedPosition];
  if (seedIndex === undefined) {
    throw new Error(`importColorFamily: unknown scale position "${seedPosition}"`);
  }
  const built = buildColorValue(seed, { token: name });
  if (built.scale.length !== SCALE_POSITIONS.length) {
    throw new Error(
      `importColorFamily: buildColorValue returned ${built.scale.length} positions, expected ${SCALE_POSITIONS.length}`,
    );
  }
  // Pin the seed back into the position the designer authored it at.
  // buildColorValue derives every position from one anchor; without this
  // override, the value the designer typed would land at whatever index
  // the progression chose (currently 600), and the position they DID
  // write would be a derived value they never picked.
  // An imported P3 or out-of-gamut seed is mapped into the family's ceiling
  // like every other step (#2672), so the pinned step is the stored colour,
  // its tier is recorded, and seedAdjusted describes the pinned seed's move
  // (not buildColorValue's 600 landing, which the pin replaces).
  // The pinned scale is no longer the one `buildColorValue` measured, so
  // color-utils re-derives the WCAG metadata from the stored scale.
  const [pinned = seed] = mapScaleToGamut([seed], ceilingForSeed(seed));
  const scale = [...built.scale];
  scale[seedIndex] = pinned;
  // mapScaleToGamut never leaves a step 'out'; the guard only narrows the type.
  const pinnedTier = getGamutTier(pinned);
  const gamut = built.gamut?.map((tier, i) =>
    i === seedIndex && pinnedTier !== 'out' ? pinnedTier : tier,
  );
  const { seedAdjusted: _landing, ...rest } = built;
  const moved = pinned.l !== seed.l || pinned.c !== seed.c || pinned.h !== seed.h;
  const value = rebakeAccessibility({
    ...rest,
    name,
    scale,
    gamut,
    ...(moved && {
      seedAdjusted: { from: { ...seed }, to: { ...pinned }, reason: 'gamut' as const },
    }),
  });
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
