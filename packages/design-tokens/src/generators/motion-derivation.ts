/**
 * Motion derivation: duration and curve are COMPUTED, not authored.
 *
 * The model, established by the #1975 spike:
 *
 *   band     = f(travel, category)   perception -- how far it moves, and whether
 *                                    it is arriving or leaving
 *   position = g(intent)             character  -- where inside that band it sits
 *   curve    = h(category, intent)   character
 *
 * The six duration tiers are NOT a ratio progression and are not retuned here.
 * They are perceptual facts (`defaults.ts`: "the window is a fact about
 * perception rather than a step on a curve"), so they act as OUTPUT BANDS. What
 * this module removes is authors CHOOSING one.
 *
 * WHY TRAVEL IS ORDINAL RATHER THAN METRIC. The output is discrete -- six bands,
 * selected by a step function. Travel therefore needs exactly enough resolution
 * to pick among them, and a millimetre-or-spacing-step metric would be false
 * precision fitted to an answer we already have. The research corpus names this
 * trap directly ("fit is not derivation"), so the scale stops at the resolution
 * the decision actually consumes.
 */

import type { DurationDef } from './defaults.js';

/**
 * How far the animated thing moves. Ordinal, ordered, and read off the
 * `sizeReasoning` prose each mapping already carried:
 *
 *   none    "Colour only, no movement"                    (hover)
 *   short   "small and travels a short distance"          (dropdown)
 *   medium  "larger and travels farther than a dropdown"  (modal)
 *   large   "a large spatial movement"                    (sheet, page)
 */
export type MotionTravel = 'none' | 'short' | 'medium' | 'large';

/**
 * The five intents. `efficient` is the neutral baseline and owns no signature --
 * that is what qualifies it as the default rather than a gap in the data.
 */
export type MotionIntent = 'efficient' | 'elegant' | 'friendly' | 'technical' | 'editorial';

/** Ordered so "one band shorter" is an index step rather than a lookup table. */
export const BAND_ORDER = ['instant', 'micro', 'fast', 'moderate', 'normal', 'slow'] as const;
export type MotionBand = (typeof BAND_ORDER)[number];

/**
 * Travel selects the band for anything that moves through space.
 *
 * Reproduces the shipped enter tiers exactly: dropdown (short) -> moderate,
 * modal (medium) -> normal. `large` maps to `slow`, whose own definition names
 * sheets in its contexts -- see LARGE_TRAVEL_DISAGREEMENT below, because the
 * shipped value for sheet and page is `normal`, not `slow`.
 */
const TRAVEL_BAND: Record<MotionTravel, MotionBand> = {
  none: 'fast',
  short: 'moderate',
  medium: 'normal',
  large: 'slow',
};

/**
 * `sheet-in` and `page` declare "large spatial movement" and the `slow` tier
 * lists `sheets` and `page-transitions` in its own contexts -- yet both ship at
 * `normal`. That is a deliberate human call (`b864de01`), not drift.
 *
 * The derivation therefore does NOT silently overwrite it. Naming the exception
 * here keeps it a visible, arguable decision instead of a number nobody can
 * trace, which is the whole point of deriving rather than typing.
 */
export const LARGE_TRAVEL_DISAGREEMENT = {
  derived: 'slow' as MotionBand,
  shipped: 'normal' as MotionBand,
  reason:
    'b864de01 places the sheet pair at normal deliberately -- the one pair without a shortened exit. Unresolved: either the model needs a term that justifies normal, or these move to slow.',
};

/** Honour the shipped call while the disagreement stands. */
function applyLargeTravelException(band: MotionBand, travel: MotionTravel): MotionBand {
  return travel === 'large' ? LARGE_TRAVEL_DISAGREEMENT.shipped : band;
}

/**
 * Exit is one band shorter than its enter -- greet warmly, leave quietly.
 *
 * Holds for three of the four shipped pairs (dropdown moderate->fast, modal
 * normal->moderate, expand normal->moderate). The sheet pair is the documented
 * exception and is handled by the large-travel rule above, which lands both
 * halves on `normal`.
 */
function shortenForExit(band: MotionBand): MotionBand {
  const i = BAND_ORDER.indexOf(band);
  return BAND_ORDER[Math.max(0, i - 1)] as MotionBand;
}

