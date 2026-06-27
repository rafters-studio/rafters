/**
 * Tests for semanticFor() — the semantic selection closure (#1636).
 *
 * Contract (Sean, 2026-06-09): pairs are found in light mode, then inverted
 * AS A UNIT for dark mode. Nudging corrects validity; designer override
 * corrects taste. Foreground/state selection must be behavior-identical to
 * the current contrast/state plugins (parity baseline — any taste change
 * beyond the dark fix needs Sean's approval at the snapshot review).
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import { buildColorValue } from '../src/builder.js';
import { POSITION_TO_INDEX, SCALE_POSITIONS } from '../src/scale-positions.js';
import { type Pair, type SemanticContext, semanticFor } from '../src/semantic.js';

const blue: OKLCH = { l: 0.5, c: 0.15, h: 240, alpha: 1 };
const red: OKLCH = { l: 0.5, c: 0.2, h: 25, alpha: 1 };
const green: OKLCH = { l: 0.6, c: 0.15, h: 145, alpha: 1 };
const gray: OKLCH = { l: 0.5, c: 0.01, h: 0, alpha: 1 };

const seeds: Record<string, OKLCH> = { blue, red, green, gray };

function family(seed: OKLCH): ColorValue {
  return buildColorValue(seed);
}

/** Mirror of the contrast plugin's pair walk (parity reference). */
function partnerOf(
  pairs: readonly (readonly number[])[] | undefined,
  anchor: number,
): number | undefined {
  if (!pairs) return undefined;
  for (const [p1, p2] of pairs) {
    if (p1 === anchor) return p2;
    if (p2 === anchor) return p1;
  }
  return undefined;
}

function nearestPartnerOf(
  pairs: readonly (readonly number[])[] | undefined,
  baseIndex: number,
): number | undefined {
  if (!pairs || pairs.length === 0) return undefined;
  const anchors = new Set<number>();
  for (const pair of pairs) for (const p of pair) anchors.add(p);
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    const d = Math.abs(anchor - baseIndex);
    if (d < bestDistance) {
      bestDistance = d;
      best = anchor;
    }
  }
  return best === -1 ? undefined : partnerOf(pairs, best);
}

function pluginForegroundIndex(value: ColorValue, baseIndex: number): number | undefined {
  const aaaPairs = value.accessibility?.wcagAAA?.normal;
  const aaPairs = value.accessibility?.wcagAA?.normal;
  const aaa = partnerOf(aaaPairs, baseIndex) ?? nearestPartnerOf(aaaPairs, baseIndex);
  const aa = partnerOf(aaPairs, baseIndex) ?? nearestPartnerOf(aaPairs, baseIndex);
  return aaa ?? aa;
}

describe('semanticFor — foreground pairs (parity with contrast plugin)', () => {
  for (const [name, seed] of Object.entries(seeds)) {
    it(`matches the plugin pair walk for every position (${name})`, () => {
      const value = family(seed);
      const sem = semanticFor(value, { name });
      for (let i = 0; i < SCALE_POSITIONS.length; i++) {
        const expected = pluginForegroundIndex(value, i);
        if (expected === undefined) continue; // plugin would throw; covered below
        const pair = sem.pair({ use: 'foreground', from: SCALE_POSITIONS[i] as string });
        expect(pair.to.family).toBe(name);
        expect(POSITION_TO_INDEX[pair.to.position]).toBe(expected);
        expect(pair.from.position).toBe(SCALE_POSITIONS[i]);
      }
    });
  }

  it('honors foregroundReferences.auto as tier "reference"', () => {
    const value = family(blue) as ColorValue & {
      foregroundReferences?: { auto?: { family: string; position: string } };
    };
    value.foregroundReferences = { auto: { family: 'zinc', position: '50' } };
    const sem = semanticFor(value, { name: 'blue' });
    const pair = sem.pair({ use: 'foreground', from: '500' });
    expect(pair.to).toEqual({ family: 'zinc', position: '50' });
    expect(pair.tier).toBe('reference');
  });

  it('throws a named error when no accessibility data exists', () => {
    const value = family(blue);
    const stripped = { ...value, accessibility: undefined } as unknown as ColorValue;
    const sem = semanticFor(stripped, { name: 'blue' });
    expect(() => sem.pair({ use: 'foreground', from: '500' })).toThrow(/blue/);
  });
});

