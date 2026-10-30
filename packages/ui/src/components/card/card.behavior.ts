/**
 * @lib contract
 */
import type { BehaviorSpec } from '../../lib/contract';

/**
 * Card: a content surface. The composition archetype -- a static score with
 * NO state, NO actions, NO keymap, NO effects, and (like Container) an
 * EMPTY, structural aria projection. A `div`/`section`/`article`/`aside`
 * carries its own native semantics, so the score projects nothing; the
 * surface is pure decoration (an elevated, bordered, rounded panel) plus an
 * optional `fill`: one `bg-fill-*` token that replaces the base surface.
 *
 * Because the projection is empty and there is nothing to react to, Card
 * needs NO client at all: there is no `bindCard`, the React controller uses
 * no `useBehavior`/`useMemory`, the Astro performance ships no `<script>`,
 * and the Web Component performs no binding. This is the finding the card
 * port exists to record -- a pure static's framework files are the thinnest
 * possible: markup + classes + slots, nothing more. The score is declared
 * only so the conformance harness can assert the one real contract (the
 * `root` part renders and projects no ARIA) identically across React, the
 * Web Component, and Astro.
 *
 * The composition family (CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter, CardAction) carries no behaviour of its own --
 * those are plain framework wrappers over literal class strings, composed by
 * the consumer inside a Card. Only `Card` is a declared part, because it is
 * the only node with a contract to project (boundary 5: a binding rendering
 * an undeclared part is structure the score never authorized).
 */

export type CardElement = 'div' | 'article' | 'section' | 'aside';

export interface CardConfig {
  as?: CardElement | undefined;
  /**
   * Exactly one `bg-fill-*` token (FR-RAF-FILL-003). It replaces the card's
   * base surface; any other value is dropped with a warning and the base
   * surface stays.
   */
  fill?: string | undefined;
  /** A surface name; its `bg-surface-*` class replaces the base surface. */
  surface?: string | undefined;
}

export type CardState = Record<never, never>;
export type CardActions = Record<never, never>;
export type CardPart = 'root';

export const card: BehaviorSpec<CardConfig, CardState, CardActions, CardPart> = {
  name: 'card',
  parts: { root: {} },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // The surface is native to the element the config chooses; the score
  // projects nothing and the harness asserts the empty contract across
  // every framework.
  aria: () => ({ root: {} }),
  keymap: () => null,
};
