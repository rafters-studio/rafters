/**
 * Semantic selection — purpose-driven pair finding over a ColorValue (#1636).
 *
 * One closure captures a family's scale + accessibility data; purpose
 * functions parameterize the same walk: pick a position for a use, return
 * the pair with its provenance visible.
 *
 * Contract (Sean, 2026-06-09):
 * - Family-agnostic: these functions search whatever ColorValue they are
 *   handed. The caller chooses which family serves the purpose. No special
 *   neutral handling.
 * - Pairs are found in LIGHT mode, then inverted AS A UNIT for dark mode —
 *   the relationship survives instead of each leg re-deriving independently.
 * - When an inverted pair fails contrast: nudge to the nearest passing pair.
 *   Nudging corrects validity; designer override corrects taste.
 * - Every result reports `tier` so degradation is visible downstream.
 *
 * Foreground and state selection are behavior-identical to the design-tokens
 * contrast/state plugins (the parity baseline). The dark inversion replaces
 * findDarkCounterpartIndex's max-distance walk — the #1635 fix.
 */

import type {
  ColorValue,
  OKLCH,
  SemanticColorSuggestions,
  SemanticStatusRole,
} from '@rafters/shared';
import { calculateWCAGContrast } from './accessibility.js';
import { roundOKLCH } from './conversion.js';
import { clampColor } from './gamut.js';
import { clamp01, normalizeHue } from './internal/math.js';
import { POSITION_TO_INDEX, SCALE_POSITIONS } from './scale-positions.js';

export type StateUse = 'hover' | 'active' | 'focus' | 'disabled' | 'border' | 'ring' | 'subtle';
export type PairUse = 'foreground' | StateUse;

/** Which strategy produced the pair. Ordered roughly best -> worst. */
export type PairTier = 'reference' | 'pair-exact' | 'pair-nearest' | 'ladder' | 'inversion';

export type PairStandard = 'AAA' | 'AA' | 'none';

export interface PairLeg {
  family: string;
  position: string;
}

export interface Pair {
  from: PairLeg;
  to: PairLeg;
  standard: PairStandard;
  tier: PairTier;
}

export interface PairRequest {
  use: PairUse;
  from: string;
  level?: 'AA' | 'AAA';
  dark?: boolean;
  /** ring only: the colour the ring sits on (the mode's background). */
  surface?: OKLCH;
  /** foreground only: the family to fall back to when no in-family pair meets AA (the neutral family). */
  fallback?: ColorValue;
}

export interface SemanticContext {
  pair(request: PairRequest): Pair;
  states(from: string, dark?: boolean): Record<StateUse, Pair>;
  invert(pair: Pair): Pair;
}

export class SemanticSelectionError extends Error {
  constructor(
    public readonly familyName: string,
    message: string,
  ) {
    super(`semantic selection: family "${familyName}" ${message}`);
    this.name = 'SemanticSelectionError';
  }
}

export const STATE_USES: readonly StateUse[] = [
  'hover',
  'active',
  'focus',
  'disabled',
  'border',
  'ring',
  'subtle',
];

/**
 * Rank step per state on the AA ladder (steps with an in-family partner of at least 4.5:1). sign: 1 for light (darker), -1 for dark (lighter).
 * Without a surface a ring copies its base; with one, statePair searches the
 * whole family instead (see ringOnSurface).
 */
const STATE_RANK_STEP: Record<
  StateUse,
  (rank: number, ladder: readonly number[], sign: number) => number
> = {
  hover: (rank, _l, s) => rank + s,
  active: (rank, _l, s) => rank + 2 * s,
  focus: (rank, _l, s) => rank + s,
  disabled: (_rank, ladder) => closestRankTo(ladder, 5),
  border: (rank, _l, s) => rank + 2 * s,
  ring: (rank) => rank,
  subtle: (rank, _l, s) => rank - 2 * s,
};

/**
 * States whose target is reflected back into the ladder when it would leave
 * it: the step goes the same distance the other way, so a base at an end of
 * the ladder never collapses onto itself. disabled and ring never step off.
 */
const REFLECTED_STATES: ReadonlySet<StateUse> = new Set([
  'hover',
  'active',
  'focus',
  'border',
  'subtle',
]);

/** The minimum contrast a focus indicator needs against its surface (WCAG 2.2). */
const RING_MIN_CONTRAST = 3;