describe('semanticFor — state pairs (parity with state plugin)', () => {
  /** Mirror of the state plugin ladder walk (parity reference). */
  function pluginStateIndex(
    value: ColorValue,
    baseIndex: number,
    state: 'hover' | 'active' | 'focus' | 'disabled',
  ): number {
    const pairs = value.accessibility?.wcagAAA?.normal ?? [];
    const positions = new Set<number>();
    for (const pair of pairs) for (const p of pair) positions.add(p);
    const ladder = Array.from(positions).sort((a, b) => a - b);
    const nearestRank = (position: number): number => {
      let bestRank = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let r = 0; r < ladder.length; r++) {
        const d = Math.abs((ladder[r] as number) - position);
        if (d < bestDistance) {
          bestDistance = d;
          bestRank = r;
        }
      }
      return bestRank;
    };
    const midpointRank = (): number => {
      let bestRank = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let r = 0; r < ladder.length; r++) {
        const d = Math.abs((ladder[r] as number) - 5);
        if (d < bestDistance) {
          bestDistance = d;
          bestRank = r;
        }
      }
      return bestRank;
    };
    const baseRank = nearestRank(baseIndex);
    const target =
      state === 'hover' || state === 'focus'
        ? baseRank + 1
        : state === 'active'
          ? baseRank + 2
          : midpointRank();
    const clamped = Math.max(0, Math.min(ladder.length - 1, target));
    return ladder[clamped] as number;
  }

  const states = ['hover', 'active', 'focus', 'disabled'] as const;

  for (const [name, seed] of Object.entries(seeds)) {
    it(`matches the plugin ladder walk for every position and state (${name})`, () => {
      const value = family(seed);
      const sem = semanticFor(value, { name });
      for (let i = 0; i < SCALE_POSITIONS.length; i++) {
        for (const state of states) {
          const expected = pluginStateIndex(value, i, state);
          const pair = sem.pair({ use: state, from: SCALE_POSITIONS[i] as string });
          expect(POSITION_TO_INDEX[pair.to.position]).toBe(expected);
        }
      }
    });
  }

  it('honors stateReferences as tier "reference"', () => {
    const value = family(blue) as ColorValue & {
      stateReferences?: Record<string, { family: string; position: string }>;
    };
    value.stateReferences = { hover: { family: 'blue', position: '700' } };
    const sem = semanticFor(value, { name: 'blue' });
    const pair = sem.pair({ use: 'hover', from: '500' });
    expect(pair.to).toEqual({ family: 'blue', position: '700' });
    expect(pair.tier).toBe('reference');
  });

  it('states() returns one pair per state type', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    const all = sem.states('500');
    expect(Object.keys(all).sort()).toEqual([
      'active',
      'border',
      'disabled',
      'focus',
      'hover',
      'ring',
      'subtle',
    ]);
    for (const state of states) {
      expect(all[state]).toEqual(sem.pair({ use: state, from: '500' }));
    }
  });
});

describe('semanticFor — dark state stepping (#1646: direction-aware)', () => {
  it('dark hover/active step toward lighter (lower index), not darker', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const value = family(seed);
      const sem = semanticFor(value, { name });
      // dark parent at position 950 (index 10)
      const hover = sem.pair({ use: 'hover', from: '950', dark: true });
      const active = sem.pair({ use: 'active', from: '950', dark: true });
      const hoverIdx = POSITION_TO_INDEX[hover.to.position] as number;
      const activeIdx = POSITION_TO_INDEX[active.to.position] as number;
      expect(hoverIdx, `${name} dark hover should be lighter than 950`).toBeLessThan(10);
      expect(activeIdx, `${name} dark active should be lighter than 950`).toBeLessThan(10);
      expect(activeIdx, `${name} dark active should step further than hover`).toBeLessThan(
        hoverIdx,
      );
    }
  });

  it('light state stepping is unchanged (parity)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const value = family(seed);
      const sem = semanticFor(value, { name });
      const hover = sem.pair({ use: 'hover', from: '50' });
      const hoverDark = sem.pair({ use: 'hover', from: '50', dark: false });
      expect(hover).toEqual(hoverDark);
      const hoverIdx = POSITION_TO_INDEX[hover.to.position] as number;
      expect(hoverIdx, `${name} light hover should be darker than 50`).toBeGreaterThan(0);
    }
  });

  it('dark disabled still targets midpoint (not direction-flipped)', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    const lightDisabled = sem.pair({ use: 'disabled', from: '950' });
    const darkDisabled = sem.pair({ use: 'disabled', from: '950', dark: true });
    expect(lightDisabled).toEqual(darkDisabled);
  });

  it('states() accepts dark parameter', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    const darkStates = sem.states('950', true);
    const lightStates = sem.states('950');
    expect(POSITION_TO_INDEX[darkStates.hover.to.position]).not.toBe(
      POSITION_TO_INDEX[lightStates.hover.to.position],
    );
  });

  it('snapshot: dark state positions (REVIEW WITH SEAN BEFORE LOCKING)', () => {
    const table: Record<string, Record<string, string>> = {};
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      const row: Record<string, string> = {};
      for (const position of SCALE_POSITIONS) {
        const states = sem.states(position, true);
        row[position] = `h=${states.hover.to.position} a=${states.active.to.position}`;
      }
      table[name] = row;
    }
    expect(table).toMatchSnapshot();
  });
});