/**
 * Where inside its band an intent sits, as a 0..1 position.
 *
 * Only two intents have measured data. `efficient` sits at the LOW end of every
 * band -- that is what ships today and what `motion-duration-ranges.test.ts`
 * documents ("efficient runs fast, so its pick is the LOW end of each range").
 * `elegant` is the measured peak for motion-duration in the 30-site study.
 *
 * The remaining three are NOT yet researched. They inherit the neutral position
 * rather than receiving an invented one -- a guessed number here would be
 * indistinguishable from data at the call site, which is exactly how the last
 * hand-typed table came to look derived.
 */
const INTENT_POSITION: Record<MotionIntent, number> = {
  efficient: 0,
  elegant: 1,
  friendly: 0,
  technical: 0,
  editorial: 0,
};

/** Intents whose position is measured rather than inherited from neutral. */
export const RESEARCHED_INTENTS: ReadonlySet<MotionIntent> = new Set(['efficient', 'elegant']);

/**
 * Duration in ms: the band supplies the window, the intent picks a point in it.
 *
 * The band is the clamp. An intent can push `moderate` from 200 to 300 but never
 * to 400, because 400 is no longer the communicative window. Perception bounds
 * character, which is why the tiers are ranges rather than constants and why no
 * separate clamping step is needed.
 */
/**
 * Bands whose default is a PERCEPTUAL LANDMARK rather than a position.
 *
 * `micro` ships 100ms inside a [50,120] band because 100ms is the Nielsen
 * instantaneous threshold; `fast` ships 150ms inside [120,200] to match a cursor
 * already on target. Neither is "the low end of its range" -- they are fixed
 * points that happen to lie in one, so intent has nothing to position.
 *
 * Applying the interpolation here would move `micro` from 100ms to 50ms and
 * `fast` from 150ms to 120ms, silently changing every focus ring, press and
 * hover in the system. These bands take their default verbatim.
 */
const LANDMARK_BANDS: ReadonlySet<MotionBand> = new Set(['instant', 'micro', 'fast']);

export function deriveDuration(
  band: MotionBand,
  intent: MotionIntent,
  durationDefs: Record<string, DurationDef>,
): number {
  const def = durationDefs[band];
  if (def === undefined) {
    throw new Error(
      `motion derivation: unknown band "${band}". Known bands: ${BAND_ORDER.join(', ')}.`,
    );
  }
  if (LANDMARK_BANDS.has(band)) return def.default;

  const [min, max] = def.range;
  const position = INTENT_POSITION[intent];
  return Math.round(min + (max - min) * position);
}

/**
 * Which band a mapping lands in.
 *
 * `interaction` tokens are handed their band directly: hover, focus, press and
 * toggle do not move through space, so travel cannot select for them. Their
 * bands separate by FEEDBACK KIND instead -- focus and press sit at `micro`
 * (acknowledging that input landed) while hover sits at `fast` (matching a
 * cursor already on target). Forcing a spatial rule onto them would be fitting.
 */
export function deriveBand(
  category: 'interaction' | 'enter' | 'exit',
  travel: MotionTravel,
  declaredBand: MotionBand | undefined,
): MotionBand {
  if (category === 'interaction') {
    if (declaredBand === undefined) {
      throw new Error(
        'motion derivation: an interaction mapping must declare its band -- it has no travel to derive from.',
      );
    }
    return declaredBand;
  }

  const base = applyLargeTravelException(TRAVEL_BAND[travel], travel);

  // Large travel is "the one pair without a shortened exit" (b864de01): a tracked
  // spatial surface moves in and out at one pace, because the user is following
  // it both ways. So the exit rule does not apply -- and that is a second,
  // independent reason the sheet pair sits where it does, distinct from the band
  // disagreement above.
  if (category === 'exit' && travel !== 'large') return shortenForExit(base);
  return base;
}

/**
 * Curve by category, per intent.
 *
 * `exit` is perfectly regular in the shipped set -- all four exits use the exit
 * curve. `enter` is regular except the two large-travel cases, which use a
 * smooth spring because the user must track the surface into place; that is a
 * travel-driven refinement, not an exception.
 *
 * Only `efficient` has a locked curve vocabulary. Other intents fall back to it
 * for the same reason their position does: an invented curve would read as
 * researched.
 */
export function deriveCurve(
  category: 'interaction' | 'enter' | 'exit',
  travel: MotionTravel,
  _intent: MotionIntent,
  declaredCurve: string | undefined,
): string {
  if (category === 'exit') return 'exit';
  if (category === 'enter') return travel === 'large' ? 'spring-smooth' : 'enter';
  // interaction: feedback character is per-token, not per-category.
  return declaredCurve ?? 'standard';
}
