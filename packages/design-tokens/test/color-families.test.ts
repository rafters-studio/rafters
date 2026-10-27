/**
 * Every default colour family is a ColorValue built by color-utils
 * (`buildFamily` over `DEFAULT_COLOR_SEEDS`), zinc included. #2669
 */

import { oklchToCSS } from '@rafters/color-utils';
import type { ColorValue } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { buildFamily } from '../src/generators/color.js';
import { DEFAULT_COLOR_SEEDS } from '../src/generators/defaults.js';
import { generateBaseSystem } from '../src/generators/index.js';
import { COLOR_SCALE_POSITIONS } from '../src/generators/types.js';

function familyTokens() {
  return generateBaseSystem().allTokens.filter(
    (t) =>
      t.namespace === 'color' &&
      typeof t.value === 'object' &&
      t.value !== null &&
      'scale' in t.value,
  );
}

describe('default colour families', () => {
  it('generates exactly one family per DEFAULT_COLOR_SEEDS entry', () => {
    expect(familyTokens().map((t) => t.name)).toEqual(Object.keys(DEFAULT_COLOR_SEEDS));
  });

  it('every family token value deep-equals buildFamily(name, DEFAULT_COLOR_SEEDS[name])', () => {
    for (const t of familyTokens()) {
      const entry = DEFAULT_COLOR_SEEDS[t.name];
      if (!entry) throw new Error(`no seed for family ${t.name}`);
      expect(t.value).toEqual(buildFamily(t.name, entry));
    }
  });

  it("zinc's 600 step equals its seed", () => {
    const zinc = familyTokens().find((t) => t.name === 'zinc');
    if (!zinc) throw new Error('zinc family missing');
    const value = zinc.value as ColorValue;
    expect(value.scale[6]).toEqual({ l: 0.442, c: 0, h: 0, alpha: 1 });
  });

  it('buildFamily sets name, token and use on the color-utils value', () => {
    const entry = { seed: { l: 0.55, c: 0.12, h: 180, alpha: 1 }, description: 'test family' };
    const value = buildFamily('glacier', entry);
    expect(value.name).toBe('glacier');
    expect(value.token).toBe('glacier');
    expect(value.use).toBe('test family');
    expect(value.accessibility?.apca).toBeDefined();
  });

  it("every family's per-position primitives equal the family scale at that position", () => {
    const system = generateBaseSystem();
    const byName = new Map(system.allTokens.map((t) => [t.name, t]));
    for (const name of Object.keys(DEFAULT_COLOR_SEEDS)) {
      const family = byName.get(name);
      if (!family) throw new Error(`family ${name} missing`);
      const scale = (family.value as ColorValue).scale;
      expect(scale).toHaveLength(COLOR_SCALE_POSITIONS.length);
      for (const [index, position] of COLOR_SCALE_POSITIONS.entries()) {
        const step = scale[index];
        if (!step) throw new Error(`${name} has no step at ${position}`);
        expect(byName.get(`${name}-${position}`)?.value).toBe(oklchToCSS(step));
      }
    }
  });
});
