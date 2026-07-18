import type { BehaviorSpec } from '../../lib/contract';

/**
 * Skeleton: a loading placeholder. The composition archetype -- a static score
 * with NO state, NO actions, NO keymap, NO effects. It occupies layout while
 * content loads (a shimmer that reserves the shape the real content will take),
 * and it is purely decorative: it conveys no information a screen reader should
 * read, so it is hidden from the accessibility tree.
 *
 * Unlike Container, Card, and ScrollArea -- whose aria projections are EMPTY
 * because the semantic element they choose carries the contract -- Skeleton has
 * no element that says "decorative". A bare `div` is exposed to assistive tech
 * by default, so the one real contract Skeleton carries is a CONSTANT
 * `aria-hidden="true"` on its root. That lives in the score, not in the markup,
 * so the conformance harness enforces it identically across React, the Web
 * Component, and Astro. The oracle (`src/old/ui/skeleton.*`) set `aria-hidden`
 * on the Web Component only and left React/Astro exposed -- exactly the drift
 * the behavior layer exists to kill; the score closes it.
 *
 * The projection is CONSTANT, so there is still nothing to react to and no
 * client at all: there is no `bindSkeleton`, the React performance uses no
 * `useBehavior`/`useMemory`, the Astro performance ships no `<script>`, and the
 * Web Component performs no binding. A static's framework files are the thinnest
 * possible: markup + classes, and -- because Skeleton is a decorative LEAF --
 * NO slot and NO children. The score is declared so the harness can assert the
 * one real contract (the `root` renders and projects `aria-hidden="true"`)
 * across every framework.
 *
 * Motion intent is a feedback-loop shimmer (`animate-pulse`); duration and
 * easing come from tokens, and the pulse opts out under `prefers-reduced-motion`
 * via `motion-reduce:animate-none`.
 */

export type SkeletonConfig = Record<never, never>;
export type SkeletonState = Record<never, never>;
export type SkeletonActions = Record<never, never>;
export type SkeletonPart = 'root';

export const skeleton: BehaviorSpec<SkeletonConfig, SkeletonState, SkeletonActions, SkeletonPart> =
  {
    name: 'skeleton',
    parts: { root: {} },
    initialState: () => ({}),
    actions: {},
    canDispatch: () => true,
    // Skeleton is decorative: it has no semantic element to hide it, so the score
    // projects a CONSTANT aria-hidden and the harness asserts it across every
    // framework. This is the one static whose projection is non-empty.
    aria: () => ({ root: { 'aria-hidden': 'true' } }),
    keymap: () => null,
    effects: () => [],
  };
