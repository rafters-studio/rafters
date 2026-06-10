/**
 * The elevation ladder (#1638): top-of-tree surface roles carry DESIGNED
 * dark positions from their mappings (bound via scale, so family
 * reassignment still cascades), instead of blind inversion. Found on the
 * huttspawn real-palette verification: every surface computed to the same
 * near-black because inversion mapped identical light positions to
 * identical darks and ignored the mappings' designed pairs entirely.
 *
 * The snapshot table at the bottom is the DEFAULTS taste record --
 * reviewed by Sean before locking, changed only by him.
 */

import { buildColorValue } from '@rafters/color-utils';
import type { ColorReference } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS } from '../src/generators/defaults.js';
import { generateSemanticTokens } from '../src/generators/semantic.js';
import {
  contrastPlugin,
  invertPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '../src/index.js';

const ELEVATION_ROLES = [
  'background',
  'surface',
  'panel',
  'card',
  'popover',
  'sidebar',
  'nav',
  'table-header',
  'overlay',
] as const;

function buildDefaultRegistry(): TokenRegistry {
  const semantic = generateSemanticTokens({} as never);
  // Seed every family the mappings reference (zinc, showcase palettes...)
  // with a real buildColorValue, except names that are themselves semantic
  // tokens (role indirections like 'neutral' resolve through the chain).
  const semanticNames = new Set(semantic.tokens.map((t) => t.name));
  const familyNames = new Set<string>();
  for (const mapping of Object.values(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
    familyNames.add(mapping.light.family);
    familyNames.add(mapping.dark.family);
  }
  const familyTokens = [...familyNames]
    .filter((name) => !semanticNames.has(name))
    .map((name, index) => ({
      name,
      value: buildColorValue({ l: 0.55, c: 0.08, h: (10 + index * 35) % 360, alpha: 1 }),
      category: 'color',
      namespace: 'color',
      userOverride: null,
    }));
  return new TokenRegistry(
    [...familyTokens, ...semantic.tokens],
    [scalePlugin, invertPlugin, contrastPlugin, statePlugin],
  );
}

describe('elevation ladder -- designed dark positions (#1638)', () => {
  const registry = buildDefaultRegistry();

  it('every elevation role exists, including the new panel family', () => {
    for (const role of [...ELEVATION_ROLES, 'panel-foreground', 'panel-hover', 'panel-border']) {
      expect(registry.has(role), role).toBe(true);
      expect(registry.has(`${role}--dark`), `${role}--dark`).toBe(true);
    }
  });

  it('dark surfaces are differentiated -- the flat-950 cluster is gone', () => {
    const darkPositions = new Map<string, string>();
    for (const role of ELEVATION_ROLES) {
      const dark = registry.get(`${role}--dark`)?.value as ColorReference;
      darkPositions.set(role, dark.position);
    }
    // The stacked levels must not share a single position.
    expect(new Set(darkPositions.values()).size).toBeGreaterThanOrEqual(4);
    // Designed ladder: panel sits above background, card above panel.
    expect(darkPositions.get('background')).toBe('950');
    expect(darkPositions.get('panel')).toBe('800');
    expect(darkPositions.get('card')).toBe('700');
    expect(darkPositions.get('sidebar')).toBe('900');
  });

  it('overlay is mode-invariant -- the backdrop never inverts to white', () => {
    const light = registry.get('overlay')?.value as ColorReference;
    const dark = registry.get('overlay--dark')?.value as ColorReference;
    expect(light.position).toBe('950');
    expect(dark.position).toBe('950');
  });

  it('designed darks still cascade on family reassignment', () => {
    const fresh = buildDefaultRegistry();
    const mud = buildColorValue({ l: 0.45, c: 0.08, h: 60, alpha: 1 });
    fresh.define({
      name: 'mud',
      value: mud,
      category: 'color',
      namespace: 'color',
      userOverride: null,
    });
    fresh.set('neutral', { family: 'mud', position: '500' }, { reason: 'brand import' });
    const dark = fresh.get('panel--dark')?.value as ColorReference;
    // Position stays designed; family follows the reassignment chain.
    expect(dark.position).toBe('800');
    expect(['mud', 'neutral']).toContain(dark.family);
  });

  it('snapshot: the defaults elevation table (REVIEW WITH SEAN BEFORE LOCKING)', () => {
    const table: Record<string, { light: string; dark: string }> = {};
    for (const role of ELEVATION_ROLES) {
      const m = DEFAULT_SEMANTIC_COLOR_MAPPINGS[role];
      if (!m) continue;
      table[role] = { light: m.light.position, dark: m.dark.position };
    }
    expect(table).toMatchSnapshot();
  });
});
