/**
 * Drift tripwire for the two Tailwind assembly functions (#1730).
 *
 * `registryToTailwind` (consumer + compiled path) and `registryToTailwindStatic`
 * (studio static CSS) build the same theme from the same sections but diverge
 * intentionally: the static path uses var() refs and omits the live `:root`
 * cascade and the @utility groups. A section added to one and silently missed
 * in the other is the failure this freezes: the marker set of each assembly is
 * asserted explicitly, so adding a section forces a conscious update here and a
 * decision about the other.
 */

import { describe, expect, it } from 'vitest';
import { generateBaseSystem } from '../../src/generators/index.js';
import {
  contrastPlugin,
  invertPlugin,
  registryToTailwind,
  registryToTailwindStatic,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../../src/index.js';

const CANDIDATE_MARKERS = [
  '@import "tailwindcss"',
  '@custom-variant dark',
  '@theme inline {',
  '@theme {',
  ':root, :host {',
  '.dark {',
  '@keyframes',
  '@utility',
  '@layer base',
] as const;

function markersOf(css: string): string[] {
  return CANDIDATE_MARKERS.filter((m) => css.includes(m)).sort();
}

function baseRegistry(): TokenRegistry {
  const system = generateBaseSystem({});
  return new TokenRegistry(system.allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

// The frozen section contract. Update these ONLY when intentionally changing an
// assembly -- and when you do, decide whether the other assembly needs the same
// section. That decision is the whole point of this test.
const DYNAMIC_SECTIONS = [
  '.dark {',
  ':root, :host {',
  '@custom-variant dark',
  '@import "tailwindcss"',
  '@keyframes',
  '@layer base',
  '@theme inline {',
  '@theme {',
  '@utility',
];

// Static (studio) intentionally omits the live `:root`/`.dark` cascade,
// `@custom-variant dark`, and the @utility groups -- it references --rafters-*
// vars instead. Any section added to registryToTailwind that ALSO belongs in the
// static path must be added here, or this test documents the divergence.
const STATIC_SECTIONS = [
  '@import "tailwindcss"',
  '@keyframes',
  '@layer base',
  '@theme inline {',
  '@theme {',
];

describe('Tailwind assembly parity (#1730)', () => {
  const registry = baseRegistry();

  it('registryToTailwind emits exactly the frozen section set', () => {
    expect(markersOf(registryToTailwind(registry))).toEqual(DYNAMIC_SECTIONS);
  });

  it('registryToTailwindStatic emits exactly the frozen section set', () => {
    expect(markersOf(registryToTailwindStatic(registry))).toEqual(STATIC_SECTIONS);
  });

  it('sections in static are a subset of dynamic (static never invents a section)', () => {
    const dynamic = new Set(markersOf(registryToTailwind(registry)));
    for (const marker of markersOf(registryToTailwindStatic(registry))) {
      expect(dynamic.has(marker), `static-only section: ${marker}`).toBe(true);
    }
  });
});