/**
 * Bring a target rank inside a ladder of `length` rungs: reflect it about the
 * base rank (when the state reflects), then clamp what is still outside.
 */
function rankInLadder(use: StateUse, baseRank: number, target: number, length: number): number {
  const last = length - 1;
  const inside = (rank: number): boolean => rank >= 0 && rank <= last;
  const reflected =
    !inside(target) && REFLECTED_STATES.has(use) ? baseRank - (target - baseRank) : target;
  return Math.max(0, Math.min(last, reflected));
}

/** Escape hatches the generators may precompute onto a family. */
type FamilyWithReferences = ColorValue & {
  foregroundReferences?: { auto?: { family: string; position: string } };
  stateReferences?: Partial<Record<StateUse, { family: string; position: string }>>;
};

type PairMatrix = readonly (readonly number[])[];

const STANDARD_RANK: Record<PairStandard, number> = { none: 0, AA: 1, AAA: 2 };

/** The highest WCAG standard (normal text) a contrast ratio meets. */
function standardFor(ratio: number): PairStandard {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'none';
}

/** The highest WCAG standard (normal text) two colours meet, measured. */
function standardOf(a: OKLCH, b: OKLCH): PairStandard {
  return standardFor(calculateWCAGContrast(a, b));
}

function partnerForBase(pairs: PairMatrix | undefined, base: number): number | undefined {
  if (!pairs) return undefined;
  for (const [p1, p2] of pairs) {
    if (p1 === base) return p2;
    if (p2 === base) return p1;
  }
  return undefined;
}

function nearestPartner(pairs: PairMatrix | undefined, base: number): number | undefined {
  if (!pairs || pairs.length === 0) return undefined;
  const anchors = new Set<number>();
  for (const pair of pairs) {
    for (const position of pair) anchors.add(position);
  }
  let nearest = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    const distance = Math.abs(anchor - base);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = anchor;
    }
  }
  return nearest === -1 ? undefined : partnerForBase(pairs, nearest);
}

function collectLadder(pairs: PairMatrix): number[] {
  const positions = new Set<number>();
  for (const pair of pairs) {
    for (const position of pair) positions.add(position);
  }
  return Array.from(positions).sort((a, b) => a - b);
}

function closestRankTo(ladder: readonly number[], target: number): number {
  let bestRank = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let rank = 0; rank < ladder.length; rank++) {
    const position = ladder[rank];
    if (position === undefined) continue;
    const distance = Math.abs(position - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestRank = rank;
    }
  }
  return bestRank;
}

function requirePosition(index: number, familyName: string): string {
  const position = SCALE_POSITIONS[index];
  if (!position) {
    throw new SemanticSelectionError(familyName, `produced invalid scale index ${index}`);
  }
  return position;
}

function requireIndex(position: string, familyName: string): number {
  const index = POSITION_TO_INDEX[position];
  if (index === undefined) {
    throw new SemanticSelectionError(familyName, `has no scale position "${position}"`);
  }
  return index;
}

/**
 * Status-role anchors — the colorWheel formulas, extracted as the single
 * source of truth so the wheel and the suggestions can never drift again.
 * Hue is the recognizable convention; CHROMA derives from the seed so the
 * status colors harmonize with the brand. Lightness is the role's optimum.
 */
const STATUS_ROLE_ANCHORS: Record<
  SemanticStatusRole,
  { hue: number; l: number; cCap: number; cScale: number; band: readonly [number, number] }
> = {
  // band is the recognizability range a variant may never leave;
  // [min > max] means the band wraps through 0 (destructive: 330..360..30).
  destructive: { hue: 25, l: 0.55, cCap: 0.2, cScale: 1.0, band: [330, 30] },
  success: { hue: 145, l: 0.55, cCap: 0.18, cScale: 0.9, band: [120, 160] },
  warning: { hue: 85, l: 0.75, cCap: 0.18, cScale: 0.9, band: [60, 110] },
  info: { hue: 230, l: 0.58, cCap: 0.15, cScale: 0.85, band: [200, 250] },
};

/**
 * The colorWheel status color for a role, derived from the seed.
 * Pure formula (rounded, NOT gamut-clamped): colorWheel feeds this straight
 * into buildColorValue, which owns its own gamut pipeline.
 */
