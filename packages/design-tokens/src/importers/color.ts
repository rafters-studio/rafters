/**
 * Color namespace importer.
 *
 * Pure: takes a family name + seed OKLCH, returns the Tokens to register.
 * Caller invokes `registry.define` on each returned Token. Refs (semantic
 * tokens reseating to a ColorReference) are a separate caller-side
 * `registry.set` call -- not the importer's job.
 *
 * Composes the canonical pieces: `buildColorValue` from color-utils for
 * the full ColorValue (scale + harmonies + accessibility + APCA +
 * analysis + atmospheric/perceptual weights + semantic suggestions +
 * tokenId), then overrides `.name` with the source's chosen palette name
 * (preserving `empire`, `silly-blue`, etc. rather than the auto-generated
 * fancy name from `generateColorName`).
 */

import { buildColorValue, oklchToCSS, SCALE_POSITIONS } from '@rafters/color-utils';
import type { OKLCH, Token } from '@rafters/shared';

export function importColorFamily(name: string, seed: OKLCH): Token[] {
  const built = buildColorValue(seed, { token: name });
  // Pin the seed to the canonical 500 anchor. `generateLightnessProgression`
  // places the seed lightness at position 600 by default, but rafters
  // treats position 500 as the family's "main" color and downstream
  // consumers (semantic refs, Tailwind exporter family alias) read it.
  const scale = [...built.scale];
  scale[5] = seed;
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
