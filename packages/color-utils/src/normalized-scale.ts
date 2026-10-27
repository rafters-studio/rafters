/**
 * Normalized scale builder.
 *
 * A second way to build a colour family, beside buildColorValue: step
 * lightness from a measured ladder bent through the source, step chroma at
 * the source's own share of what sRGB holds, and step hue drifting toward
 * both ends the way hand-tuned systems drift it. The constants are in normalized-scale-constants.ts.
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { assembleColorValue } from './builder.js';
import { findMaxChroma, isInSRGBGamut, storedTier } from './gamut.js';
import { normalizeHue } from './internal/math.js';
import { CHROMA_SHARE, HUE_DRIFT_BANDS, LIGHTNESS_LADDERS } from './normalized-scale-constants.js';
import { SCALE_POSITIONS } from './scale-positions.js';

/** An option createNormalizedScale cannot build from. */
export class NormalizedScaleError extends Error {
  constructor(
    public readonly option: 'lightness' | 'chroma' | 'hue',
    message: string,
  ) {
    super(`createNormalizedScale: ${option} ${message}`);
    this.name = 'NormalizedScaleError';
  }
}

const STEP_COUNT = SCALE_POSITIONS.length;
const BAND_WIDTH = 30;

function checkLength(option: 'lightness' | 'chroma' | 'hue', values: readonly number[]): void {
  if (values.length !== STEP_COUNT) {
    throw new NormalizedScaleError(option, `must have ${STEP_COUNT} entries, got ${values.length}`);
  }
}

function resolveLadder(lightness: number[] | 'deep' | 'compact'): readonly number[] {
  if (typeof lightness === 'string') return LIGHTNESS_LADDERS[lightness];
  checkLength('lightness', lightness);
  for (let i = 1; i < lightness.length; i++) {
    const prev = lightness[i - 1];
    const cur = lightness[i];
    if (prev === undefined || cur === undefined || cur >= prev) {
      throw new NormalizedScaleError('lightness', 'must be strictly decreasing');
    }
  }
  return lightness;
}

function resolveShare(chroma: number[] | 'gamut' | 'measured'): readonly number[] {
  if (typeof chroma === 'string') return CHROMA_SHARE[chroma];
  checkLength('chroma', chroma);
  return chroma;
}

const DRIFT_BY_BAND: Readonly<Record<number, readonly number[]>> = HUE_DRIFT_BANDS;

function bandDrift(band: number): readonly number[] {
  return DRIFT_BY_BAND[normalizeHue(band)] ?? HUE_DRIFT_BANDS[0];
}

/** The measured drift for a hue, interpolated between the two nearest bands. */
function measuredDrift(hue: number): number[] {
  const h = normalizeHue(hue);
  const lower = Math.floor(h / BAND_WIDTH) * BAND_WIDTH;
  const t = (h - lower) / BAND_WIDTH;
  const lo = bandDrift(lower);
  const hi = bandDrift(lower + BAND_WIDTH);
  return lo.map((d, i) => d * (1 - t) + (hi[i] ?? d) * t);
}

function resolveDrift(hue: number[] | 'measured' | 'none', sourceHue: number): readonly number[] {
  if (hue === 'none') return Array.from({ length: STEP_COUNT }, () => 0);
  if (hue === 'measured') return measuredDrift(sourceHue);
  checkLength('hue', hue);
  return hue;
}

/** The step whose ladder lightness is nearest the source's own. */
function nearestStep(ladder: readonly number[], l: number): number {
  let best = 0;
  for (let i = 1; i < ladder.length; i++) {
    const cur = ladder[i];
    const bestL = ladder[best];
    if (cur !== undefined && bestL !== undefined && Math.abs(cur - l) < Math.abs(bestL - l)) {
      best = i;
    }
  }
  return best;
}