export function statusAnchor(role: SemanticStatusRole, seed: OKLCH): OKLCH {
  const spec = STATUS_ROLE_ANCHORS[role];
  return roundOKLCH({
    l: spec.l,
    c: Math.min(spec.cCap, seed.c * spec.cScale),
    h: spec.hue,
    alpha: seed.alpha ?? 1,
  });
}

/** Clamp a hue into a band; [min > max] wraps through 0. */
function clampHueToBand(hue: number, band: readonly [number, number]): number {
  const h = normalizeHue(hue);
  const [min, max] = band;
  if (min <= max) return Math.max(min, Math.min(max, h));
  if (h >= min || h <= max) return h; // inside the wrapped band
  // outside: snap to the nearer edge
  const toMin = Math.abs(h - min);
  const toMax = Math.abs(h - max);
  return toMin < toMax ? min : max;
}

/** Variant offsets around an anchor: the anchor itself, then ±10° hue with small lightness shifts. */
const VARIANT_OFFSETS: readonly { dh: number; dl: number }[] = [
  { dh: 0, dl: 0 },
  { dh: 10, dl: 0.05 },
  { dh: -10, dl: -0.05 },
];

/**
 * Seed-derived semantic color suggestions, three variants per status role.
 * Replaces the static-hue template implementation that lived in harmony.ts —
 * hue anchors stay conventional (recognizability, enforced by per-role bands),
 * chroma and the variant spread derive from the seed (Sean, 2026-06-09:
 * suggestions must be based off the color object in question; the colorWheel
 * formulas are canonical). Stored variants are gamut-clamped (the PR #973 bug).
 */
export function generateSemanticColorSuggestions(baseColor: OKLCH): SemanticColorSuggestions {
  const roles = {} as Record<SemanticStatusRole, OKLCH[]>;
  for (const role of Object.keys(STATUS_ROLE_ANCHORS) as SemanticStatusRole[]) {
    const anchor = statusAnchor(role, baseColor);
    const { band } = STATUS_ROLE_ANCHORS[role];
    roles[role] = VARIANT_OFFSETS.map(({ dh, dl }) => {
      const raw = roundOKLCH({
        l: clamp01(anchor.l + dl),
        c: anchor.c,
        h: clampHueToBand(anchor.h + dh, band),
        alpha: anchor.alpha ?? 1,
      });
      return clampColor(raw);
    });
  }
  // 'danger' mirrors 'destructive' while apps/api still asserts the legacy key.
  return { ...roles, danger: roles.destructive };
}

