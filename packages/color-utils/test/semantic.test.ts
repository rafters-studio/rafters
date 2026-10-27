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
import { calculateWCAGContrast } from '../src/accessibility.js';
import { buildColorValue } from '../src/builder.js';
import { POSITION_TO_INDEX, SCALE_POSITIONS } from '../src/scale-positions.js';
import {
  type Pair,
  type SemanticContext,
  SemanticSelectionError,
  semanticFor,
} from '../src/semantic.js';

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
  // #2672: try the AAA candidate, then the AA one, by measured contrast;
  // otherwise the candidate with the best measured contrast.
  const candidates = [aaa, aa].filter((c): c is number => c !== undefined);
  const base = value.scale[baseIndex];
  if (!base || candidates.length === 0) return undefined;
  const ratio = (c: number): number => {
    const partner = value.scale[c];
    return partner ? calculateWCAGContrast(base, partner) : 1;
  };
  return (
    candidates.find((c) => ratio(c) >= 7) ??
    candidates.find((c) => ratio(c) >= 4.5) ??
    candidates.reduce((best, c) => (ratio(c) > ratio(best) ? c : best))
  );
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
    const pairs = value.accessibility?.wcagAA?.normal ?? [];
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
    // #2668: hover, focus and active reflect off the ends of the ladder
    // (the same distance the other way); disabled never leaves it.
    const last = ladder.length - 1;
    const reflected =
      state !== 'disabled' && (target < 0 || target > last) ? 2 * baseRank - target : target;
    const clamped = Math.max(0, Math.min(last, reflected));
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
    const darkStates = sem.states('500', true);
    const lightStates = sem.states('500');
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

  it('ring is always closer to base than hover (zero step vs one step)', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      for (const position of SCALE_POSITIONS) {
        const hover = sem.pair({ use: 'hover', from: position });
        const ring = sem.pair({ use: 'ring', from: position });
        const hoverIdx = POSITION_TO_INDEX[hover.to.position] as number;
        const ringIdx = POSITION_TO_INDEX[ring.to.position] as number;
        const baseIdx = POSITION_TO_INDEX[position] as number;
        expect(
          Math.abs(ringIdx - baseIdx),
          `${name}@${position}: ring should be no further from base than hover`,
        ).toBeLessThanOrEqual(Math.abs(hoverIdx - baseIdx));
      }
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
    const { clampColor } = await import('../src/gamut.js');
    const vivid = generateSemanticColorSuggestions(red);
    const muted = generateSemanticColorSuggestions(gray);
    for (const role of ['destructive', 'success', 'warning', 'info'] as const) {
      for (let i = 0; i < 3; i++) {
        expect((muted[role][i] as OKLCH).c).toBeLessThan((vivid[role][i] as OKLCH).c);
      }
      // Variant 1 IS the wheel anchor (gamut-clamped for storage) — single source of truth.
      expect(vivid[role][0]).toEqual(clampColor(statusAnchor(role, red)));
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

  it('keeps each variant on its band-clamped hue when the anchor leaves sRGB (#2878)', async () => {
    const { generateSemanticColorSuggestions, statusAnchor } = await import('../src/semantic.js');
    const { isInSRGBGamut } = await import('../src/gamut.js');
    const vivid: OKLCH = { l: 0.6, c: 0.4, h: 25, alpha: 1 };
    const out = generateSemanticColorSuggestions(vivid);
    const hues = {
      destructive: [25, 30, 15],
      success: [145, 155, 135],
      warning: [85, 95, 75],
      info: [230, 240, 220],
    } as const;
    for (const role of ['success', 'warning', 'info'] as const) {
      expect(isInSRGBGamut(statusAnchor(role, vivid)), role).toBe(false);
    }
    for (const role of ['destructive', 'success', 'warning', 'info'] as const) {
      const anchor = statusAnchor(role, vivid);
      for (const [i, variant] of (out[role] as OKLCH[]).entries()) {
        expect(variant.h, `${role}[${i}]`).toBe(hues[role][i]);
        expect(variant.l, `${role}[${i}]`).toBeCloseTo(anchor.l + ([0, 0.05, -0.05][i] ?? 0), 3);
        expect(isInSRGBGamut(variant), `${role}[${i}]`).toBe(true);
      }
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

describe('semanticFor — distinct states, visible rings, readable foregrounds (#2668)', () => {
  const white: OKLCH = { l: 1, c: 0, h: 0, alpha: 1 };
  const black: OKLCH = { l: 0, c: 0, h: 0, alpha: 1 };
  const indexOf = (pair: Pair): number => POSITION_TO_INDEX[pair.to.position] as number;

  it('a ring with a surface is at least 3:1 against it, and never its base when the base is below 3:1', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const value = family(seed);
      const sem = semanticFor(value, { name });
      for (const surface of [white, black, value.scale[0] as OKLCH, value.scale[10] as OKLCH]) {
        for (const from of SCALE_POSITIONS) {
          const ring = sem.pair({ use: 'ring', from, surface });
          const ringColor = value.scale[indexOf(ring)] as OKLCH;
          const baseColor = value.scale[POSITION_TO_INDEX[from] as number] as OKLCH;
          const label = `${name}@${from} on l=${surface.l}`;
          expect(calculateWCAGContrast(ringColor, surface), label).toBeGreaterThanOrEqual(3);
          if (calculateWCAGContrast(baseColor, surface) < 3) {
            expect(ring.to.position, label).not.toBe(from);
          }
        }
      }
    }
  });

  it('a ring keeps a base that already stands out, and moves away from the surface otherwise', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    expect(sem.pair({ use: 'ring', from: '900', surface: white }).to.position).toBe('900');
    // 100 on white is below 3:1: the ring steps darker (away from white).
    expect(indexOf(sem.pair({ use: 'ring', from: '100', surface: white }))).toBeGreaterThan(1);
    // 900 on black is below 3:1: the ring steps lighter (away from black).
    expect(indexOf(sem.pair({ use: 'ring', from: '900', surface: black }))).toBeLessThan(9);
  });

  it('a ring that no step lifts to 3:1 takes the step with the highest contrast', () => {
    // A mid-grey surface no step of a narrow grey family reaches 3:1 against.
    const value = family(gray);
    const narrow: ColorValue = {
      ...value,
      scale: value.scale.map((c) => ({ ...c, l: 0.55 + (c.l - 0.5) * 0.1 })),
    };
    const surface: OKLCH = { l: 0.55, c: 0, h: 0, alpha: 1 };
    const ratios = narrow.scale.map((c) => calculateWCAGContrast(c, surface));
    expect(Math.max(...ratios)).toBeLessThan(3);
    const sem = semanticFor(narrow, { name: 'gray' });
    const ring = sem.pair({ use: 'ring', from: '500', surface });
    expect(indexOf(ring)).toBe(ratios.indexOf(Math.max(...ratios)));
  });

  it('a ring without a surface keeps copying its base rung', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    expect(sem.states('500').ring).toEqual(sem.pair({ use: 'ring', from: '500' }));
    // 950 is a rung of the AA ladder, so the ring is the base itself.
    expect(sem.pair({ use: 'ring', from: '950' }).to.position).toBe('950');
  });

  it('hover, active and the base are three different steps at every position, light and dark', () => {
    for (const [name, seed] of Object.entries(seeds)) {
      const sem = semanticFor(family(seed), { name });
      for (const from of SCALE_POSITIONS) {
        for (const dark of [false, true]) {
          const hover = sem.pair({ use: 'hover', from, dark }).to.position;
          const active = sem.pair({ use: 'active', from, dark }).to.position;
          const label = `${name}@${from}${dark ? ' dark' : ''}`;
          expect(hover, label).not.toBe(from);
          expect(active, label).not.toBe(from);
          expect(active, label).not.toBe(hover);
        }
      }
    }
  });

  it('hover at the end of the ladder reflects one rung back, active two', () => {
    const value = family(blue);
    const sem = semanticFor(value, { name: 'blue' });
    // Light mode steps darker; 950 is the darkest rung, so both reflect lighter.
    const hover = indexOf(sem.pair({ use: 'hover', from: '950' }));
    const active = indexOf(sem.pair({ use: 'active', from: '950' }));
    expect(hover).toBeLessThan(10);
    expect(active).toBeLessThan(hover);
  });

  it('a foreground with no in-family AA pair falls back to the fallback family, measured', () => {
    const value = family(blue);
    if (!value.accessibility) throw new Error('blue has no accessibility metadata');
    // Only a weak AA pair (500 with 600), so no candidate meets AA.
    const weak: ColorValue = {
      ...value,
      accessibility: {
        ...value.accessibility,
        wcagAA: { normal: [[5, 6]], large: [] },
        wcagAAA: { normal: [], large: [] },
      },
    };
    const neutral = family(gray);
    const sem = semanticFor(weak, { name: 'blue' });
    const pair = sem.pair({ use: 'foreground', from: '500', fallback: neutral });
    expect(pair.to.family).toBe(neutral.name);
    const base = value.scale[5] as OKLCH;
    const ratios = neutral.scale.map((c) => calculateWCAGContrast(base, c));
    const best = Math.max(...ratios);
    expect(indexOf(pair)).toBe(ratios.indexOf(best));
    expect(pair.standard).toBe(best >= 7 ? 'AAA' : best >= 4.5 ? 'AA' : 'none');
    // Without a fallback the in-family candidate stays.
    expect(sem.pair({ use: 'foreground', from: '500' }).to.family).toBe('blue');
  });

  it('a foreground with an in-family AA pair ignores the fallback', () => {
    const sem = semanticFor(family(blue), { name: 'blue' });
    for (const from of ['50', '950']) {
      const withFallback = sem.pair({ use: 'foreground', from, fallback: family(gray) });
      expect(withFallback).toEqual(sem.pair({ use: 'foreground', from }));
    }
  });
});

describe('semanticFor -- states walk the AA ladder (#2762)', () => {
  // DEFAULT_COLOR_SEEDS (packages/design-tokens/src/generators/defaults.ts), copied:
  // color-utils does not depend on design-tokens.
  const DEFAULT_SEEDS: Record<string, OKLCH> = {
    zinc: { l: 0.442, c: 0, h: 0, alpha: 1 },
    'silver-true-glacier': { l: 0.55, c: 0.12, h: 180, alpha: 1 },
    'silver-bold-fire-truck': { l: 0.55, c: 0.2, h: 0, alpha: 1 },
    'silver-true-honey': { l: 0.55, c: 0.12, h: 60, alpha: 1 },
    'silver-true-citrine': { l: 0.55, c: 0.12, h: 90, alpha: 1 },
    'silver-true-sky': { l: 0.55, c: 0.12, h: 210, alpha: 1 },
    'silver-true-violet': { l: 0.55, c: 0.12, h: 270, alpha: 1 },
  };
  const OFFSET = { hover: 1, focus: 1, active: 2, border: 2, subtle: 2 } as const;
  const USES = Object.keys(OFFSET) as (keyof typeof OFFSET)[];
  const idx = (p: string) => SCALE_POSITIONS.indexOf(p as (typeof SCALE_POSITIONS)[number]);

  it('states step along the AA ladder and never cross the AAA gap', () => {
    for (const [name, seed] of Object.entries(DEFAULT_SEEDS)) {
      const v = buildColorValue(seed);
      const sem = semanticFor(v, { name });
      const bestPartner = (i: number) =>
        Math.max(
          ...v.scale.map((c, j) => (i === j ? 0 : calculateWCAGContrast(v.scale[i] as OKLCH, c))),
        );
      for (const [i, from] of SCALE_POSITIONS.entries()) {
        for (const dark of [false, true]) {
          for (const use of USES) {
            const to = idx(sem.pair({ use, from, dark }).to.position);
            const label = `${name} ${from} ${use} dark=${dark}`;
            expect(Math.abs(to - i), label).toBeLessThanOrEqual(OFFSET[use] + 1);
            expect(bestPartner(to), label).toBeGreaterThanOrEqual(4.5);
          }
          const disabled = sem.pair({ use: 'disabled', from, dark }).to.position;
          expect(disabled, `${name} ${from} disabled dark=${dark}`).toBe('500');
          expect(bestPartner(idx(disabled))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('throws naming wcagAA.normal when the AA ladder is empty and no stateReferences exist', () => {
    const value = family(blue);
    if (!value.accessibility) throw new Error('blue has no accessibility metadata');
    const empty: ColorValue = {
      ...value,
      accessibility: { ...value.accessibility, wcagAA: { normal: [], large: [] } },
    };
    const sem = semanticFor(empty, { name: 'blue' });
    expect(() => sem.pair({ use: 'hover', from: '500' })).toThrow(SemanticSelectionError);
    expect(() => sem.pair({ use: 'hover', from: '500' })).toThrow(/wcagAA\.normal ladder/);
  });
});
