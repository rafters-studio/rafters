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
 * rest of the scale is derived around that anchor.
 */

import {
  buildColorValue,
  oklchToCSS,
  POSITION_TO_INDEX,
  SCALE_POSITIONS,
} from '@rafters/color-utils';
import type { OKLCH, Token } from '@rafters/shared';

export function importColorFamily(name: string, seedPosition: string, seed: OKLCH): Token[] {
  const seedIndex = POSITION_TO_INDEX[seedPosition];
  if (seedIndex === undefined) {
    throw new Error(`importColorFamily: unknown scale position "${seedPosition}"`);
  }
  const built = buildColorValue(seed, { token: name });
  // Pin the seed back into the position the designer authored it at.
  // buildColorValue derives every position from one anchor; without this
  // override, the value the designer typed would land at whatever index
  // the progression chose (currently 600), and the position they DID
  // write would be a derived value they never picked.
  const scale = [...built.scale];
  scale[seedIndex] = seed;
  const value = { ...built, name, scale };
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