describe('semanticFor — surface derivations (border, ring, subtle)', () => {
  it('border steps +2 from base (same as active)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      for (const position of SCALE_POSITIONS) {
        const border = sem.pair({ use: 'border', from: position });
        const active = sem.pair({ use: 'active', from: position });
        expect(
          POSITION_TO_INDEX[border.to.position],
          `${name}@${position}: border should equal active (+2)`,
        ).toBe(POSITION_TO_INDEX[active.to.position]);
      }
    }
  });

  it('ring stays at the same ladder rank as base (no step)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      const hover = sem.pair({ use: 'hover', from: '100' });
      const ring = sem.pair({ use: 'ring', from: '100' });
      const hoverIdx = POSITION_TO_INDEX[hover.to.position] as number;
      const ringIdx = POSITION_TO_INDEX[ring.to.position] as number;
      const baseIdx = POSITION_TO_INDEX['100'] as number;
      expect(hoverIdx, `${name}: hover should step away from base`).toBeGreaterThan(baseIdx);
      expect(ringIdx, `${name}: ring should stay at or near base`).toBeLessThanOrEqual(baseIdx);
    }
  });

  it('subtle steps opposite direction from hover (toward lighter in light mode)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      const hover = sem.pair({ use: 'hover', from: '500' });
      const subtle = sem.pair({ use: 'subtle', from: '500' });
      const hoverIdx = POSITION_TO_INDEX[hover.to.position] as number;
      const subtleIdx = POSITION_TO_INDEX[subtle.to.position] as number;
      expect(subtleIdx, `${name}: subtle should be lighter than base (500)`).toBeLessThan(5);
      expect(hoverIdx, `${name}: hover should be darker than base (500)`).toBeGreaterThan(5);
    }
  });

  it('dark border steps toward lighter (opposite of light mode)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      const lightBorder = sem.pair({ use: 'border', from: '200' });
      const darkBorder = sem.pair({ use: 'border', from: '200', dark: true });
      const lightIdx = POSITION_TO_INDEX[lightBorder.to.position] as number;
      const darkIdx = POSITION_TO_INDEX[darkBorder.to.position] as number;
      expect(lightIdx, `${name}: light border should be darker than 200`).toBeGreaterThan(2);
      expect(darkIdx, `${name}: dark border should be lighter than 200`).toBeLessThan(2);
    }
  });
});

describe('generateSemanticColorSuggestions (seed-derived, anchored to colorWheel formulas)', () => {
  it('derives chroma from the seed: a muted seed yields muted status colors', async () => {
    const { generateSemanticColorSuggestions, statusAnchor } = await import('../src/semantic.js');
    const { toNearestGamut } = await import('../src/gamut.js');
    const { roundOKLCH } = await import('../src/conversion.js');
    const vivid = generateSemanticColorSuggestions(red);
    const muted = generateSemanticColorSuggestions(gray);
    for (const role of ['destructive', 'success', 'warning', 'info'] as const) {
      for (let i = 0; i < 3; i++) {
        expect((muted[role][i] as OKLCH).c).toBeLessThan((vivid[role][i] as OKLCH).c);
      }
      // Variant 1 IS the wheel anchor (gamut-clamped for storage) — single source of truth.
      expect(vivid[role][0]).toEqual(roundOKLCH(toNearestGamut(statusAnchor(role, red)).color));
    }
  });

  it('produces three variants per role, distinct and inside the role hue band', async () => {
    const { generateSemanticColorSuggestions } = await import('../src/semantic.js');
    const out = generateSemanticColorSuggestions(blue);
    const bands: Record<string, readonly [number, number]> = {
      destructive: [330, 30],
      success: [120, 160],
      warning: [60, 110],
      info: [200, 250],
    };
    for (const role of ['destructive', 'success', 'warning', 'info'] as const) {
      expect(out[role]).toHaveLength(3);
      const [min, max] = bands[role] as [number, number];
      for (const variant of out[role] as OKLCH[]) {
        const inBand =
          min <= max ? variant.h >= min && variant.h <= max : variant.h >= min || variant.h <= max;
        expect(inBand, `${role} variant h=${variant.h}`).toBe(true);
      }
      const hues = new Set((out[role] as OKLCH[]).map((v) => v.h));
      expect(hues.size, `${role} variants should be distinct`).toBeGreaterThan(1);
    }
  });

  it('mirrors destructive into the deprecated danger key (apps/api transition)', async () => {
    const { generateSemanticColorSuggestions } = await import('../src/semantic.js');
    const out = generateSemanticColorSuggestions(blue);
    expect(out.danger).toEqual(out.destructive);
  });

  it('legacy persisted shape (danger-only) still parses via the shared schema', async () => {
    const { SemanticColorSuggestionsSchema } = await import('@rafters/shared');
    const { generateSemanticColorSuggestions } = await import('../src/semantic.js');
    const fresh = generateSemanticColorSuggestions(blue);
    const legacy = {
      danger: fresh.destructive,
      success: fresh.success,
      warning: fresh.warning,
      info: fresh.info,
    };
    const parsed = SemanticColorSuggestionsSchema.parse(legacy);
    expect(parsed.destructive).toEqual(fresh.destructive);
  });

  it('snapshot: suggestions per seed (REVIEW WITH SEAN BEFORE LOCKING)', async () => {
    const { generateSemanticColorSuggestions } = await import('../src/semantic.js');
    const out: Record<string, unknown> = {};
    for (const [name, seed] of Object.entries(seeds)) {
      out[name] = generateSemanticColorSuggestions(seed);
    }
    expect(out).toMatchSnapshot();
  });
});

