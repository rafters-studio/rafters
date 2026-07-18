import type { BehaviorSpec } from '../../lib/contract';

/**
 * AspectRatio: a ratio-locked box. The static archetype in its purest form --
 * a score with NO state, NO actions, NO keymap, NO effects, and an EMPTY,
 * structural aria projection. The wrapper is a layout utility; the content
 * inside carries its own semantics (an `<img>`, an `<iframe>`, a `<video>`),
 * so the score projects nothing and the harness asserts the empty contract
 * across React, the Web Component, and Astro.
 *
 * Because the projection is empty and there is nothing to react to, AspectRatio
 * needs NO client: there is no `bindAspectRatio`, the React performance uses no
 * `useBehavior`/`useMemory`, the Astro performance ships no `<script>`, and the
 * Web Component performs no binding. The one non-structural datum is `ratio`,
 * and it is CONFIG (the consumer's proportion, immutable from the score's view)
 * painted through the single style channel, never a class -- an arbitrary
 * `aspect-ratio` value cannot be a literal utility class.
 *
 * The one earned semantic worth extracting from the oracle is ratio parsing:
 * the Web Component receives `ratio` as a string attribute ("16/9", "1.778",
 * "1") and must normalise it to a positive number, falling back to 1 for
 * missing, non-numeric, or non-positive input. That parse is pure logic, so it
 * lives here in the score (like `resolveProgress`), shared by every performance.
 */

/** The default proportion when `ratio` is absent, non-numeric, or non-positive. */
export const DEFAULT_RATIO = 1;

export interface AspectRatioConfig {
  /** Width divided by height (e.g. 16 / 9 = 1.778). Defaults to 1 (square). */
  ratio?: number | undefined;
}

export type AspectRatioState = Record<never, never>;
export type AspectRatioActions = Record<never, never>;
export type AspectRatioPart = 'root';

/**
 * Parse a raw ratio input into a positive number.
 *
 * Accepted formats:
 *  - `"16/9"` -> 16 / 9 = 1.7777... (fraction string, split-and-divide)
 *  - `"1.778"` -> 1.778 (decimal string)
 *  - `1` (numeric) -> 1
 *
 * Non-positive or non-numeric values silently fall back to `DEFAULT_RATIO`,
 * matching the React default (`ratio = 1`).
 */
export function parseRatio(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return DEFAULT_RATIO;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? input : DEFAULT_RATIO;
  }
  const trimmed = input.trim();
  if (trimmed === '') return DEFAULT_RATIO;
  if (trimmed.includes('/')) {
    const [rawNum, rawDen] = trimmed.split('/');
    const num = Number(rawNum);
    const den = Number(rawDen);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return DEFAULT_RATIO;
    const quotient = num / den;
    return quotient > 0 ? quotient : DEFAULT_RATIO;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : DEFAULT_RATIO;
}

/** Resolve the effective proportion from config, applying the parse + fallback. */
export function resolveRatio(config: AspectRatioConfig): number {
  return parseRatio(config.ratio);
}

export const aspectRatio: BehaviorSpec<
  AspectRatioConfig,
  AspectRatioState,
  AspectRatioActions,
  AspectRatioPart
> = {
  name: 'aspect-ratio',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // A layout box has no semantics of its own; the slotted content carries them,
  // so the score projects nothing and the harness asserts the empty contract.
  aria: () => ({ root: {} }),
  keymap: () => null,
  effects: () => [],
};
