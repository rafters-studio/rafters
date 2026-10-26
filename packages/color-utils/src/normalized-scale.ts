/**
 * Normalized scale builder.
 *
 * A second way to build a colour family, beside buildColorValue: step
 * lightness from a measured ladder, step chroma as a share of what sRGB holds
 * at that step, and step hue drifting toward both ends the way hand-tuned
 * systems drift it. The constants are in normalized-scale-constants.ts.
 */

import type { ColorValue, OKLCH } from '@rafters/shared';
import { assembleColorValue } from './builder.js';
import { ceilingForSeed, findMaxChroma, mapScaleToGamut, storedTier } from './gamut.js';
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
 * Build a ColorValue on a normalized 11-step scale.
 *
 * The source sits, exactly as typed, at the step whose ladder lightness is
 * nearest its own (the anchor). Every other step takes the ladder lightness,
 * the chroma share of the sRGB maximum at its lightness and hue, and the
 * source hue plus the drift relative to the anchor. Every step is then mapped
 * into the family's gamut ceiling, as buildColorValue does. Harmonies,
 * accessibility, analysis and naming are buildColorValue's.
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
  const share = resolveShare(options.chroma ?? 'measured');
  const drift = resolveDrift(options.hue ?? 'measured', source.h);

  const anchor = nearestStep(ladder, source.l);
  const anchorDrift = drift[anchor] ?? 0;

  const raw = ladder.map((l, i): OKLCH => {
    if (i === anchor) return { ...source };
    const h = Math.round(normalizeHue(source.h + (drift[i] ?? 0) - anchorDrift));
    // Floored to the stored precision, so a full share stays inside sRGB.
    const c = Math.floor((share[i] ?? 0) * findMaxChroma(l, h, 'srgb') * 1000) / 1000;
    return { l, c, h, alpha: source.alpha ?? 1 };
  });

  const scale = mapScaleToGamut(raw, ceilingForSeed(source));
  const gamut = scale.map(storedTier);

  const landed = scale[anchor] ?? source;
  const seedAdjusted: ColorValue['seedAdjusted'] =
    landed.l !== source.l || landed.c !== source.c || landed.h !== source.h
      ? { from: { ...source }, to: { ...landed }, reason: 'gamut' }
      : undefined;

  return {
    ...assembleColorValue(source, { scale, gamut, seedAdjusted, reference: landed }, {}),
    scaleStyle: typeof lightness === 'string' ? lightness : 'custom',
    anchor: SCALE_POSITIONS[anchor],
  };
}