describe('semanticFor — invert (the #1635 fix: pair inversion, character-preserving)', () => {
  function invertedOf(
    name: string,
    seed: OKLCH,
    fromPosition: string,
  ): { pair: Pair; sem: SemanticContext } {
    const sem = semanticFor(family(seed), { name });
    const light = sem.pair({ use: 'foreground', from: fromPosition });
    return { pair: sem.invert(light), sem };
  }

  it('mid-tone bases never invert to scale extremes (huttspawn regression)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      for (const from of ['300', '400', '500', '600', '700']) {
        const { pair } = invertedOf(name, seed, from);
        const fromIndex = POSITION_TO_INDEX[pair.from.position] as number;
        expect(fromIndex, `${name} ${from} -> ${pair.from.position}`).toBeGreaterThan(0);
        expect(fromIndex, `${name} ${from} -> ${pair.from.position}`).toBeLessThan(10);
      }
    }
  });

  it('targets mathematical inversion per leg (10 - index) and lands nearest passing pair', () => {
    const value = family(blue);
    const sem = semanticFor(value, { name: 'blue' });
    const light = sem.pair({ use: 'foreground', from: '500' });
    const dark = sem.invert(light);
    // From-leg target is 10-5=5: result must be the passing pair nearest the target,
    // strictly closer to 5 than to either extreme.
    const fromIndex = POSITION_TO_INDEX[dark.from.position] as number;
    expect(Math.abs(fromIndex - 5)).toBeLessThanOrEqual(3);
  });

  it('meets a contrast standard whenever the family has any passing pair', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const value = family(seed);
      const hasPairs =
        (value.accessibility?.wcagAAA?.normal?.length ?? 0) > 0 ||
        (value.accessibility?.wcagAA?.normal?.length ?? 0) > 0;
      if (!hasPairs) continue;
      const { pair } = invertedOf(name, seed, '500');
      expect(pair.standard, name).not.toBe('none');
    }
  });

  it('is deterministic', () => {
    const a = invertedOf('blue', blue, '500').pair;
    const b = invertedOf('blue', blue, '500').pair;
    expect(a).toEqual(b);
  });

  it('reports tier "inversion" with standard "none" when accessibility data is stripped', () => {
    const value = family(blue);
    const sem = semanticFor(value, { name: 'blue' });
    const light = sem.pair({ use: 'foreground', from: '500' });
    const stripped = { ...value, accessibility: undefined } as unknown as ColorValue;
    const darkSem = semanticFor(stripped, { name: 'blue' });
    const dark = darkSem.invert(light);
    expect(dark.tier).toBe('inversion');
    expect(dark.standard).toBe('none');
    // Pure mathematical inversion: 10 - index per leg.
    const lightFrom = POSITION_TO_INDEX[light.from.position] as number;
    expect(POSITION_TO_INDEX[dark.from.position]).toBe(10 - lightFrom);
  });

  it('snapshot table: family x position -> inverted from-leg (REVIEW WITH SEAN BEFORE LOCKING)', () => {
    const table: Record<string, Record<string, string>> = {};
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      const row: Record<string, string> = {};
      for (const position of SCALE_POSITIONS) {
        const light = sem.pair({ use: 'foreground', from: position });
        const dark = sem.invert(light);
        row[position] = `${dark.from.position}/${dark.to.position} (${dark.tier},${dark.standard})`;
      }
      table[name] = row;
    }
    expect(table).toMatchSnapshot();
  });
});