/**
 * Step lightness: the ladder bent toward the pin. Steps lighter than the
 * anchor are re-spaced between the ladder's top and the pin, steps darker
 * between the pin and the ladder's bottom, so the run has no gap.
 */
function bendLadder(ladder: readonly number[], anchor: number, pin: number): number[] {
  const top = ladder[0] ?? pin;
  const bottom = ladder[ladder.length - 1] ?? pin;
  const at = ladder[anchor] ?? pin;
  return ladder.map((lad, k) => {
    if (k === anchor) return pin;
    if (k < anchor) return top + ((pin - top) * (lad - top)) / (at - top);
    return pin + ((bottom - pin) * (lad - at)) / (bottom - at);
  });
}

/** Chroma floored to the stored precision, so a step at the sRGB edge stays inside. */
function floorChroma(c: number): number {
  return Math.floor(c * 1000) / 1000;
}

/**
 * Chroma reduction into sRGB: a step outside keeps its lightness and hue
 * exactly and takes the sRGB chroma maximum there.
 */
function reduceIntoSRGB(step: OKLCH): OKLCH {
  if (isInSRGBGamut(step)) return step;
  return { ...step, c: floorChroma(findMaxChroma(step.l, step.h, 'srgb')) };
}

/** Lightness at which every hue has room, for the source's chroma share. */
const SHARE_REFERENCE_L = 0.6;

/**
 * Build a ColorValue on a normalized 11-step scale.
 *
 * The source is the pin, exactly as typed, at the step whose ladder lightness
 * is nearest its own (the anchor). The other steps take the ladder bent
 * toward the pin, the source's share of the sRGB chroma maximum (at L 0.6)
 * times the chroma curve times the maximum at the step, and the source hue
 * plus the drift relative to the anchor. A step outside sRGB, the anchor
 * included, loses chroma only. Harmonies, accessibility, analysis and naming
 * are buildColorValue's.
 *
 * @throws NormalizedScaleError when an array option does not have 11 entries,
 *   or a lightness array is not strictly decreasing.
 */
export function createNormalizedScale(
  source: OKLCH,
  options: {
    lightness?: number[] | 'deep' | 'compact';
    chroma?: number[] | 'gamut' | 'measured';
    hue?: number[] | 'measured' | 'none';
  } = {},
): ColorValue {
  const lightness = options.lightness ?? 'deep';
  const ladder = resolveLadder(lightness);
  const curve = resolveShare(options.chroma ?? 'measured');
  const drift = resolveDrift(options.hue ?? 'measured', source.h);

  const anchor = nearestStep(ladder, source.l);
  const anchorDrift = drift[anchor] ?? 0;
  const stepL = bendLadder(ladder, anchor, source.l);
  const referenceMax = findMaxChroma(SHARE_REFERENCE_L, source.h, 'srgb');
  const seedShare = referenceMax > 0 ? Math.min(1, source.c / referenceMax) : 0;

  const scale = stepL.map((rawL, i): OKLCH => {
    if (i === anchor) return reduceIntoSRGB({ ...source });
    const l = Math.round(rawL * 1000) / 1000;
    const h = Math.round(normalizeHue(source.h + (drift[i] ?? 0) - anchorDrift));
    const c = floorChroma(seedShare * (curve[i] ?? 0) * findMaxChroma(l, h, 'srgb'));
    return reduceIntoSRGB({ l, c, h, alpha: source.alpha ?? 1 });
  });
  const gamut = scale.map(storedTier);

  const landed = scale[anchor] ?? source;
  const seedAdjusted: ColorValue['seedAdjusted'] =
    landed.c !== source.c ? { from: { ...source }, to: { ...landed }, reason: 'gamut' } : undefined;

  return {
    ...assembleColorValue(source, { scale, gamut, seedAdjusted, reference: landed }, {}),
    scaleStyle: typeof lightness === 'string' ? lightness : 'custom',
    anchor: SCALE_POSITIONS[anchor],
  };
}