export function semanticFor(family: ColorValue, options?: { name?: string }): SemanticContext {
  const familyName = options?.name ?? family.name;
  const refs = family as FamilyWithReferences;
  const aaaPairs = family.accessibility?.wcagAAA?.normal;
  const aaPairs = family.accessibility?.wcagAA?.normal;

  /** Contrast between two steps of this family, by scale index. */
  function contrastOf(a: number, b: number): number {
    const colorA = family.scale[a];
    const colorB = family.scale[b];
    if (!colorA || !colorB) return 1;
    return calculateWCAGContrast(colorA, colorB);
  }

  /** The colour a leg names, when this context holds that family. */
  function colorOf(leg: PairLeg): OKLCH | undefined {
    if (leg.family !== familyName && leg.family !== family.name) return undefined;
    const index = POSITION_TO_INDEX[leg.position];
    return index === undefined ? undefined : family.scale[index];
  }

  /**
   * The highest standard a pair's own two steps meet, measured on the two
   * colours the legs resolve to. A leg whose colour this context does not
   * hold cannot be measured, so it claims no standard.
   */
  function measuredStandard(fromPosition: string, to: PairLeg): PairStandard {
    const fromColor = colorOf({ family: familyName, position: fromPosition });
    const toColor = colorOf(to);
    if (!fromColor || !toColor) return 'none';
    return standardOf(fromColor, toColor);
  }

  /**
   * The fallback family's step with the highest contrast against this
   * family's step at `base`, labelled by its measured standard.
   */
  function fallbackForeground(from: string, base: number, fallback: ColorValue): Pair {
    const baseColor = family.scale[base];
    let bestIndex = -1;
    let bestRatio = 0;
    for (let index = 0; index < fallback.scale.length; index++) {
      const candidate = fallback.scale[index];
      if (!baseColor || !candidate) continue;
      const ratio = calculateWCAGContrast(baseColor, candidate);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) {
      throw new SemanticSelectionError(
        familyName,
        `has no step at ${from}, or fallback "${fallback.name}" has no steps`,
      );
    }
    return {
      from: { family: familyName, position: from },
      to: { family: fallback.name, position: requirePosition(bestIndex, fallback.name) },
      standard: standardFor(bestRatio),
      tier: 'pair-nearest',
    };
  }

  function foregroundPair(from: string, level: 'AA' | 'AAA', fallback?: ColorValue): Pair {
    const auto = refs.foregroundReferences?.auto;
    if (auto) {
      const to = { family: auto.family, position: auto.position };
      return {
        from: { family: familyName, position: from },
        to,
        standard: measuredStandard(from, to),
        tier: 'reference',
      };
    }
    const base = requireIndex(from, familyName);
    const exactAAA = partnerForBase(aaaPairs, base);
    const aaa = exactAAA ?? nearestPartner(aaaPairs, base);
    const exactAA = partnerForBase(aaPairs, base);
    const aa = exactAA ?? nearestPartner(aaPairs, base);

    // Candidates in the order they are tried: the AAA matrix's partner (when
    // AAA is asked for), then the AA matrix's.
    const candidates: { partner: number; exact: boolean }[] = [];
    if (level === 'AAA' && aaa !== undefined) {
      candidates.push({ partner: aaa, exact: exactAAA !== undefined });
    }
    if (aa !== undefined) candidates.push({ partner: aa, exact: exactAA !== undefined });
    if (candidates.length === 0) {
      throw new SemanticSelectionError(
        familyName,
        `has no WCAG pair partner for position ${from} (accessibility metadata required)`,
      );
    }

    const measured = candidates.map((candidate) => ({
      ...candidate,
      ratio: contrastOf(base, candidate.partner),
    }));
    const targets: readonly PairStandard[] = level === 'AAA' ? ['AAA', 'AA'] : ['AA'];
    const passing = targets
      .map((target) =>
        measured.find((m) => STANDARD_RANK[standardFor(m.ratio)] >= STANDARD_RANK[target]),
      )
      .find((m) => m !== undefined);
    // No in-family pair meets AA: the fallback family (the neutral) serves.
    if (!passing && fallback) return fallbackForeground(from, base, fallback);
    const chosen = passing ?? measured.reduce((best, m) => (m.ratio > best.ratio ? m : best));
    return {
      from: { family: familyName, position: from },
      to: { family: familyName, position: requirePosition(chosen.partner, familyName) },
      standard: standardFor(chosen.ratio),
      tier: chosen.exact ? 'pair-exact' : 'pair-nearest',
    };
  }

  /**
   * A ring that stands out from `surface`: starting at the base and moving
   * away from the surface's lightness, the first step at least 3:1 against
   * the surface; when no step reaches 3:1, the step with the highest contrast.
   */
  function ringOnSurface(from: string, surface: OKLCH): Pair {
    const base = requireIndex(from, familyName);
    const baseColor = family.scale[base];
    if (!baseColor) {
      throw new SemanticSelectionError(familyName, `has no step at ${from}`);
    }
    // Scale index grows darker: a surface lighter than the base sends the
    // search toward darker steps, otherwise toward lighter ones.
    const step = surface.l > baseColor.l ? 1 : -1;
    const ratioAt = (index: number): number => {
      const color = family.scale[index];
      return color ? calculateWCAGContrast(color, surface) : 0;
    };
    let chosen: number | undefined;
    for (let index = base; index >= 0 && index < family.scale.length; index += step) {
      if (ratioAt(index) >= RING_MIN_CONTRAST) {
        chosen = index;
        break;
      }
    }
    if (chosen === undefined) {
      let best = base;
      for (let index = 0; index < family.scale.length; index++) {
        if (ratioAt(index) > ratioAt(best)) best = index;
      }
      chosen = best;
    }
    return {
      from: { family: familyName, position: from },
      to: { family: familyName, position: requirePosition(chosen, familyName) },
      standard: standardFor(contrastOf(base, chosen)),
      tier: 'ladder',
    };
  }

  function statePair(request: PairRequest & { use: StateUse }): Pair {
    const { use, from, dark, surface } = request;
    const precomputed = refs.stateReferences?.[use];
    if (precomputed) {
      const to = { family: precomputed.family, position: String(precomputed.position) };
      return {
        from: { family: familyName, position: from },
        to,
        standard: measuredStandard(from, to),
        tier: 'reference',
      };
    }
    if (use === 'ring' && surface) return ringOnSurface(from, surface);
    if (!aaPairs || aaPairs.length === 0) {
      throw new SemanticSelectionError(
        familyName,
        'has no accessibility.wcagAA.normal ladder (color generator must emit accessibility metadata)',
      );
    }
    const base = requireIndex(from, familyName);
    const ladder = collectLadder(aaPairs);
    const baseRank = closestRankTo(ladder, base);
    const sign = dark ? -1 : 1;
    const targetRank = STATE_RANK_STEP[use](baseRank, ladder, sign);
    const rank = rankInLadder(use, baseRank, targetRank, ladder.length);
    const targetIndex = ladder[rank];
    if (targetIndex === undefined) {
      throw new SemanticSelectionError(familyName, `ladder lookup failed at rank ${rank}`);
    }
    return {
      from: { family: familyName, position: from },
      to: { family: familyName, position: requirePosition(targetIndex, familyName) },
      standard: standardFor(contrastOf(base, targetIndex)),
      tier: 'ladder',
    };
  }

  function invert(pair: Pair): Pair {
    if (pair.to.family !== familyName && pair.tier !== 'reference') {
      throw new SemanticSelectionError(
        familyName,
        `cannot invert a pair whose legs belong to "${pair.from.family}"/"${pair.to.family}"`,
      );
    }
    const fromTarget = 10 - requireIndex(pair.from.position, familyName);
    const toIndex = POSITION_TO_INDEX[pair.to.position];
    const toTarget = toIndex === undefined ? undefined : 10 - toIndex;

    // Nearest passing pair to the inverted targets: AAA matrix first, AA next.
    // Scoring is lexicographic, FROM-leg first: the background leg carries the
    // token's character (the whole point of #1635); the foreground leg is
    // advisory here because the cascade re-derives it as contrast against the
    // dark background. Sum-scoring let a distant fg leg drag the bg to the
    // wrong side of the scale.
    for (const pairs of [aaaPairs, aaPairs]) {
      if (!pairs || pairs.length === 0) continue;
      let best: { from: number; to: number; fromDist: number; toDist: number } | null = null;
      for (const [p1, p2] of pairs) {
        if (p1 === undefined || p2 === undefined) continue;
        for (const [a, b] of [
          [p1, p2],
          [p2, p1],
        ]) {
          const fromDist = Math.abs((a as number) - fromTarget);
          const toDist = toTarget === undefined ? 0 : Math.abs((b as number) - toTarget);
          const better =
            best === null ||
            fromDist < best.fromDist ||
            (fromDist === best.fromDist && toDist < best.toDist) ||
            (fromDist === best.fromDist && toDist === best.toDist && (a as number) < best.from);
          if (better) best = { from: a as number, to: b as number, fromDist, toDist };
        }
      }
      if (best) {
        return {
          from: { family: familyName, position: requirePosition(best.from, familyName) },
          to: { family: familyName, position: requirePosition(best.to, familyName) },
          standard: standardFor(contrastOf(best.from, best.to)),
          tier: best.fromDist === 0 && best.toDist === 0 ? 'pair-exact' : 'pair-nearest',
        };
      }
    }

    // Last resort: pure mathematical inversion, loudly marked.
    const toFallback = toTarget === undefined ? fromTarget : toTarget;
    return {
      from: { family: familyName, position: requirePosition(fromTarget, familyName) },
      to: { family: familyName, position: requirePosition(toFallback, familyName) },
      standard: standardFor(contrastOf(fromTarget, toFallback)),
      tier: 'inversion',
    };
  }

  return {
    pair(request: PairRequest): Pair {
      const level = request.level ?? 'AAA';
      const { use } = request;
      if (use === 'foreground') return foregroundPair(request.from, level, request.fallback);
      return statePair({ ...request, use });
    },
    states(from: string, dark?: boolean): Record<StateUse, Pair> {
      const out = {} as Record<StateUse, Pair>;
      for (const use of STATE_USES) {
        out[use] = statePair({ use, from, ...(dark === undefined ? {} : { dark }) });
      }
      return out;
    },
    invert,
  };
}
